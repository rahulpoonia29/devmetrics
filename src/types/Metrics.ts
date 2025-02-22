import { DiffData } from "../lib/GitSnapshotManager";

export interface Metric extends DiffData {
    id?: number;
    diffSummaryMessage: string;
    startTime: number;
    endTime: number;
}
