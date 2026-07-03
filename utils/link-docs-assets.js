import { copyFileSync, existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const docsDir = join(rootDir, "docs");
const linkedDirs = ["images", "content"];
const linkedFiles = ["list.json"];

function toProjectPath(path) {
  return relative(rootDir, path).replaceAll("\\", "/") || ".";
}

function removeExistingLink(path) {
  if (!existsSync(path)) {
    return;
  }

  const stat = lstatSync(path);
  if (!stat.isDirectory() && !stat.isSymbolicLink() && !stat.isFile()) {
    throw new Error(`${toProjectPath(path)} exists and is not a link target`);
  }

  rmSync(path, { recursive: true, force: true });
}

function linkDirectory(name) {
  const source = join(rootDir, name);
  const target = join(docsDir, name);

  if (!existsSync(source) || !lstatSync(source).isDirectory()) {
    throw new Error(`${toProjectPath(source)} does not exist or is not a directory`);
  }

  removeExistingLink(target);
  symlinkSync(source, target, process.platform === "win32" ? "junction" : "dir");
  console.log(`[link-docs] ${toProjectPath(target)} -> ${toProjectPath(source)}`);
}

function linkFile(name) {
  const source = join(rootDir, name);
  const target = join(docsDir, name);

  if (!existsSync(source) || !lstatSync(source).isFile()) {
    throw new Error(`${toProjectPath(source)} does not exist or is not a file`);
  }

  removeExistingLink(target);
  try {
    symlinkSync(source, target, "file");
    console.log(`[link-docs] ${toProjectPath(target)} -> ${toProjectPath(source)}`);
  } catch {
    copyFileSync(source, target);
    console.log(`[link-docs] ${toProjectPath(target)} (copy) -> ${toProjectPath(source)}`);
  }
}

function main() {
  mkdirSync(docsDir, { recursive: true });

  for (const name of linkedDirs) {
    linkDirectory(name);
  }

  for (const name of linkedFiles) {
    linkFile(name);
  }
}

main();
