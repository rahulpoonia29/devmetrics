# DevMetrics: Track Coding Progress in VS Code

**Track and analyze your coding activity directly in VS Code. Gain insights into lines of code, files modified, and more to boost productivity.**

## Features

- **Project Tracking:** Track coding activity for multiple VS Code projects.
- **Automated Tracking:** Background tracking - set it and forget it.
- **Customizable Intervals:** Set metric analysis from 5 min to 2 hours.
- **Metrics View:** Sidebar view for quick stats in VS Code.
- **Key Statistics:** Lines added/removed, files modified (daily, weekly, monthly, all-time).
- **Privacy-Focused:** Local data storage using LokiJS; no external data transfer.
- **Easy Project Management:** Commands for project setup, deletion, and management.
- **Git-Aware:** Tracks changes in Git repositories.

## Roadmap

**✅ Done Features (in current release)**

- [x] Project-Based Tracking
- [x] Automatic Metric Recording
- [x] Customizable Analysis Interval
- [x] Basic Metrics View in VS Code
- [x] Lines Added/Removed Metrics
- [x] Files Modified Metric
- [x] Local Data Storage (LokiJS)
- [x] Project Management Commands
- [x] Git-Aware Tracking

**⏳ Upcoming Features (Future Releases)**

- [ ] More Detailed File Change Metrics
- [ ] Enhanced Metrics View UI (per file basic changes etc)
- [ ] Custom Date Range Selection for Metrics
- [ ] Code Session Timers/Duration Tracking
- [ ] Insights and Productivity Tips based on Metrics using LLM's
- [ ] User-Configurable file to track

## Requirements

- VS Code 1.97.0+
- Git installed

## Getting Started

1.  **Install:** Find "DevMetrics" in VS Code Marketplace.
2.  **Open View:** Click DevMetrics icon (graph) in Activity Bar.
3.  **Create Project:** Click "+" icon.
4.  **Select Folder:** Choose project root folder.
5.  **Start Tracking:** Click "Play" button next to project.

## Extension Settings

- **`devmetrics.analysisIntervalMinutes`:** Analysis frequency (5-120 mins, default: 30). _(VS Code Settings > DevMetrics)_
- **`devmetrics.excludedPaths`:** Glob patterns to exclude (default: `["node_modules/", ".git/"]`). _(VS Code Settings > DevMetrics)_

## Commands

_(Command Palette: Ctrl+Shift+P or Cmd+Shift+P)_

- `DevMetrics: Create New Project`: Add project.
- `DevMetrics: Delete Project`: Remove project & metrics.
- `DevMetrics: Manage Projects`: Open DevMetrics view.
- `DevMetrics: Rename Project`: Rename project.
- `DevMetrics: Change Project Folder`: Update project folder path.
- `DevMetrics: View Project Metrics`: Show project metrics in view.
- `DevMetrics: Start Tracking`: Start tracking project.
- `DevMetrics: Stop Tracking`: Pause project tracking.
- `DevMetrics: Refresh Data`: Update metrics view.

## Metrics View

- **Project List:** Tracked projects.
- **Project Metrics:** Lines added/removed, files modified (today, week, month, all-time).
- **Refresh Button:** Update metrics data.

## Data Storage & Privacy

- **Local Storage:** VS Code global storage (LokiJS).
- **Privacy:** Data stays local; no external servers used.

## Known Issues

- View refresh may be delayed - use refresh button.
- _(List issues here)_

## Release Notes

### 0.0.3

- Initial preview release.
- Multi-project support.
- Basic metrics view.

## Contribution Guidelines

1.  Fork repository.
2.  Create branch.
3.  Code & commit (clear messages).
4.  Pull Request.

Contributions welcome!

**Track your coding progress with DevMetrics!**

---

- [Repository](https://github.com/rahulpoonia29/devmetrics)
- [Issues](https://github.com/rahulpoonia29/devmetrics/issues)
