import path from "node:path";

export const repoRoot = process.cwd();
export const hazifyDir = path.join(repoRoot, ".hazify");
export const localConfigPath = path.join(hazifyDir, "config.local.json");
export const encryptedCredentialsPath = path.join(hazifyDir, "credentials.enc.json");
export const themePath = path.join(repoRoot, "theme");
export const codexConfigPath = path.join(repoRoot, ".codex", "config.toml");
export const claudeMcpPath = path.join(repoRoot, ".mcp.json");
export const opencodeConfigPath = path.join(repoRoot, "opencode.json");

export function toDisplayPath(filePath: string): string {
  const relative = path.relative(repoRoot, filePath);
  return relative.startsWith("..") ? filePath : `./${relative || "."}`;
}
