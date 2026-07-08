import path from "node:path";

export const repoRoot = process.cwd();
export const hazifyDir = path.join(repoRoot, ".hazify");
export const localConfigPath = path.join(hazifyDir, "config.local.json");
export const localAgentSetupPath = path.join(hazifyDir, "agent-setup.md");
export const localAppConfigPath = path.join(hazifyDir, "app", "shopify.app.toml");
export const localAppEnvPath = path.join(hazifyDir, "app", ".env");
export const encryptedCredentialsPath = path.join(hazifyDir, "credentials.enc.json");
export const encryptedCredentialsKeyPath = path.join(hazifyDir, "credentials.key");
export const themePath = path.join(repoRoot, "theme");
export const codexConfigPath = path.join(repoRoot, ".codex", "config.toml");
export const claudeMcpPath = path.join(repoRoot, ".mcp.json");
export const opencodeConfigPath = path.join(repoRoot, "opencode.json");

export function toDisplayPath(filePath: string): string {
  const relative = path.relative(repoRoot, filePath);
  return relative.startsWith("..") ? filePath : `./${relative || "."}`;
}
