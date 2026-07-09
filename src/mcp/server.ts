#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildPlaybookMarkdown, errorSignature, redactText, titleFromError } from "../shared/redaction.js";

interface LocalConfig {
  apiUrl?: string;
  supermemoryUrl?: string;
  defaultVisibility?: "private" | "team" | "public";
}

function localConfig(): LocalConfig {
  const path = join(process.cwd(), ".erroratlas", "config.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as LocalConfig;
}

const config = localConfig();
const apiUrl = (process.env.ERRORATLAS_API_URL || config.apiUrl || "http://localhost:8787").replace(/\/$/, "");
const agentKey = process.env.ERRORATLAS_API_KEY || "";
const supermemoryUrl = (process.env.SUPERMEMORY_URL || config.supermemoryUrl || "http://localhost:6767").replace(/\/$/, "");
const supermemoryKey = process.env.SUPERMEMORY_API_KEY || "";

const server = new McpServer({
  name: "erroratlas",
  version: "0.1.0"
});

server.tool(
  "search_error",
  {
    error: z.string(),
    stack: z.string().optional(),
    command: z.string().optional(),
    exitCode: z.number().optional(),
    language: z.string().optional(),
    framework: z.string().optional(),
    packageManager: z.string().optional(),
    dependencyVersions: z.record(z.string()).optional(),
    limit: z.number().optional()
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
    error: z.string(),
    context: z.string().optional(),
    stack: z.string().optional(),
    attemptedFixes: z.array(z.string()).optional(),
    command: z.string().optional(),
    exitCode: z.number().optional(),
    language: z.string().optional(),
    framework: z.string().optional(),
    packageManager: z.string().optional(),
    dependencyVersions: z.record(z.string()).optional(),
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
  "record_incident",
  {
    error: z.string(),
    context: z.string().optional(),
    stack: z.string().optional(),
    attemptedFixes: z.array(z.string()).optional(),
    command: z.string().optional(),
    exitCode: z.number().optional(),
    language: z.string().optional(),
    framework: z.string().optional(),
    packageManager: z.string().optional(),
    dependencyVersions: z.record(z.string()).optional(),
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
    error: z.string(),
    rootCause: z.string(),
    finalFix: z.string(),
    failedAttempts: z.array(z.string()).optional(),
    verification: z.string().optional(),
    language: z.string().optional(),
    framework: z.string().optional(),
    packageManager: z.string().optional(),
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
      visibility: input.visibility || config.defaultVisibility || "team"
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
      headers: authHeaders()
    });
    return respond(await response.json());
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
    body: JSON.stringify(sanitizeForRemote(body))
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { status: response.status, body: text };
  }
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
      body: JSON.stringify({ q: query, limit: 5 })
    });
    if (!response.ok) return { skipped: true, status: response.status };
    return response.json();
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
      })
    });
    if (!response.ok) return { skipped: true, status: response.status };
    return response.json();
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

await server.connect(new StdioServerTransport());

