export interface ChangeInterval {
    id?: number;
    startTime: number;
    endTime: number;
    summary: string;
    filesChanged: number;
    totalAdditions: number;
    totalDeletions: number;
}
