import '@babel/polyfill'

import Koa from 'koa'
import logger from 'koa-logger'
import Redis from 'ioredis'
import compress from 'koa-compress'
import error from 'koa-json-error'
import mount from 'koa-mount'
import ratelimit from 'koa-ratelimit'
import session from 'koa-session'
import KeyGrip from 'keygrip'

/**
 * Koa apps
 */

import user from './user'

const app = new Koa()

app.keys = new KeyGrip([process.env.APP_KEY, process.env.APP_KEY_2], 'sha256')

app
  .use(logger())
  .use(ratelimit({
    db: new Redis({
      port: process.env.REDIS_PORT || 6379,
      host: process.env.REDIS_HOST || '127.0.0.1',
      password: process.env.REDIS_PASSWORD
    }),
    duration: 60000,
    errorMessage: 'Upload api is rate limited',
    id: (ctx) => ctx.ip,
    headers: {
      remaining: 'Rate-Limit-Remaining',
      reset: 'Rate-Limit-Reset',
      total: 'Rate-Limit-Total'
    },
    max: 100,
    disableHeader: false,
    whitelist: (ctx) => {
      // some logic that returns a boolean
    },
    blacklist: (ctx) => {
      // some logic that returns a boolean
    }
  }))
  .use(session(app))
  .use(compress({
    filter: (contentType) => {
      return /text/i.test(contentType)
    },
    threshold: 2048,
    flush: require('zlib').Z_SYNC_FLUSH
  }))
  .use(error(err => {
    return {
      status: err.status,
      message: err.message,
      data: null
    }
  }))

app.use(mount('/user', user))

export default app
