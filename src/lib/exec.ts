import { execa, type Options } from "execa";

export interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
}

export async function commandExists(command: string): Promise<boolean> {
  const checker = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [command] : ["-v", command];
  const result = await runCapture(checker, args, { reject: false, shell: process.platform !== "win32" });
  return result.ok;
}

export async function runCapture(
  command: string,
  args: string[] = [],
  options: Options = {}
): Promise<CommandResult> {
  try {
    const result = await execa(command, args, {
      all: false,
      reject: false,
      ...options
    });
    return {
      ok: result.exitCode === 0,
      stdout: outputToString(result.stdout),
      stderr: outputToString(result.stderr),
      exitCode: result.exitCode
    };
  } catch (error) {
    const anyError = error as { stdout?: string; stderr?: string; exitCode?: number; message?: string };
    return {
      ok: false,
      stdout: anyError.stdout ?? "",
      stderr: anyError.stderr ?? anyError.message ?? "",
      exitCode: anyError.exitCode
    };
  }
}

function outputToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return Buffer.from(value).toString("utf8");
  if (Array.isArray(value)) return value.map((item) => String(item)).join("\n");
  return "";
}

export async function runInteractive(command: string, args: string[] = [], options: Options = {}): Promise<number> {
  const child = execa(command, args, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    reject: false,
    ...options
  });
  const result = await child;
  return result.exitCode ?? 1;
}
