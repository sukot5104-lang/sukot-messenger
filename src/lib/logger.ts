import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "system.log");

function ensureDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export type LogLevel = "info" | "warn" | "error" | "action";

export function logSystem(
  level: LogLevel,
  scope: string,
  message: string
): void {
  try {
    ensureDir();
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level.toUpperCase()}] [${scope}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // logging must never break the request
  }
}

export function readRecentLogs(maxLines = 200): string[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const raw = fs.readFileSync(LOG_FILE, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

export async function logErrorSafe(scope: string, err: unknown): Promise<void> {
  const message =
    err instanceof Error ? `${err.message}` : typeof err === "object" ? JSON.stringify(err) : String(err);
  logSystem("error", scope, message);
}
