import Koa from 'koa'
import mount from 'koa-mount'
import request from 'superagent'

/**
 * User routing
 */

import files from './files'
import upload from './upload'

/**
 * Swagger client for user-api
 */
import SwaggerClient from 'swagger-client'

const user = new Koa()

user.use(async (ctx, next) => {
  if (ctx.get('Authorization').startsWith('Bearer ')) {
    // bearer auth
    ctx.accessToken = ctx.get('Authorization').slice(7, ctx.get('Authorization').length).trimLeft()
  } else if (ctx.cookies.get('token')) {
    ctx.accessToken = ctx.cookies.get('token')
  }

  await next()
})

user.use(async (ctx, next) => {
  if (!ctx.accessToken) {
    ctx.status = 401
    ctx.throw(401, 'Missing required access token')
  }

  try {
    let response

    const requestUrl = new URL('/v1/oauth/introspect', process.env.OAUTH_HOST)

    response = await request
      .post(requestUrl.href)
      .auth(process.env.OAUTH_CLIENT, process.env.OAUTH_SECRET)
      .type('form')
      .send({
        token: ctx.accessToken,
        token_type_hint: 'access_token'
      })

    const { user_id: userId, scope } = response.body

    const specUrl = new URL('/user/user.swagger.json', 'https://' + process.env.API_HOST) // user-api swagger docs
    const client = await new SwaggerClient({
      url: specUrl.href,
      authorizations: {
        bearer: 'Bearer ' + ctx.accessToken
      }
    })

    response = await client.apis.Users.ResonateUser_GetUser({
      id: userId
    })

    if (!response) {
      ctx.status = 404
      ctx.throw(ctx.status, 'User data not found')
    }

    const { legacyId, email } = response.body

    const [role] = scope.split(' ').slice(-1) // expect last part of scope to be role

    ctx.profile = {
      scope: scope.split(' '),
      role: role,
      id: legacyId,
      email
    }
  } catch (err) {
    let message = err.message
    if (err.response) {
      // handle token expiration
      ctx.status = 401
      message = err.response.body.error
    }
    ctx.throw(ctx.status, message)
  }

  await next()
})

user.use(mount('/files', files))
user.use(mount('/upload', upload))

export default user
