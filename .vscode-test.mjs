import { defineConfig } from "@vscode/test-cli";

// The default glob walks the whole repository, including the VS Code build this
// tool downloads into .vscode-test, and runs the runner out of memory. List the
// integration suite explicitly; the unit suites run under plain mocha.
export default defineConfig({
    files: ["out/test/suite/extension.test.js"],
    version: "stable",
    // A small Unity project, so the index has something real to work on.
    workspaceFolder: "./test-fixtures/UnityProject",
    launchArgs: ["--disable-extensions", "--disable-gpu"],
    mocha: { ui: "tdd", timeout: 30000 },
});
