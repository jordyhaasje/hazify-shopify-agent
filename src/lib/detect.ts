import os from "node:os";
import { commandExists, runCapture } from "./exec.js";

export interface DetectionReport {
  nodeVersion: string;
  npmVersion: string | null;
  platform: NodeJS.Platform;
  arch: string;
  codexInstalled: boolean;
  claudeInstalled: boolean;
  opencodeInstalled: boolean;
}

export async function detectEnvironment(): Promise<DetectionReport> {
  const npm = await runCapture("npm", ["--version"]);
  const [codexInstalled, claudeInstalled, opencodeInstalled] = await Promise.all([
    commandExists("codex"),
    commandExists("claude"),
    commandExists("opencode")
  ]);

  return {
    nodeVersion: process.version,
    npmVersion: npm.ok ? npm.stdout.trim() : null,
    platform: os.platform(),
    arch: os.arch(),
    codexInstalled,
    claudeInstalled,
    opencodeInstalled
  };
}

export function isNodeVersionSupported(version = process.version): boolean {
  const major = Number(version.replace(/^v/, "").split(".")[0]);
  return Number.isFinite(major) && major >= 18;
}
