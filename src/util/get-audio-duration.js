import ffmpeg from 'fluent-ffmpeg'

// Try this with some flac with no headers
export default (filepath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) return reject(err)

      return resolve(metadata.format.duration)
    })
  })
}
