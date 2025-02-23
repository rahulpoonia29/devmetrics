import { CodeChanges } from '../lib/GitChangeRecorder'

export interface CodeChangeMetrics extends CodeChanges {
    id?: number
    diffSummaryMessage: string
    startTime: number
    endTime: number
}
