import B2 from 'backblaze-b2'
import winston from 'winston'
import { Track, File } from '../db/models'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'remove-file-b2' },
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.simple()
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
})

const B2_BUCKET_ID = process.env.B2_BUCKET_ID
const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY

const removeFileB2 = async (job) => {
  const filename = job.data.filename

  try {
    const b2 = new B2({
      accountId: B2_APPLICATION_KEY_ID,
      applicationKey: B2_APPLICATION_KEY
    })
    await b2.authorize()

    logger.info('Authorized b2')

    const files = await b2.listFileNames({
      bucketId: B2_BUCKET_ID,
      startFileName: filename
    })

    for (const file of files) {
      console.log(file)
    }

    /*
      await b2.deleteFileVersion({
        fileId: 'fileId',
        fileName: filename
      })
    */
    await Track.update({ status: 'deleted' }, {
      where: {
        creator_id: job.data.profile.id
      }
    })

    await File.destroy({
      where: {
        id: job.data.filename,
        owner_id: job.data.profile.id
      }
    })

    return Promise.resolve()
  } catch (err) {
    return Promise.reject(err)
  }
}

export default removeFileB2
