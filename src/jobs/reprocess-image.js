import B2 from 'backblaze-b2'
import winston from 'winston'
import path from 'path'
import { promises as fs } from 'fs'
import FileType from 'file-type'
import shasum from 'shasum'
import { Track, File } from '../db/models'
import dimensions from 'image-size'

const BASE_DATA_DIR = process.env.BASE_DATA_DIR || '/'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'reprocess-image' },
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

const B2_ARCHIVE_BUCKET_ID = process.env.B2_ARTWORK_ARCHIVE_BUCKET_ID
const B2_ARCHIVE_APPLICATION_KEY_ID = process.env.B2_ARTWORK_ARCHIVE_APPLICATION_KEY_ID
const B2_ARCHIVE_APPLICATION_KEY = process.env.B2_ARTWORK_ARCHIVE_APPLICATION_KEY

/**
 * Reprocess an old image from archive (similar to reprocess track job)
 */

const reprocessImage = async (job) => {
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
      bucketName: 'resonate-track-artwork',
      fileName: job.data.filename,
      responseType: 'arraybuffer'
    })

    logger.info('File downloaded')

    const filePath = path.join(BASE_DATA_DIR, `/data/media/incoming/${job.data.filename}`)

    await fs.writeFile(filePath, res.data)

    logger.info('Saved file')

    const type = await FileType.fromFile(filePath)

    if (!type) {
      const err = new Error('File type not detected')
      return Promise.reject(err)
    }

    logger.info('Type', type)

    const sha1sum = shasum(res.data)

    const track = await Track.findOne({
      where: {
        cover_art: job.data.filename
      }
    })

    if (!track) {
      const err = new Error('Track does not exist')
      return Promise.reject(err)
    }

    const { width, height } = await dimensions(path.join(BASE_DATA_DIR, `/data/media/incoming/${job.data.filename}`))

    const [file, created] = await File.findOrCreate({
      where: {
        id: job.data.filename,
        owner_id: track.creator_id
      },
      defaults: {
        owner_id: track.creator_id,
        hash: sha1sum,
        size: res.data.byteLength,
        metadata: { dimensions: { width, height } },
        status: 'ok',
        mime: type.mime
      }
    })

    if (!created) {
      logger.info('file not created')

      if (file.hash !== sha1sum) {
        const err = new Error('File hash mismatch')
        return Promise.reject(err)
        /*
        // this is a different file
        const result = await File.create({
          owner_id: track.creator_id,
          hash: sha1sum,
          size: res.data.byteLength,
          status: 'ok',
          mime: type.mime
        })

        logger.info('created new file record')

        // update track
        track.cover_art = result.id

        // upload again

        await track.save()

        logger.info('updated track cover art id')

        // track updated

        return Promise.resolve(result)
        */
      } else {
        await File.update({
          status: 'ok',
          mime: type.mime
        }, {
          where: {
            owner_id: file.owner_id,
            id: file.id
          }
        })

        const result = await File.findOne({
          where: {
            owner_id: file.owner_id,
            id: file.id
          }
        })

        logger.info('file updated')

        return Promise.resolve(result)
      }
    }

    return Promise.resolve(file)
  } catch (err) {
    logger.error(err.message)
    return Promise.reject(err)
  }
}

export default reprocessImage
