import { AnyFileChange } from 'parse-git-diff'
import { CodeChanges } from './GitTypes'

export interface DbChunkRange extends LokiObj {
    file_change_id: number
    start_range: number
    lines: number
}

export interface DbFileChange extends LokiObj {
    metrics_record_id: string
    file_path: string
    old_file_path: string | null
    change_type: AnyFileChange['type']
    added_lines_count: number
    deleted_lines_count: number
    modified_lines_count: number
    unchanged_lines_count: number
    total_lines_count: number
    original_lines_count: number
    change_ratio: number
    is_binary: boolean
}

export interface DbLineChange extends LokiObj {
    file_change_id: number
    change_type: string
    line_number: number | null
    content: string
}

// LokiJS specific schema types with added $loki property for internal IDs
export interface DbMetricsRecord extends LokiObj {
    id: string
    project_name: string
    metrics: CodeChanges
    timestamp: number
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

// Interface for LokiJS internal properties
export interface LokiObj {
    $loki?: number
    meta?: {
        created: number
        revision: number
        updated: number
        version: number
    }
}

// Define the proper type for LokiJS collections
export type LokiCollection<T> = Collection<T & LokiObj>

export interface MetricsQueryOptions {
    startDate?: Date
    endDate?: Date
    limit?: number
    filePattern?: string
}

export interface MetricsRecord {
    id: string
    timestamp: number
    data: CodeChanges
}

export interface MetricsStorageResult {
    success: boolean
    id?: string
    error?: string
}

export interface Project {
    name: string
    folder_path: string
    is_tracking: boolean
    last_saved_time: number
}
