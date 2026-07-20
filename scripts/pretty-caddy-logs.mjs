#!/usr/bin/env node
/**
 * Pretty-print Caddy NDJSON docker logs.
 *
 * Usage:
 *   node scripts/pretty-caddy-logs.mjs
 *   node scripts/pretty-caddy-logs.mjs --follow
 *   node scripts/pretty-caddy-logs.mjs --tail 100
 *   node scripts/pretty-caddy-logs.mjs --container cppms-caddy -f
 */
import { spawn } from "node:child_process"

const VALUE_FLAGS = new Set(["--tail", "-n", "--since", "--until"])

const args = process.argv.slice(2)
let container = "cppms-caddy"
const dockerArgs = []

for (let i = 0; i < args.length; i++) {
  const arg = args[i]

  if (arg === "--container" || arg === "-c") {
    const next = args[i + 1]
    if (!next || next.startsWith("-")) {
      console.error("Missing value for --container")
      process.exit(1)
    }
    container = next
    i++
    continue
  }

  if (VALUE_FLAGS.has(arg)) {
    const next = args[i + 1]
    if (!next || next.startsWith("-")) {
      console.error(`Missing value for ${arg}`)
      process.exit(1)
    }
    dockerArgs.push(arg, next)
    i++
    continue
  }

  if (arg.startsWith("-")) {
    dockerArgs.push(arg)
    continue
  }

  container = arg
}

const child = spawn("docker", ["logs", ...dockerArgs, container], {
  stdio: ["ignore", "pipe", "pipe"],
})

let buffer = ""

function formatLine(raw) {
  const line = raw.replace(/\r$/, "")
  if (!line.trim()) return

  try {
    const entry = JSON.parse(line)
    if (typeof entry.ts === "number") {
      entry.ts = new Date(entry.ts * 1000).toISOString()
    }
    console.log(JSON.stringify(entry, null, 2))
    console.log("")
  } catch {
    console.log(line)
  }
}

function onChunk(chunk) {
  buffer += chunk.toString("utf8")
  const parts = buffer.split("\n")
  buffer = parts.pop() ?? ""
  for (const part of parts) formatLine(part)
}

child.stdout.on("data", onChunk)
child.stderr.on("data", onChunk)

child.on("error", (err) => {
  console.error(`Failed to run docker logs: ${err.message}`)
  process.exit(1)
})

child.on("close", (code) => {
  if (buffer.trim()) formatLine(buffer)
  process.exit(code ?? 0)
})
