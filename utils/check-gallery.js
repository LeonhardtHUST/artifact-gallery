import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const listPath = join(rootDir, "list.json");
const logsDir = join(rootDir, "logs");

function getCommitId() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8"
    }).trim();
  } catch {
    return "unknown";
  }
}

function toProjectPath(value) {
  return normalize(value).replaceAll("\\", "/");
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.trim() === "" || isAbsolute(value)) {
    return false;
  }

  const normalized = normalize(value);
  return !normalized.startsWith("..") && !normalized.includes(`..\\`) && !normalized.includes("../");
}

function fileCheck(value) {
  const validPath = isSafeRelativePath(value);
  const absolutePath = validPath ? resolve(rootDir, value) : "";
  const exists = validPath && existsSync(absolutePath);

  return {
    path: typeof value === "string" ? toProjectPath(value) : "",
    validPath,
    exists
  };
}

function isLocalizedText(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.zh === "string" &&
      value.zh.trim() !== "" &&
      typeof value.en === "string" &&
      value.en.trim() !== ""
  );
}

function validateEntry(entry, index) {
  const errors = [];
  const html = fileCheck(entry?.url);
  const image = fileCheck(entry?.imageUrl);

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    errors.push("entry must be an object");
  }

  if (!Number.isInteger(entry?.id)) {
    errors.push("id must be an integer");
  }

  if (!isLocalizedText(entry?.title)) {
    errors.push("title must contain non-empty zh and en strings");
  }

  if (!isLocalizedText(entry?.description)) {
    errors.push("description must contain non-empty zh and en strings");
  }

  if (!html.validPath) {
    errors.push("url must be a safe relative path");
  } else if (!html.exists) {
    errors.push("url target does not exist");
  }

  if (!image.validPath) {
    errors.push("imageUrl must be a safe relative path");
  } else if (!image.exists) {
    errors.push("imageUrl target does not exist");
  }

  if (typeof entry?.generatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.generatedAt)) {
    errors.push("generatedAt must use YYYY-MM-DD format");
  }

  return {
    index,
    id: Number.isInteger(entry?.id) ? entry.id : null,
    title: {
      zh: typeof entry?.title?.zh === "string" ? entry.title.zh : "",
      en: typeof entry?.title?.en === "string" ? entry.title.en : ""
    },
    checks: {
      schema: errors.length === 0,
      html,
      image
    },
    errors
  };
}

function main() {
  const commitId = getCommitId();
  const logPath = join(logsDir, `check-${commitId}.json`);

  mkdirSync(logsDir, { recursive: true });

  if (existsSync(logPath)) {
    rmSync(logPath, { force: true });
  }

  const result = {
    schemaVersion: 1,
    commitId,
    checkedAt: new Date().toISOString(),
    root: toProjectPath(relative(process.cwd(), rootDir) || "."),
    listPath: toProjectPath(relative(rootDir, listPath)),
    ok: false,
    summary: {
      totalEntries: 0,
      validEntries: 0,
      invalidEntries: 0,
      missingHtmlFiles: 0,
      missingImageFiles: 0
    },
    list: {
      exists: existsSync(listPath),
      validJson: false,
      isArray: false
    },
    entries: [],
    errors: []
  };

  let entries = [];

  if (!result.list.exists) {
    result.errors.push("list.json does not exist");
  } else {
    try {
      const parsed = JSON.parse(readFileSync(listPath, "utf8"));
      result.list.validJson = true;
      result.list.isArray = Array.isArray(parsed);

      if (Array.isArray(parsed)) {
        entries = parsed;
      } else {
        result.errors.push("list.json must contain an array");
      }
    } catch (error) {
      result.errors.push(`list.json is not valid JSON: ${error.message}`);
    }
  }

  result.entries = entries.map(validateEntry);
  result.summary.totalEntries = result.entries.length;
  result.summary.validEntries = result.entries.filter((entry) => entry.errors.length === 0).length;
  result.summary.invalidEntries = result.summary.totalEntries - result.summary.validEntries;
  result.summary.missingHtmlFiles = result.entries.filter((entry) => !entry.checks.html.exists).length;
  result.summary.missingImageFiles = result.entries.filter((entry) => !entry.checks.image.exists).length;
  result.ok = result.errors.length === 0 && result.summary.invalidEntries === 0;

  writeFileSync(logPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  if (!result.ok) {
    console.error(`Gallery check failed. See ${toProjectPath(relative(rootDir, logPath))}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Gallery check passed. Wrote ${toProjectPath(relative(rootDir, logPath))}`);
}

main();
