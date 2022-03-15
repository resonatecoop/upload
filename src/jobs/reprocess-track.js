import B2 from 'backblaze-b2'
import winston from 'winston'
import path from 'path'
import { promises as fs } from 'fs'
import FileType from 'file-type'
import shasum from 'shasum'
// import * as mm from 'music-metadata'
import { Track, File } from '../db/models'

const BASE_DATA_DIR = process.env.BASE_DATA_DIR || '/'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'upload' },
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.json()
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    })
  ]
})

const B2_ARCHIVE_BUCKET_ID = process.env.B2_ARCHIVE_BUCKET_ID
const B2_ARCHIVE_APPLICATION_KEY_ID = process.env.B2_ARCHIVE_APPLICATION_KEY_ID
const B2_ARCHIVE_APPLICATION_KEY = process.env.B2_ARCHIVE_APPLICATION_KEY

/**
 * Reprocess an old track from archive
 */

const reprocessTrack = async (job) => {
  logger.info(`Start to reprocess track: ${job.data.filename}`)

  try {
    const b2 = new B2({
      accountId: B2_ARCHIVE_APPLICATION_KEY_ID,
      applicationKey: B2_ARCHIVE_APPLICATION_KEY
    })

    logger.info('Authorizing b2')

    await b2.authorize()

    logger.info('Authorized b2')

    await b2.getDownloadAuthorization({
      bucketId: B2_ARCHIVE_BUCKET_ID,
      fileNamePrefix: '',
      validDurationInSeconds: 604800
    })

    logger.info('File download authorized')

    const res = await b2.downloadFileByName({
      bucketName: 'resonate-tracks',
      fileName: job.data.filename,
      responseType: 'arraybuffer'
    })

    logger.info('File downloaded')

    const filePath = path.join(BASE_DATA_DIR, `/data/media/incoming/${job.data.filename}`)

    await fs.writeFile(filePath, res.data)

    logger.info('Saved file')

    const type = await FileType.fromFile(filePath)

    logger.info('Type', type)

    const sha1sum = shasum(res.data)

    const track = await Track.findOne({
      where: {
        url: job.data.filename
      }
    })

    if (!track) {
      const err = new Error('Track does not exist')
      return Promise.reject(err)
    }

    if (!type) {
      const err = new Error('File type not detected')
      return Promise.reject(err)
    }

    const [file, created] = await File.findOrCreate({
      where: {
        id: job.data.filename,
        owner_id: track.creator_id
      },
      defaults: {
        owner_id: track.creator_id,
        hash: sha1sum,
        size: res.data.byteLength,
        status: 'ok',
        mime: type.mime
      }
    })

    if (!created) {
      if (file.hash !== sha1sum) {
        const err = new Error('Hash mismatch')
        return Promise.reject(err)
      }

      await File.update({
        status: 'ok',
        mime: type.mime
      }, {
        where: {
          owner_id: file.owner_id,
          id: file.id
        }
      })

      logger.info('file updated')
    } else {
      logger.info('file created')
    }

    logger.info('file type', type)

    /*

    const metadata = await mm.parseFile(filePath)

    logger.info('metadata', metadata)

    */

    return Promise.resolve()
  } catch (err) {
    logger.error(err)
    return Promise.reject(err)
  }
}

export default reprocessTrack
