import { AnyFileChange, AnyLineChange, ChunkRange } from 'parse-git-diff'
import { FileChange } from '../../types/GitTypes'

/**
 * Process a file change from the git diff parser into our FileChange format
 * @param fileChange The parsed file change from parse-git-diff
 * @returns A FileChange object with comprehensive metrics
 */
export function processFileChange(fileChange: AnyFileChange): FileChange {
    let addedLinesCount = 0
    let deletedLinesCount = 0
    let modifiedLinesCount = 0
    let unchangedLinesCount = 0
    const lineChanges: AnyLineChange[] = []
    const chunkRanges: ChunkRange[] = []
    let isBinary = false

    // Process each chunk in the file
    const chunks = fileChange.chunks || []

    // Check if any chunks are binary
    isBinary = chunks.some((chunk) => chunk.type === 'BinaryFilesChunk')

    // Extract line changes and count by type
    chunks.forEach((chunk) => {
        if (chunk.type === 'Chunk') {
            // Store chunk ranges
            chunkRanges.push(chunk.fromFileRange)
            chunkRanges.push(chunk.toFileRange)

            chunk.changes.forEach((change) => {
                lineChanges.push(change)

                // Count by type
                if (change.type === 'AddedLine') {
                    addedLinesCount++
                } else if (change.type === 'DeletedLine') {
                    deletedLinesCount++
                } else if (change.type === 'UnchangedLine') {
                    unchangedLinesCount++
                } else if (change.type === 'MessageLine') {
                    // These don't count toward code changes
                }
            })
        } else if (chunk.type === 'CombinedChunk') {
            // Store chunk ranges
            chunkRanges.push(chunk.fromFileRangeA)
            chunkRanges.push(chunk.fromFileRangeB)
            chunkRanges.push(chunk.toFileRange)

            chunk.changes.forEach((change) => {
                lineChanges.push(change)

                // Count by type
                if (change.type === 'AddedLine') {
                    addedLinesCount++
                } else if (change.type === 'DeletedLine') {
                    deletedLinesCount++
                } else if (change.type === 'UnchangedLine') {
                    unchangedLinesCount++
                } else if (change.type === 'MessageLine') {
                    // These don't count toward code changes
                }
            })
        }
    })

    // Calculate total lines and original lines
    const totalLinesCount = addedLinesCount + unchangedLinesCount
    const originalLinesCount = deletedLinesCount + unchangedLinesCount

    // Calculate change ratio
    const changedLines = addedLinesCount + deletedLinesCount
    const totalLines = Math.max(totalLinesCount, originalLinesCount)
    const changeRatio = totalLines > 0 ? changedLines / totalLines : 0

    // Map file type to change type
    let changeType: 'DeletedFile' | 'ChangedFile' | 'AddedFile' | 'RenamedFile'
    let filePath: string
    let oldFilePath: string | undefined

    switch (fileChange.type) {
        case 'DeletedFile':
            changeType = 'DeletedFile'
            filePath = fileChange.path
            break
        case 'AddedFile':
            changeType = 'AddedFile'
            filePath = fileChange.path
            break
        case 'ChangedFile':
            changeType = 'ChangedFile'
            filePath = fileChange.path
            break
        case 'RenamedFile':
            changeType = 'RenamedFile'
            filePath = fileChange.pathAfter
            oldFilePath = fileChange.pathBefore
            break
        default:
            changeType = 'ChangedFile'
            filePath = 'unknown'
    }

    return {
        filePath,
        oldFilePath,
        changeType,
        lineChanges,
        addedLinesCount,
        deletedLinesCount,
        modifiedLinesCount,
        unchangedLinesCount,
        totalLinesCount,
        originalLinesCount,
        changeRatio,
        isBinary,
        chunkRanges,
    }
}
