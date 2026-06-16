#!/usr/bin/env node
/**
 * Push GitHub repo variables and secrets from an env file.
 *
 * Env lines must end with `# VAR` or `# SECRET` (see `.env.dev`).
 * Requires: gh CLI authenticated with repo admin access.
 *
 * Usage:
 *   node scripts/set-github-env.mjs              # dry-run (default)
 *   node scripts/set-github-env.mjs --apply      # set values on GitHub
 *   node scripts/set-github-env.mjs --env-file .env.dev --apply
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);

function flag(name) {
  return args.includes(name);
}

function option(name, fallback) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

if (flag("--help") || flag("-h")) {
  console.log(`Usage: node scripts/set-github-env.mjs [options]

Options:
  --env-file <path>   Env file (default: .env.dev)
  --repo <owner/repo> Target repo (default: git origin or env file)
  --apply             Actually set values (default: dry-run)
  --help, -h          Show this help

Requires gh CLI. Lines must end with "# VAR" or "# SECRET".`);
  process.exit(0);
}

const envFile = resolve(ROOT, option("--env-file", ".env.dev"));
const apply = flag("--apply");
const repoOverride = option("--repo", "");

function isQuotedClosed(value, quote = '"') {
  if (!value.startsWith(quote)) return true;
  let escaped = false;
  for (let i = 1; i < value.length; i++) {
    const ch = value[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === quote) return true;
  }
  return false;
}

/** @returns {{ key: string, value: string, type: "VAR" | "SECRET" }[]} */
function parseEnvFile(content) {
  const entries = [];
  const lines = content.split(/\r?\n/);
  let buffer = "";
  let inMultiline = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inMultiline && (!trimmed || (trimmed.startsWith("#") && !trimmed.includes("=")))) {
      continue;
    }

    buffer = buffer ? `${buffer}\n${line}` : line;

    const eqIdx = buffer.indexOf("=");
    if (eqIdx === -1) continue;

    const valueStart = buffer.slice(eqIdx + 1).trimStart();
    const quote = valueStart[0];
    if ((quote === '"' || quote === "'") && !isQuotedClosed(valueStart, quote)) {
      inMultiline = true;
      continue;
    }

    inMultiline = false;
    const entry = parseEntry(buffer);
    if (entry) entries.push(entry);
    buffer = "";
  }

  if (buffer.trim()) {
    throw new Error(`Unterminated env entry near: ${buffer.slice(0, 60)}…`);
  }

  return entries;
}

/** @returns {{ key: string, value: string, type: "VAR" | "SECRET" } | null} */
function parseEntry(raw) {
  const typeMatch = raw.match(/\s+#\s*(VAR|SECRET)\s*$/);
  if (!typeMatch) return null;

  const type = /** @type {"VAR" | "SECRET"} */ (typeMatch[1]);
  const body = raw.replace(/\s+#\s*(VAR|SECRET)\s*$/, "");
  const eqIdx = body.indexOf("=");
  if (eqIdx === -1) return null;

  const key = body.slice(0, eqIdx).trim();
  let value = body.slice(eqIdx + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  if (!key) return null;
  return { key, value, type };
}

function gh(args, input) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `gh ${args.join(" ")} failed`);
  }
  return (result.stdout || "").trim();
}

function parseGitHubRepo(url) {
  const match = url.match(/github\.com[:/]([^/]+\/[^/.]+)/);
  return match ? match[1].replace(/\.git$/, "") : "";
}

function resolveRepo(entries) {
  if (repoOverride) return repoOverride;

  try {
    const origin = gh(["remote", "get-url", "origin"]);
    const fromOrigin = parseGitHubRepo(origin);
    if (fromOrigin) return fromOrigin;
  } catch {
    // fall through
  }

  const releaseUrl = entries.find((e) => e.key === "SEMANTIC_RELEASE_REPOSITORY_URL");
  if (releaseUrl) {
    const fromEnv = parseGitHubRepo(releaseUrl.value);
    if (fromEnv) return fromEnv;
  }

  throw new Error(
    "Could not detect GitHub repo. Pass --repo owner/name or set git origin.",
  );
}

function main() {
  let content;
  try {
    content = readFileSync(envFile, "utf8");
  } catch (err) {
    console.error(`Cannot read ${envFile}: ${err.message}`);
    process.exit(1);
  }

  const entries = parseEnvFile(content);
  if (entries.length === 0) {
    console.error(`No # VAR / # SECRET entries found in ${envFile}`);
    process.exit(1);
  }

  const vars = entries.filter((e) => e.type === "VAR");
  const secrets = entries.filter((e) => e.type === "SECRET");
  const repo = resolveRepo(entries);

  console.log(`env file: ${envFile}`);
  console.log(`repo:     ${repo}`);
  console.log(`mode:     ${apply ? "apply" : "dry-run"}`);
  console.log(`counts:   ${vars.length} variable(s), ${secrets.length} secret(s)\n`);

  for (const entry of entries) {
    const { key, value, type } = entry;
    const label = type === "VAR" ? "variable" : "secret";
    if (!apply) {
      console.log(`  [dry-run] gh ${type === "VAR" ? "variable" : "secret"} set ${key}  (${label})`);
      continue;
    }

    const subcommand = type === "VAR" ? "variable" : "secret";
    try {
      gh([subcommand, "set", key, "--repo", repo], value);
      console.log(`  ok  ${key} (${label})`);
    } catch (err) {
      console.error(`  fail ${key}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  if (!apply) {
    console.log("\nRe-run with --apply to push values to GitHub.");
  }
}

main();
