# DevMetrics Extension Approach

## Overview

The DevMetrics extension is designed to track code changes and summarize metrics over time. Instead of using resource-intensive file watchers for every change, the extension uses a **git-based snapshot diff** approach. This method creates periodic snapshots of a user-selected project folder by committing changes into a separate git repository maintained in the extension's global storage.

## Key Concepts

### 1. Git-Based Snapshot Diff

-   **Snapshot Repository:**  
    The extension maintains a separate git repository inside the extension's global storage. This avoids any conflict with the user's own repositories.
-   **Initial Snapshot:**  
    On initialization, the current state of the project is copied into the tracking repository and an initial commit ("Initial commit - Copy of source folder") is created.
-   **Periodic Snapshots:**  
    Every configured interval (default 10 minutes), the extension copies the latest state of the project folder into the tracking repository and commits any changes. A git diff is then computed between the previous and the current commit.

-   **Diff Summary:**  
    The diff output is parsed to generate metrics such as the number of files changed, insertions, and deletions. These metrics are stored in the extension’s SQLite database using the `MetricsStorage` class.

### 2. Separation of Concerns

-   **GitSnapshotManager:**  
    Implements the git operations using the `simple-git` package and manages commits and diff calculation within the tracking repository.

-   **ProjectDiffAnalyzer (FolderDiffAnalyzer):**  
    Uses the `GitSnapshotManager` to periodically take snapshots and compute diffs. It then stores summaries into the SQLite database and displays notifications.

-   **MetricsStorage:**  
    Handles persistent storage of detailed metrics and summary intervals in a local SQLite database.

-   **ExtensionConfig:**  
    Provides centralized configuration management for properties like the project folder path, analysis interval, and excluded paths.

## Workflow

1. **Folder Selection:**  
   The user selects a folder to track via a VS Code command (`devmetrics.selectFolder`), which stores the path in the global configuration.

2. **Initialization of Tracking:**

    - When tracking starts (`devmetrics.startTracking`), the extension checks the selected folder.
    - A unique tracking repository is created inside the extension’s global storage (using a hash of the project folder path) to avoid conflicts.
    - The repository is initialized or updated with an initial snapshot.

3. **Periodic Analysis:**  
   The extension uses a timer (setInterval) to every 10 minutes:

    - Update the tracking repository with the current state of the project.
    - Commit any changes.
    - Compute a diff summary between the last snapshot and the current snapshot.
    - Store the summary and metrics into the SQLite database.

4. **User Feedback:**  
   A notification is shown indicating the summary of changes detected in the snapshot diff operation.

## Benefits

-   **Resource Efficiency:**  
    Avoids continuous file watching by taking snapshots at fixed intervals.
-   **User-Independent Tracking:**  
    The tracking repository is maintained separately in the extension’s global storage, keeping user projects untouched.
-   **Clear Metrics:**  
    Provides concise metrics (files changed, insertions, deletions) similar to git diff statistics.

## Further Improvements

-   **Diff Detail:**  
    Optionally extend the diff processing to include detailed per-file change data.
-   **LLM Integration:**  
    Use the diff summaries to invoke an external LLM for generating higher-level insights or summaries.
-   **Customization:**  
    Allow users to adjust analysis intervals and exclusion patterns through the extension’s configuration.

## Conclusion

This design leverages git for efficient snapshot management, reducing resource usage while providing meaningful change metrics. The separation into multiple modules (configuration, storage, snapshot management, and analysis) ensures maintainability and scalability for future enhancements.
