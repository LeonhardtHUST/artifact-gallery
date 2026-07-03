import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const promptPath = join(rootDir, "prompts", "maintain-gallery.md");
const checkScriptPath = join(rootDir, "utils", "check-gallery.js");
const linkDocsAssetsScriptPath = join(rootDir, "utils", "link-docs-assets.js");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: options.input ? ["pipe", "inherit", "inherit"] : "inherit",
    input: options.input,
    shell: options.shell ?? false
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  console.log("[post-build] Checking gallery manifest...");
  run(process.execPath, [checkScriptPath]);

  const prompt = readFileSync(promptPath, "utf8");

  console.log("[post-build] Running Codex gallery maintenance prompt...");
  run(
    "codex",
    [
      "--sandbox",
      "danger-full-access",
      "--ask-for-approval",
      "never",
      "exec",
      "-C",
      rootDir,
      "-"
    ],
    { input: prompt, shell: process.platform === "win32" }
  );

  console.log("[post-build] Linking gallery assets into docs...");
  run(process.execPath, [linkDocsAssetsScriptPath]);
}

main();
