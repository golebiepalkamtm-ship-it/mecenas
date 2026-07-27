import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { logInfo, logError } from "./logger.js";

export function getOutputDir(): string {
  const customDir = process.env.LEXMINDE_OUTPUT_DIR || process.env.SAOS_OUTPUT_DIR;
  if (customDir) return customDir;
  return path.join(os.homedir(), "Documents", "lexminde-orzeczenia");
}

export function saveJudgmentToDisk(id: number, content: string, title: string): string | null {
  try {
    const dir = getOutputDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sanitizedTitle = title.replace(/[^a-zA-Z0-9ąĆęŁńÓśŹŻĄĆĘŁŃÓŚŹŻ_\-\s]/g, "").trim().slice(0, 50);
    const fileName = `orzeczenie_${id}_${sanitizedTitle || "saos"}.md`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, content, "utf-8");
    logInfo(`Saved judgment ID ${id} to disk at: ${filePath}`);
    return filePath;
  } catch (error) {
    logError(`Failed to save judgment ${id} to disk:`, error);
    return null;
  }
}
