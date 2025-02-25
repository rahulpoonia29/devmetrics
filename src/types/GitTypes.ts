import { AnyLineChange, ChunkRange } from 'parse-git-diff'

export interface GitDiffSummary {
    filesChanged: number
    insertions: number
    deletions: number
}

export interface FileChange {
    filePath: string
    oldFilePath?: string // For renamed files
    changeType: 'DeletedFile' | 'ChangedFile' | 'AddedFile' | 'RenamedFile'
    lineChanges: AnyLineChange[]

    // Basic metrics
    addedLinesCount: number
    deletedLinesCount: number
    modifiedLinesCount: number
    unchangedLinesCount: number

    // Additional metrics
    totalLinesCount: number // Total lines after change
    originalLinesCount: number // Total lines before change
    changeRatio: number // Ratio of changed lines to total lines

    // Binary file information
    isBinary: boolean

    // Chunk information
    chunks: {
        count: number // Number of change chunks
        averageSize: number // Average chunk size
        ranges: ChunkRange[] // Store actual chunk ranges
    }
}

export interface CodeChanges {
    summary: GitDiffSummary
    changes: FileChange[]
}
