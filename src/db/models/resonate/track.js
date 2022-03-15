import numbro from 'numbro'
import decodeUriComponent from 'decode-uri-component'
import roundTo from 'round-to'

const statusValues = ['free+paid', 'hidden', 'free', 'paid', 'deleted']

export default (sequelize, DataTypes) => {
  const Track = sequelize.define('Track', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'tid'
    },
    creator_id: {
      type: DataTypes.INTEGER,
      field: 'uid'
    },
    title: {
      type: DataTypes.STRING,
      field: 'track_name',
      get () {
        const title = this.getDataValue('title')
        if (title) return decodeUriComponent(title)
        return title
      }
    },
    artist: {
      type: DataTypes.STRING,
      field: 'track_artist',
      get () {
        const artist = this.getDataValue('artist')
        if (artist) return decodeUriComponent(artist)
        return artist
      }
    },
    album: {
      type: DataTypes.STRING,
      field: 'track_album',
      get () {
        const album = this.getDataValue('album')
        if (album) return decodeUriComponent(album)
        return album
      }
    },
    duration: {
      type: DataTypes.STRING(15),
      field: 'track_duration',
      get () {
        const duration = this.getDataValue('duration')
        return numbro.unformat(duration)
      },
      set (duration) {
        this.setDataValue('duration', numbro(roundTo.down(duration, 2)).format())
      }
    },
    album_artist: {
      type: DataTypes.STRING,
      field: 'track_album_artist',
      get () {
        const albumArtist = this.getDataValue('album_artist')
        if (albumArtist) return decodeUriComponent(albumArtist)
        return albumArtist
      }
    },
    composer: {
      type: DataTypes.STRING,
      field: 'track_composer',
      get () {
        const composer = this.getDataValue('composer')
        if (composer) {
          return decodeUriComponent(composer)
            .split(',')
            .map(item => item.trim())
            .map(tag => decodeUriComponent(tag)
              .split(',')
              .map(tag => tag.trim())
            ).flat(1)
        }
        return composer
      }
    },
    year: {
      type: DataTypes.INTEGER,
      field: 'track_year'
    },
    url: {
      type: DataTypes.UUID,
      field: 'track_url'
    },
    cover_art: {
      type: DataTypes.UUID,
      field: 'track_cover_art',
      get () {
        const value = this.getDataValue('cover_art')
        if (value) {
          return decodeUriComponent(value).replace('track/visual/', '').split('.')[0] // remove old path
        }
        return value
      }
    },
    number: {
      type: DataTypes.INTEGER,
      field: 'track_number'
    },
    status: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 4
      },
      set (status) {
        this.setDataValue('status', statusValues.indexOf(status))
      },
      get () {
        const status = this.getDataValue('status')
        return statusValues[status]
      },
      defaultValue: 1, // hidden
      field: 'status'
    },
    createdAt: {
      type: DataTypes.INTEGER,
      field: 'date'
    }
  }, {
    timestamps: false,
    modelName: 'Track',
    tableName: 'tracks'
  })

  Track.associate = function (models) {
    // Track.hasMany(models.Play, { as: 'play', foreignKey: 'tid', sourceKey: 'id' })
    // Track.hasMany(models.Tag, { as: 'tags', foreignKey: 'trackId', sourceKey: 'id' })
    // Track.hasMany(models.UserMeta, { as: 'meta', foreignKey: 'user_id', sourceKey: 'creator_id' })
    Track.hasOne(models.User, { as: 'creator', sourceKey: 'creator_id', foreignKey: 'id' })
    Track.hasOne(models.File, { as: 'cover_metadata', sourceKey: 'track_cover_art', foreignKey: 'id' })
    Track.belongsTo(models.File, { as: 'audiofile', foreignKey: 'track_url' })
    Track.belongsTo(models.File, { as: 'cover', foreignKey: 'track_cover_art' })
  }

  return Track
}
