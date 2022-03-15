const test = require('tape')
const Koa = require('koa')
const mount = require('koa-mount')
const supertest = require('supertest')
const destroyable = require('server-destroy')
const error = require('koa-json-error')
const path = require('path')
const winston = require('winston')
const genAudio = require('../../lib/util/gen-silent-audio')
const superagent = require('superagent')
const fs = require('fs').promises

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'test-upload' },
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

require('dotenv-safe').config({ path: path.join(__dirname, '../../.env.test') })

const upload = require('../../lib/user/upload')

const app = new Koa()

app.use(error(err => {
  return {
    status: err.status,
    message: err.message,
    data: null
  }
}))

app.use(async (ctx, next) => {
  try {
    ctx.profile = {
      id: 2124,
      role: 'member'
    }
  } catch (err) {
    ctx.throw(ctx.status, err.message)
  }

  await next()
})
app.use(mount('/upload', upload))

let server
let request

test('start', t => {
  server = app.listen(5557, () => {
    logger.info('test server started')
  })
  destroyable(server)
  request = supertest(server)
  t.end()
})

test('should generate audio files fixtures', async t => {
  t.plan(1)

  // gen fixture (empty audio)
  try {
    const metadata = {
      title: 'Resonate',
      artist: 'Resonate',
      genre: 'Silent',
      albumArtist: 'Resonate',
      album: 'Resonate',
      composer: 'Resonate',
      year: 2020
    }
    await genAudio(path.join(__dirname, './fixtures/Resonate.aiff'), metadata)

    t.pass('ok')
  } catch (err) {
    t.end(err)
  }
})

test('should upload audio file', async t => {
  t.plan(1)

  try {
    await request
      .post('/upload')
      .field('name', 'uploads')
      .attach('uploads', path.join(__dirname, './fixtures/Resonate.aiff'))
      .expect('Content-Type', /json/)
      .expect(202)

    t.pass('ok')
  } catch (err) {
    t.end(err)
  }
})

// TODO test with small image res

test('should upload image file', async t => {
  t.plan(1)

  try {
    const res = await superagent
      .get('https://picsum.photos/seed/picsum/1500/1500')
      .set('Content-Type', 'blob')

    await fs.writeFile(path.join(__dirname, './fixtures/test.jpg'), res.body)

    await request
      .post('/upload')
      .field('name', 'uploads')
      .attach('uploads', path.join(__dirname, './fixtures/test.jpg'))
      .expect('Content-Type', /json/)
      .expect(202)
    t.pass('ok')
  } catch (err) {
    t.end(err)
  }
})

test('should not accept unsupported file', async t => {
  t.plan(2)

  try {
    const response = await request
      .post('/upload')
      .field('name', 'uploads')
      .attach('uploads', path.join(__dirname, './fixtures/logo.svg'))
      .expect('Content-Type', /json/)
      .expect(400)

    const { message } = response.body

    t.equal(message, 'File type not supported: application/xml')

    t.pass('ok')
  } catch (err) {
    t.end(err)
  }
})

test('shutdown', t => {
  server.close()
  t.end()
  process.exit(0)
})
