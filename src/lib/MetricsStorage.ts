import { join } from "path";
// import * as sqlite3 from "sqlite3";
import { promisify } from "util";
import { ChangeInterval } from "../types/Metrics";

export class MetricsStorage {
    // private db: sqlite3.Database;
    // private runAsync: (sql: string, params?: any[]) => Promise<void>;
    // private allAsync: (sql: string, params?: any[]) => Promise<any[]>;

    constructor(storagePath: string) {
        // this.db = new sqlite3.Database(join(storagePath, "metrics.db"));
        // Promisify database methods
        // this.runAsync = promisify(this.db.run.bind(this.db));
        // this.allAsync = promisify(this.db.all.bind(this.db));
    }

    async initialize(): Promise<void> {
        try {
            // await this.runAsync(`
            //     CREATE TABLE IF NOT EXISTS change_intervals (
            //         id INTEGER PRIMARY KEY AUTOINCREMENT,
            //         startTime INTEGER NOT NULL,
            //         endTime INTEGER NOT NULL,
            //         summary TEXT NOT NULL,
            //         filesChanged INTEGER NOT NULL,
            //         totalAdditions INTEGER NOT NULL,
            //         totalDeletions INTEGER NOT NULL
            //     )
            // `);
        } catch (error) {
            console.error("Failed to initialize database:", error);
            throw error;
        }
    }

    async storeMetric(metric: ChangeInterval): Promise<void> {
        try {
            // await this.runAsync(
            //     `INSERT INTO file_changes
            //     (startTime, endTime, summary, filesChanged, totalAdditions, totalDeletions)
            //     VALUES (?, ?, ?, ?, ?, ?)`,
            //     [
            //         metric.startTime,
            //         metric.endTime,
            //         metric.summary,
            //         metric.filesChanged,
            //         metric.totalAdditions,
            //         metric.totalDeletions,
            //     ]
            // );
        } catch (error) {
            console.error("Failed to store metric:", error);
            throw error;
        }
    }

    async getMetrics(): Promise<ChangeInterval[]> {
        try {
            // return await this.allAsync("SELECT * FROM file_changes");
            return [];
        } catch (error) {
            console.error("Failed to get metrics:", error);
            throw error;
        }
    }

    async close(): Promise<void> {
        try {
            // await promisify(this.db.close.bind(this.db))();
        } catch (error) {
            console.error("Failed to close database:", error);
            throw error;
        }
    }
}

// async storeInterval(interval: ChangeInterval): Promise<void> {
//     try {
//         await this.runAsync(
//             `INSERT INTO change_intervals
//             (startTime, endTime, summary, filesChanged, totalAdditions, totalDeletions)
//             VALUES (?, ?, ?, ?, ?, ?)`,
//             [
//                 interval.startTime,
//                 interval.endTime,
//                 interval.summary,
//                 JSON.stringify(interval.filesChanged),
//                 interval.totalAdditions,
//                 interval.totalDeletions,
//             ]
//         );
//     } catch (error) {
//         console.error("Failed to store interval:", error);
//         throw error;
//     }
// }

// async getIntervals(): Promise<ChangeInterval[]> {
//     try {
//         const rows = await this.allAsync(
//             "SELECT * FROM change_intervals ORDER BY startTime DESC"
//         );
//         return rows.map((row) => ({
//             ...row,
//             filesChanged: JSON.parse(row.filesChanged),
//         }));
//     } catch (error) {
//         console.error("Failed to get intervals:", error);
//         throw error;
//     }
// }
