export const HIGH_RES_AUDIO_MIME_TYPES = [
  'audio/x-flac',
  'audio/vnd.wave',
  'audio/aiff'
]

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg'
]

export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/aac',
  'audio/aiff',
  'audio/mp4',
  'audio/vnd.wave',
  'audio/x-flac',
  'audio/x-m4a'
]

export const SUPPORTED_MEDIA_TYPES = [
  ...SUPPORTED_AUDIO_MIME_TYPES,
  ...SUPPORTED_IMAGE_MIME_TYPES,
  'text/csv'
]

export default SUPPORTED_MEDIA_TYPES
