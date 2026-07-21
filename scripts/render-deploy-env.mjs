#!/usr/bin/env node
/**
 * Render a compose .env file from the current process environment.
 * Used by GitHub Actions before rsync to the EC2 host.
 */

const REQUIRED_KEYS = [
  "CADDY_HTTP_PORT",
  "CADDY_HTTPS_PORT",
  "POCKETBASE_ENCRYPTION_KEY",
  "POCKETBASE_ADMIN_EMAIL",
  "POCKETBASE_ADMIN_PASSWORD",
  "ORIGINS",
  "LOG_LEVEL",
  "LOG_STDOUT",
  "NEXT_PUBLIC_POCKETBASE_URL",
  "NEXT_PUBLIC_PUBLIC_URL",
  "NEXT_PUBLIC_ADMIN_URL",
];

const OPTIONAL_KEYS = ["DOMAIN", "GHCR_REGISTRY", "IMAGE_TAG"];

const missing = REQUIRED_KEYS.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error(`Missing deploy env: ${missing.join(", ")}`);
  process.exit(1);
}

const values = Object.fromEntries(
  REQUIRED_KEYS.map((key) => [key, process.env[key].trim()]),
);

for (const key of OPTIONAL_KEYS) {
  const value = process.env[key]?.trim();
  if (value) {
    values[key] = value;
  }
}

const publicIp = process.env.EC2_HOST?.trim();
if (publicIp && !values.ORIGINS.includes(publicIp)) {
  values.ORIGINS = `${values.ORIGINS},http://${publicIp}`;
}

// Intentional Caddyfile has both `{$DOMAIN}` and `:80`. Never use DOMAIN=:80 —
// that makes two identical site addresses and Caddy refuses to start.
// IP-only bootstrap: use the EC2 host as the DOMAIN site label when unset.
if (!values.DOMAIN || values.DOMAIN === ":80") {
  if (publicIp) {
    values.DOMAIN = publicIp;
  } else {
    delete values.DOMAIN;
  }
}

const keys = [...REQUIRED_KEYS, ...OPTIONAL_KEYS.filter((key) => values[key])];

for (const key of keys) {
  const value = values[key];
  const needsQuotes = /[\s#"'\\]/.test(value);
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  process.stdout.write(`${key}=${needsQuotes ? `"${escaped}"` : value}\n`);
}
