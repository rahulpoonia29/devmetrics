# Debugging Tips for Devmetrics Extension

1. Ensure package.json exists at the root and its "main" field points to your compiled entry (extension.ts).
2. Check that all dependencies (especially sqlite3 and simple-git) are listed in package.json.
3. If using native modules (like sqlite3), verify they are rebuilt for Electron/VS Code.
4. Bundling: Consider using webpack or vsce to properly bundle and resolve all modules.
5. Avoid using any internal Node.js modules (e.g. those starting with "node:internal") that might break module resolution.
6. Uncomment the commands gradually to identify which module triggers the error.

After these checks your commands (devmetrics.startTracking and devmetrics.showMetrics) should activate without module resolution errors.
