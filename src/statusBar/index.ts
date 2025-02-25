import { lastSavedTime, updateLastSavedTime } from './items/lastSavedTime'
import { trackingStatus, updateTrackingStatus } from './items/trackingStatus'

export const StatusBarItems = {
    lastSavedTime,
    trackingStatus,
}
export const statusBarActions = {
    updateLastSavedTime,
    updateTrackingStatus,
}
