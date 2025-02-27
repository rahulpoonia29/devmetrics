import { AnyFileChange } from 'parse-git-diff'
import { AnyLineChange, ChunkRange } from 'parse-git-diff'

export interface FileChange {
    filePath: string
    oldFilePath?: string // For renamed files
    changeType: AnyFileChange['type']
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
    chunkRanges: ChunkRange[]
}

export interface CodeChanges {
    summary: string
    filesChanged: number
    insertions: number
    deletions: number
    changes: FileChange[]
}
