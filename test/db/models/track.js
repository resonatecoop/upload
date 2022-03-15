const test = require('tape')
const path = require('path')
const sequelize = require('sequelize')
const { Op } = require('sequelize')
const decodeUriComponent = require('decode-uri-component')

require('dotenv-safe').config({ path: path.join(__dirname, '../../../.env.test') })

const { Track } = require('../../../lib/db/models')

/**
 * Testing cleanup
 */

test('should get some tracks', async t => {
  t.plan(1)

  try {
    const { rows: result } = await Track.findAndCountAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('track_cover_art')), 'track_cover_art']
      ],
      where: {
        url: {
          [Op.ne]: sequelize.col('track_cover_art')
        }
      },
      limit: 100
    })

    const data = result.map((track) => {
      const cover = track.get('track_cover_art')
      return {
        cover_art: decodeUriComponent(cover).replace('track/visual/', '').split('.')[0]
      }
    })

    console.log(data)

    t.pass('ok')
  } catch (err) {
    t.end(err)
  }
})
