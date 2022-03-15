import path from 'path'
import winston from 'winston'
import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import { File } from '../db/models'

const BASE_DATA_DIR = process.env.BASE_DATA_DIR || '/'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'convert-audio' },
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.simple()
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    })
  ]
})

const convertAudio = async (job) => {
  const { filename } = job.data

  try {
    await Promise.all([
      new Promise((resolve, reject) => {
        const profiler = logger.startTimer()

        return ffmpeg(path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`))
          .noVideo()
          .outputOptions('-movflags', '+faststart', '-f', 'ipod')
          .audioChannels(2)
          .audioBitrate('96k')
          .audioFrequency(48000)
          .audioCodec('libfdk_aac') // convert using Fraunhofer FDK AAC
          .on('start', () => logger.info('Converting original to m4a'))
          .on('error', err => {
            logger.error(err.message)
            return reject(err)
          })
          .on('end', async () => {
            profiler.done({ message: 'Done converting to m4a' })

            const stat = await fs.stat(path.join(BASE_DATA_DIR, `/data/media/audio/${filename}.m4a`))
            const file = await File.findOne({
              where: {
                id: filename
              }
            })
            const metadata = file.metadata || { variants: [] }
            const variants = metadata.variants || []

            variants.push({
              format: 'm4a',
              size: stat.size,
              name: 'audiofile'
            })

            metadata.variants = variants

            await file.update({
              metadata: Object.assign(metadata, { streamable_file_size: stat.size })
            })

            return resolve()
          })
          .save(path.join(BASE_DATA_DIR, `/data/media/audio/${filename}.m4a`))
      }),
      new Promise((resolve, reject) => {
        const profiler = logger.startTimer()

        return ffmpeg(path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`))
          .noVideo()
          .inputOptions('-t', 45)
          .outputOptions('-movflags', '+faststart', '-f', 'ipod')
          .audioChannels(2)
          .audioBitrate('96k')
          .audioFrequency(48000)
          .audioCodec('libfdk_aac')
          .audioFilters([
            {
              filter: 'afade',
              options: {
                t: 'out',
                st: 43,
                d: 2
              }
            }
          ])
          .on('start', () => logger.info('Trimming track'))
          .on('error', err => {
            logger.error(err.message)
            return reject(err)
          })
          .on('end', async () => {
            profiler.done({ message: 'Done trimming track' })

            const stat = await fs.stat(path.join(BASE_DATA_DIR, `/data/media/audio/trim-${filename}.m4a`))
            const file = await File.findOne({
              where: {
                id: filename
              }
            })
            const metadata = file.metadata || {}
            const variants = metadata.variants || []

            variants.push({
              format: 'm4a',
              size: stat.size,
              name: 'trimmed_audiofile'
            })

            metadata.variants = variants

            await file.update({
              metadata: Object.assign(metadata, { variants })
            })

            return resolve()
          })
          .save(path.join(BASE_DATA_DIR, `/data/media/audio/trim-${filename}.m4a`))
      })
    ])
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(err)
  }
}

export default convertAudio
