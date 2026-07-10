#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildPlaybookMarkdown, errorSignature, redactText, titleFromError } from "../shared/redaction.js";

interface LocalConfig {
  defaultVisibility?: "private" | "team" | "public";
}

const LocalConfigSchema = z.object({
  defaultVisibility: z.enum(["private", "team", "public"]).optional()
}).passthrough();

const requiredText = z.string().trim().min(1).max(12_000);
const optionalText = z.string().max(12_000).optional();
const shortText = z.string().max(240).optional();
const attemptedFixes = z.array(z.string().max(2_000)).max(20).optional();
const dependencyVersions = z.record(z.string().max(120)).refine((value) => Object.keys(value).length <= 50, {
  message: "dependencyVersions supports at most 50 entries"
}).optional();

function localConfig(): LocalConfig {
  const path = join(process.cwd(), ".erroratlas", "config.json");
  if (!existsSync(path)) return {};
  const parsed = LocalConfigSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) throw new Error(".erroratlas/config.json contains unsupported values.");
  return parsed.data as LocalConfig;
}

const config = localConfig();
const apiUrl = trustedApiUrl(process.env.ERRORATLAS_API_URL || "https://erroratlas.sansynx.workers.dev");
const agentKey = process.env.ERRORATLAS_API_KEY || "";
const supermemoryUrl = localServiceUrl(process.env.SUPERMEMORY_URL || "http://localhost:6767");
const supermemoryKey = process.env.SUPERMEMORY_API_KEY || "";

const server = new McpServer({
  name: "erroratlas",
  version: "0.2.0"
});

server.tool(
  "search_error",
  {
    error: requiredText,
    stack: optionalText,
    command: shortText,
    exitCode: z.number().optional(),
    language: shortText,
    framework: shortText,
    packageManager: shortText,
    dependencyVersions,
    limit: z.number().int().min(1).max(20).optional()
  },
  async (input) => {
    const local = await searchSupermemory(input);
    const remote = await callApi("/api/search", input);
    return respond({ local, remote });
  }
);

server.tool(
  "capture_error_signal",
  {
    error: requiredText,
    context: optionalText,
    stack: optionalText,
    attemptedFixes,
    command: shortText,
    exitCode: z.number().optional(),
    language: shortText,
    framework: shortText,
    packageManager: shortText,
    dependencyVersions,
    signalType: z.enum(["error", "failed_fix", "verification", "note"]).optional(),
    visibility: z.enum(["private", "team", "public"]).optional()
  },
  async (input) => {
    const memory = await writeSupermemory({
      kind: "incident",
      title: titleFromError(input.error),
      error_signature: errorSignature(input.error),
      ...input
    });
    const remote = await callApi("/api/incidents", input);
    return respond({ memory, remote });
  }
);


server.tool(
  "publish_resolution",
  {
    error: requiredText,
    rootCause: requiredText,
    finalFix: requiredText,
    failedAttempts: attemptedFixes,
    verification: requiredText,
    language: shortText,
    framework: shortText,
    packageManager: shortText,
    visibility: z.enum(["private", "team", "public"]).optional(),
    risk: z.enum(["low", "medium", "high"]).optional(),
    confidence: z.enum(["low", "medium", "high"]).optional()
  },
  async (input) => {
    const title = titleFromError(input.error);
    const playbookInput: Parameters<typeof buildPlaybookMarkdown>[0] = {
      title,
      error: input.error,
      rootCause: input.rootCause,
      finalFix: input.finalFix
    };
    if (input.failedAttempts) playbookInput.failedAttempts = input.failedAttempts;
    if (input.verification) playbookInput.verification = input.verification;
    if (input.framework) playbookInput.framework = input.framework;
    if (input.language) playbookInput.language = input.language;
    if (input.risk) playbookInput.risk = input.risk;
    if (input.confidence) playbookInput.confidence = input.confidence;
    const playbook = buildPlaybookMarkdown(playbookInput);
    const memory = await writeSupermemory({
      kind: "resolution",
      title,
      error_signature: errorSignature(input.error),
      playbook,
      ...input
    });
    const remote = await callApi("/api/resolutions", {
      ...input,
      visibility: input.visibility || config.defaultVisibility || "public"
    });
    return respond({ memory, remote, playbook });
  }
);

server.tool(
  "get_playbook",
  {
    id: z.string()
  },
  async (input) => {
    const response = await fetch(`${apiUrl}/api/playbooks/${encodeURIComponent(input.id)}`, {
      headers: authHeaders(),
      redirect: "error"
    });
    return respond(await safeJsonResponse(response, "ErrorAtlas playbook request"));
  }
);

async function callApi(path: string, body: unknown): Promise<unknown> {
  if (!agentKey) {
    return { skipped: true, reason: "ERRORATLAS_API_KEY is not set" };
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(sanitizeForRemote(body)),
    redirect: "error"
  });
  return safeJsonResponse(response, "ErrorAtlas API request");
}

function authHeaders(): Record<string, string> {
  return agentKey ? { "X-ErrorAtlas-Key": agentKey } : {};
}

async function searchSupermemory(input: unknown): Promise<unknown> {
  try {
    const query = redactText(input);
    const response = await fetch(`${supermemoryUrl}/v3/search`, {
      method: "POST",
      headers: supermemoryHeaders(),
      body: JSON.stringify({ q: query, limit: 5 }),
      redirect: "error"
    });
    if (!response.ok) return { skipped: true, status: response.status };
    return safeJsonResponse(response, "Supermemory search");
  } catch (error) {
    return { skipped: true, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function writeSupermemory(payload: unknown): Promise<unknown> {
  try {
    const response = await fetch(`${supermemoryUrl}/v3/documents`, {
      method: "POST",
      headers: supermemoryHeaders(),
      body: JSON.stringify({
        content: localMemoryContent(payload),
        metadata: { source: "erroratlas" }
      }),
      redirect: "error"
    });
    if (!response.ok) return { skipped: true, status: response.status };
    return safeJsonResponse(response, "Supermemory write");
  } catch (error) {
    return { skipped: true, reason: error instanceof Error ? error.message : String(error) };
  }
}

function supermemoryHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(supermemoryKey ? { Authorization: `Bearer ${supermemoryKey}` } : {})
  };
}

function localMemoryContent(payload: unknown): string {
  const content = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return content.slice(0, 20000);
}

function sanitizeForRemote(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(sanitizeForRemote);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [redactText(key), sanitizeForRemote(entry)])
  );
}

function respond(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

function trustedApiUrl(value: string): string {
  const url = parseUrl(value, "ERRORATLAS_API_URL");
  const isLoopback = loopbackHost(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error("ERRORATLAS_API_URL must use HTTPS, except for loopback development URLs.");
  }
  return url.origin + url.pathname.replace(/\/$/, "");
}

function localServiceUrl(value: string): string {
  const url = parseUrl(value, "SUPERMEMORY_URL");
  if (!loopbackHost(url.hostname) || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("SUPERMEMORY_URL must point to a local loopback service.");
  }
  return url.origin + url.pathname.replace(/\/$/, "");
}

function parseUrl(value: string, name: string): URL {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) throw new Error("unsupported URL components");
    return url;
  } catch {
    throw new Error(`${name} must be a valid base URL without credentials, query, or fragment.`);
  }
}

function loopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "host.docker.internal";
}

async function safeJsonResponse(response: Response, label: string): Promise<unknown> {
  const text = await readBoundedText(response, 256 * 1024);
  if (!response.ok) return { error: "request_failed", service: label, status: response.status };
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: "invalid_response", service: label, status: response.status };
  }
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("Upstream response exceeded the safe size limit.");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Upstream response exceeded the safe size limit.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

await server.connect(new StdioServerTransport());

