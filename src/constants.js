/**
 * Track.status
 */

export const TRACK_STATUS_LIST = [
  'free+paid',
  'hidden',
  'free',
  'paid',
  'deleted'
]

/**
 * File.status
 */

export const FILE_STATUS_LIST = [
  'processing',
  'errored',
  'ok'
]

export const TRACKGROUP_TYPES = [
  'lp', // long player
  'ep', // extended play
  'single',
  'playlist',
  'compilation',
  'collection'
]

export default {
  FILE_STATUS_LIST,
  TRACKGROUP_TYPES,
  TRACK_STATUS_LIST
}
