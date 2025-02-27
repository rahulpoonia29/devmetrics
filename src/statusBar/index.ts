import { lastSavedTime, updateLastSavedTime } from './items/lastSavedTime'
import { trackingStatus, updateTrackingStatus } from './items/trackingStatus'
import { projectsStatus, updateProjectsStatus } from './items/projectsStatus'

export const StatusBarItems = {
    lastSavedTime,
    trackingStatus,
    projectsStatus,
}
export const statusBarActions = {
    updateLastSavedTime,
    updateTrackingStatus,
    updateProjectsStatus,
}
