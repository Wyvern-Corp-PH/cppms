#!/usr/bin/env node
/**
 * Render a compose .env file from the current process environment.
 * Used by GitHub Actions before SCP to the EC2 host.
 */

const KEYS = [
  "DOMAIN",
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

const missing = KEYS.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error(`Missing deploy env: ${missing.join(", ")}`);
  process.exit(1);
}

const values = Object.fromEntries(KEYS.map((key) => [key, process.env[key].trim()]));

const publicIp = process.env.EC2_HOST?.trim();
if (publicIp && !values.ORIGINS.includes(publicIp)) {
  values.ORIGINS = `${values.ORIGINS},http://${publicIp}`;
}

for (const key of KEYS) {
  const value = values[key];
  const needsQuotes = /[\s#"'\\]/.test(value);
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  process.stdout.write(`${key}=${needsQuotes ? `"${escaped}"` : value}\n`);
}
