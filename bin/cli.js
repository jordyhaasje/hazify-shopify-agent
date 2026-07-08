#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsxCli = require.resolve("tsx/cli");
const cliEntry = path.join(packageRoot, "src", "cli.ts");

const child = spawn(process.execPath, [tsxCli, cliEntry, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
