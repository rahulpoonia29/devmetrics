import { CodeChanges } from './GitTypes'

export interface MetricsQueryOptions {
    startDate?: Date
    endDate?: Date
    limit?: number
    filePattern?: string
}

export interface MetricsStorageResult {
    success: boolean
    id?: string
    error?: string
}

export interface MetricsRecord {
    id: string
    timestamp: number
    data: CodeChanges
}

export class DatabaseError extends Error {
    constructor(
        message: string,
        public readonly code?: string
    ) {
        super(message)
        this.name = 'DatabaseError'
    }
}
