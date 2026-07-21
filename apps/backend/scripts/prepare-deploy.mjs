import { execSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const backendDir = resolve(__dirname, "..");

const tarballName = "watchr-i18n-languages-1.0.0.tgz";
const pkgPath = join(backendDir, "package.json");
const workspaceRef = "workspace:*";
const tarballRef = `file:./${tarballName}`;

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

// Patch package.json to use the tarball reference for standalone deployment
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
if (pkg.dependencies?.["@watchr/i18n-languages"] === workspaceRef) {
  pkg.dependencies["@watchr/i18n-languages"] = tarballRef;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`✓ package.json patched: @watchr/i18n-languages → ${tarballRef}`);
} else {
  console.log("→ package.json already references tarball, skipping patch.");
}
