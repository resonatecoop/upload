import Koa from 'koa'
import Queue from 'bull'
import Roles from 'koa-roles'
import Router from '@koa/router'
import FileType from 'file-type'
import { promises as fs } from 'fs'
import koaBody from 'koa-body'
import path from 'path'
import shasum from 'shasum'
import winston from 'winston'
import bytes from 'bytes'
import dimensions from 'image-size'
import * as mm from 'music-metadata'
import getAudioDuration from '../util/get-audio-duration'

import { Track, File } from '../db/models'

import convertAudioJob from '../jobs/convert-audio'
import sendEmailJob from '../jobs/send-mail'
import optimizeImageJob from '../jobs/convert-image'
import uploadJob from '../jobs/upload-b2'
import cleanupJob from '../jobs/cleanup'
import sharpConfig from '../config/sharp'

import {
  REDIS_CONFIG
} from '../config/redis'

import {
  HIGH_RES_AUDIO_MIME_TYPES,
  SUPPORTED_IMAGE_MIME_TYPES
} from '../config/supported-media-types'

const BASE_DATA_DIR = process.env.BASE_DATA_DIR || '/'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'upload' },
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

const queueOptions = {
  redis: REDIS_CONFIG
}

const audioQueue = new Queue('convert-audio', queueOptions)
const sendEmailQueue = new Queue('send-email', queueOptions)

sendEmailQueue.on('completed', (job, result) => {
  logger.info(`Email sent to ${job.data.message.to}`)
})

audioQueue.on('completed', async (job, result) => {
  try {
    await File.update({
      status: 'ok'
    }, {
      where: {
        id: job.data.filename // uuid
      }
    })
  } catch (err) {
    logger.error(err)
  }
})

const uploadQueue = new Queue('upload', queueOptions)

uploadQueue.on('completed', async (job, result) => {
  const { profile } = job.data

  try {
    sendEmailQueue.add({
      template: 'new-upload',
      message: {
        to: process.env.APP_EMAIL
      },
      locals: {
        name: profile.nickname,
        firstName: profile.first_name
      }
    })
  } catch (err) {
    logger.error(err)
  }
})

const cleanupQueue = new Queue('cleanup', queueOptions)

const imageQueue = new Queue('convert', queueOptions)

imageQueue.on('completed', async (job, result) => {
  try {
    await File.update({
      status: 'ok'
    }, {
      where: {
        id: job.data.filename // uuid
      }
    })
  } catch (err) {
    logger.error(err)
  }
})

sendEmailQueue.process(sendEmailJob)
audioQueue.process(convertAudioJob)
uploadQueue.process(uploadJob)
imageQueue.process(optimizeImageJob)
cleanupQueue.process(cleanupJob)

const user = new Roles()
const router = new Router()
const upload = new Koa()

upload.use(user.middleware())

user.use((ctx, action) => {
  return ctx.profile || action === 'upload'
})

user.use('upload', async (ctx, action) => {
  return ctx.profile.scope.includes('read_write')
})

user.use((ctx, action) => {
  const allowed = ['admin', 'superadmin']

  if (allowed.includes(ctx.profile.role)) {
    return true
  }
})

/*
 * Process a file then queue it for upload
 * @param {object} ctx Koa context
 * @returns {Promise} Promise object containing image
 */
const processFile = ctx => {
  return async file => {
    const { size: fileSize, path: filePath } = file
    const type = await FileType.fromFile(filePath)
    const mime = type !== null ? type.mime : file.type

    const isImage = SUPPORTED_IMAGE_MIME_TYPES
      .includes(mime)

    const isAudio = HIGH_RES_AUDIO_MIME_TYPES
      .includes(mime)

    if (!isImage && !isAudio) {
      ctx.status = 400
      ctx.throw(400, `File type not supported: ${mime}`)
    }

    const buffer = await fs.readFile(file.path)
    const sha1sum = shasum(buffer)

    // create record for original file
    const result = await File.create({
      owner_id: ctx.profile.id,
      filename: file.name, // original file name
      size: fileSize,
      mime,
      hash: sha1sum
    }, { raw: true })

    const { id: filename, filename: originalFilename } = result.dataValues // uuid/v4

    await fs.rename(
      file.path,
      path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`)
    )

    if (process.env.NODE_ENV !== 'development') {
      uploadQueue.add({
        profile: ctx.profile,
        filename,
        filesize: fileSize,
        mime
      })
    }

    const data = Object.assign({}, result.dataValues, {
      filename, // uuid filename
      filename_orig: originalFilename
    })

    if (isAudio) {
      logger.info('Parsing audio metadata')

      const metadata = await mm.parseFile(path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`), {
        duration: true,
        skipCovers: true
      })

      logger.info('Done parsing audio metadata')

      let duration = metadata.format.duration

      if (!duration) {
        // fallback for file with no headers?
        // see: https://github.com/Borewit/music-metadata/issues/543
        // https://github.com/Borewit/music-metadata/pull/584 partially addressed?
        logger.info('Failed to get duration using `music-metadata`. Fallback to `ffmpeg.ffprobe` ...')
        duration = await getAudioDuration(path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`))

        if (!duration) {
          logger.info('Failed to get duration')
        }
      }

      logger.info('Creating new track')

      const track = await Track.create({
        title: metadata.common.title || originalFilename,
        creator_id: ctx.profile.id,
        url: filename,
        artist: metadata.common.artist,
        album: metadata.common.album,
        duration: duration,
        year: metadata.common.year,
        album_artist: metadata.common.albumartist,
        number: metadata.common.track.no,
        createdAt: new Date().getTime() / 1000 | 0
      })

      data.metadata = metadata.common
      data.track = track.get({ plain: true })

      logger.info('Adding audio to queue')

      audioQueue.add({ filename })
    }

    if (isImage) {
      const { config } = ctx.request.body // sharp config key
      const { width, height } = await dimensions(path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`))

      const file = await File.findOne({
        where: {
          id: filename
        }
      })

      const metadata = file.metadata || {}

      file.metadata = Object.assign(metadata, { dimensions: { width, height } })

      await file.save()

      logger.info('Adding image to queue')

      data.image = file.dataValues

      imageQueue.add({ filename, config: sharpConfig[config] })
    }

    return data
  }
}

router.get('/', user.can('upload'), async (ctx, next) => {
  ctx.set('Content-Type', 'text/html')

  ctx.body = `
    <!doctype html>
    <html>
      <body>
        <form action="/api/user/upload" enctype="multipart/form-data" method="post">
        <input type="file" name="uploads" multiple="multiple"><br>
        <button type="submit">Upload</button>
      </body>
    </html>
  `

  await next()
})

router.get('/:id', user.can('upload'), async (ctx, next) => {
  try {
    ctx.body = await File.findOne({ where: { id: ctx.params.id } })
  } catch (err) {
    ctx.throw(ctx.status, err.message)
  }

  await next()
})

router.post('/', user.can('upload'), async (ctx, next) => {
  try {
    const uploads = ctx.request.files.uploads

    ctx.status = 202

    ctx.body = {
      data: Array.isArray(uploads)
        ? await Promise.all(uploads.map(processFile(ctx)))
        : await processFile(ctx)(uploads),
      status: 202
    }
  } catch (err) {
    ctx.throw(ctx.status, err.message)
  }

  await next()
})

upload
  .use(koaBody({
    multipart: true,
    formidable: {
      uploadDir: path.join(BASE_DATA_DIR, '/data/media/incoming/'),
      maxFileSize: bytes('2 GB')
    },
    onError: (err, ctx) => {
      if (/maxFileSize/.test(err.message)) {
        ctx.status = 400
        ctx.throw(400, err.message)
      }
    }
  }))
  .use(router.routes())
  .use(router.allowedMethods({
    throw: true
  }))

export default upload