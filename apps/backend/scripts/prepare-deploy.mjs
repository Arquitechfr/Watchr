import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const backendDir = resolve(__dirname, "..");

const tarballName = "watchr-i18n-languages-1.0.0.tgz";

console.log("→ Building @watchr/i18n-languages...");
execSync("pnpm --filter @watchr/i18n-languages build", {
  cwd: root,
  stdio: "inherit",
});

console.log("→ Packing @watchr/i18n-languages...");
execSync("pnpm --filter @watchr/i18n-languages pack", {
  cwd: root,
  stdio: "inherit",
});

const src = join(root, tarballName);
const dest = join(backendDir, tarballName);

if (existsSync(dest)) rmSync(dest);
renameSync(src, dest);

console.log(`✓ ${tarballName} ready in apps/backend/`);
