/**
 * Prevent access to non dev env
 */

export const isDev = () => {
  return async (ctx, next) => {
    if (process.env.NODE_ENV !== 'development') {
      ctx.status = 403
      ctx.throw(ctx.status)
    }
    await next()
  }
}

export const isEnv = (allowed = ['development', 'test']) => {
  return async (ctx, next) => {
    if (!allowed.includes(process.env.NODE_ENV)) {
      ctx.status = 403
      ctx.throw(ctx.status)
    }
    await next()
  }
}

export default isDev
