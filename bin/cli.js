#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distEntry = path.join(packageRoot, "dist", "cli.js");
const sourceEntry = path.join(packageRoot, "src", "cli.ts");
let args;

try {
  require.resolve(distEntry);
  args = [distEntry, ...process.argv.slice(2)];
} catch {
  const tsxCli = require.resolve("tsx/cli");
  args = [tsxCli, sourceEntry, ...process.argv.slice(2)];
}

const child = spawn(process.execPath, args, {
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
