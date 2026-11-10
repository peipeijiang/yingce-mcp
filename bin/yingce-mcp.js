#!/usr/bin/env node
/**
 * yingce-mcp — stdio MCP bridge for a 影策 deployment.
 *
 * Each JSON-RPC message read from stdin is forwarded to
 * ${YINGCE_BASE_URL}/mcp with the bearer token from YINGCE_TOKEN.
 * Responses are written back to stdout, one JSON object per line.
 */
import readline from "node:readline";

const BASE = (process.env.YINGCE_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const TOKEN = (process.env.YINGCE_TOKEN || "").trim();
const TIMEOUT_MS = Number(process.env.YINGCE_MCP_TIMEOUT_MS || 120000);

function fail(message) {
  process.stderr.write("yingce-mcp: " + message + "\n");
  process.exit(1);
}

if (process.argv.includes("--check")) {
  if (!TOKEN) fail("YINGCE_TOKEN is not set");
  const res = await fetch(BASE + "/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || !body.result) {
    fail("check failed: HTTP " + res.status + " " + JSON.stringify(body || {}).slice(0, 200));
  }
  const names = (body.result.tools || []).map((t) => t.name);
  process.stdout.write("ok: " + names.length + " tools -> " + names.join(", ") + "\n");
  process.exit(0);
}

if (!TOKEN) fail("YINGCE_TOKEN is required (issue one with /opt/yingce-mcp/issue-token.sh on the server)");

async function forward(message) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + "/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
      body: JSON.stringify(message),
      signal: controller.signal,
    });
    if (res.status === 202 || res.status === 204) return null;
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return {
        jsonrpc: "2.0",
        id: message.id ?? null,
        error: { code: -32603, message: "invalid JSON from gateway: " + text.slice(0, 200) },
      };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: message.id ?? null,
      error: { code: -32603, message: "gateway request failed: " + String(error && error.message ? error.message : error) },
    };
  } finally {
    clearTimeout(timer);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let chain = Promise.resolve();

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + "\n");
    return;
  }
  chain = chain.then(async () => {
    const response = await forward(message);
    if (response) process.stdout.write(JSON.stringify(response) + "\n");
  });
});

rl.on("close", () => {
  chain.finally(() => process.exit(0));
});

