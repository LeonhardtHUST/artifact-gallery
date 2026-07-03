import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const distDir = join(rootDir, "dist");
const linkedDirs = ["images", "content"];

function toProjectPath(path) {
  return relative(rootDir, path).replaceAll("\\", "/") || ".";
}

function removeExistingLink(path) {
  if (!existsSync(path)) {
    return;
  }

  const stat = lstatSync(path);
  if (!stat.isDirectory() && !stat.isSymbolicLink()) {
    throw new Error(`${toProjectPath(path)} exists and is not a directory link target`);
  }

  rmSync(path, { recursive: true, force: true });
}

function linkDirectory(name) {
  const source = join(rootDir, name);
  const target = join(distDir, name);

  if (!existsSync(source) || !lstatSync(source).isDirectory()) {
    throw new Error(`${toProjectPath(source)} does not exist or is not a directory`);
  }

  removeExistingLink(target);
  symlinkSync(source, target, process.platform === "win32" ? "junction" : "dir");
  console.log(`[link-dist] ${toProjectPath(target)} -> ${toProjectPath(source)}`);
}

function main() {
  mkdirSync(distDir, { recursive: true });

  for (const name of linkedDirs) {
    linkDirectory(name);
  }
}

main();
