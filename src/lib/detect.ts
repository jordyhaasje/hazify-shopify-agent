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
  activeClient: "codex" | "claude" | "opencode" | "terminal" | "unknown";
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
    opencodeInstalled,
    activeClient: detectActiveClient()
  };
}

export function isNodeVersionSupported(version = process.version): boolean {
  const major = Number(version.replace(/^v/, "").split(".")[0]);
  return Number.isFinite(major) && major >= 18;
}

export function detectActiveClient(): DetectionReport["activeClient"] {
  const env = process.env;
  const joined = Object.entries(env)
    .filter(([key]) => /CODEX|CLAUDE|OPENCODE|OPEN_CODE/i.test(key))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  if (/CODEX/i.test(joined)) return "codex";
  if (/CLAUDE/i.test(joined)) return "claude";
  if (/OPENCODE|OPEN_CODE/i.test(joined)) return "opencode";
  if (process.env.TERM_PROGRAM || process.env.TERM) return "terminal";
  return "unknown";
}
