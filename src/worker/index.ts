import { buildPlaybookMarkdown, errorSignature, redactText, titleFromError } from "../shared/redaction";
import { z } from "zod";
import { encryptSensitivePayload } from "./crypto";
import { clampLimit, handleError, html, HttpError, json, options, randomToken, readJson, sha256Hex, text } from "./http";
import { configured, requireScope, resolveActor, supabaseRest } from "./supabase";
import type { Actor, Env, HumanActor } from "./types";
import { renderDashboardUi, renderLandingUi, renderLlmsTxt, renderSetupGuideUi } from "./ui";

const selectPlaybook = "id,org_id,approved_by,title,error_signature,language,framework,package_manager,root_cause,playbook_md,verification_command,risk,confidence,visibility,worked_count,failed_count,created_at";
const uuid = z.string().uuid();
const shortText = z.string().max(240);
const longText = z.string().trim().min(1).max(12_000);
const optionalLongText = z.string().max(12_000).optional();
const dependencyVersions = z.record(z.string().max(120)).refine((value) => Object.keys(value).length <= 50);
const searchSchema = z.object({
  query: optionalLongText,
  error: optionalLongText,
  stack: optionalLongText,
  language: shortText.optional(),
  framework: shortText.optional(),
  packageManager: shortText.optional(),
  limit: z.number().int().min(1).max(20).optional()
}).strict();
const agentKeySchema = z.object({
  projectId: uuid.optional(),
  scopes: z.array(z.enum(["playbooks:read", "incidents:write", "resolutions:publish"])).max(3).optional()
}).strict();
const incidentSchema = z.object({
  error: longText,
  context: optionalLongText,
  stack: optionalLongText,
  attemptedFixes: z.array(z.string().max(2_000)).max(20).optional(),
  command: z.string().max(500).optional(),
  exitCode: z.number().int().optional(),
  language: shortText.optional(),
  framework: shortText.optional(),
  packageManager: shortText.optional(),
  dependencyVersions: dependencyVersions.optional(),
  signalType: z.enum(["error", "failed_fix", "verification", "note"]).optional(),
  visibility: z.enum(["private", "team", "public"]).optional(),
  projectId: uuid.optional()
}).strict();
const resolutionSchema = z.object({
  error: longText,
  rootCause: longText,
  finalFix: longText,
  failedAttempts: z.array(z.string().max(2_000)).max(20).optional(),
  verification: longText,
  language: shortText.optional(),
  framework: shortText.optional(),
  packageManager: shortText.optional(),
  visibility: z.enum(["private", "team", "public"]).optional(),
  risk: z.enum(["low", "medium", "high"]).optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  projectId: uuid.optional()
}).strict();

const emptyDashboard = {
  agentKeys: [] as Array<Record<string, unknown>>
};

const missingSchemaDashboard = {
  ...emptyDashboard,
  setupWarning:
    "Your workspace storage is not initialized yet. Ask the workspace owner to finish setup, then refresh."
};

function isMissingSupabaseSchema(error: unknown): boolean {
  return error instanceof HttpError && error.code === "storage_schema_missing";
}

async function serveAsset(env: Env, request: Request, pathname: string): Promise<Response> {
  const assetUrl = new URL(pathname, request.url);
  return env.ASSETS.fetch(new Request(assetUrl, request));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") return options();

    try {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/") {
        return html(renderLandingUi(env));
      }

      if (request.method === "GET" && (url.pathname === "/favicon.svg" || url.pathname === "/public/favicon.svg")) {
        return await serveAsset(env, request, "/favicon.svg");
      }
      if (request.method === "GET" && (url.pathname === "/sequence.png" || url.pathname === "/public/sequence.png")) {
        return await serveAsset(env, request, "/sequence.png");
      }

      if (request.method === "GET" && url.pathname === "/setup") {
        return html(renderSetupGuideUi(env, url.origin));
      }

      if (request.method === "GET" && (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/"))) {
        return html(renderDashboardUi(env));
      }

      if (request.method === "GET" && url.pathname === "/llms.txt") {
        return text(renderLlmsTxt(url.origin));
      }

      if (request.method === "GET" && url.pathname === "/api/config") {
        const missing = [
          env.PUBLIC_SUPABASE_URL ? "" : "PUBLIC_SUPABASE_URL",
          env.PUBLIC_SUPABASE_ANON_KEY ? "" : "PUBLIC_SUPABASE_ANON_KEY",
          env.SUPABASE_SERVICE_ROLE_KEY ? "" : "SUPABASE_SERVICE_ROLE_KEY",
          env.FIELD_ENCRYPTION_KEY ? "" : "FIELD_ENCRYPTION_KEY"
        ].filter(Boolean);
        return json({
          appName: env.APP_NAME || "ErrorAtlas",
          supabaseUrl: env.PUBLIC_SUPABASE_URL || "",
          supabaseAnonKey: env.PUBLIC_SUPABASE_ANON_KEY || "",
          ready: missing.length === 0,
          missing
        });
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        return json({
          ok: true,
          service: "erroratlas"
        });
      }

      if (request.method === "GET" && url.pathname === "/api/dashboard") {
        return await getDashboard(env, request);
      }

      if (request.method === "GET" && url.pathname === "/api/playbooks") {
        return await getPlaybooks(env, request);
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/playbooks/")) {
        return await getPlaybook(env, request, url.pathname.split("/").at(-1) || "");
      }

      if (request.method === "POST" && url.pathname === "/api/search") {
        return await search(env, request);
      }

      if (request.method === "POST" && url.pathname === "/api/agent-keys") {
        return await createAgentKey(env, request, ctx);
      }

      if (request.method === "POST" && /^\/api\/agent-keys\/[^/]+\/rotate$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3] || "";
        return await rotateAgentKey(env, request, ctx, id);
      }

      if (request.method === "POST" && url.pathname === "/api/incidents") {
        return await createIncident(env, request, ctx);
      }

      if (request.method === "POST" && url.pathname === "/api/resolutions") {
        return await createResolution(env, request, ctx);
      }

      return json({ error: "not_found" }, 404);
    } catch (error) {
      return handleError(error);
    }
  }
};

async function getDashboard(env: Env, request: Request): Promise<Response> {
  if (!configured(env)) {
    return json({
      ...emptyDashboard,
      setupWarning: "This ErrorAtlas workspace is not connected yet. Finish workspace setup before using the dashboard."
    });
  }
  try {
    const actor = await resolveActor(env, request);
    if (!actor || actor.kind !== "human") return json({ error: "unauthorized", message: "Sign in to view the dashboard." }, 401);
    const agentKeys = await supabaseRest<Array<Record<string, unknown>>>(
      env,
      `agent_keys?select=id,name,key_prefix,created_at&org_id=eq.${actor.orgId}&revoked_at=is.null&order=created_at.desc&limit=20`
    );
    await revokeStaleAgentKeys(env, actor, agentKeys);

    return json({ agentKeys: agentKeys.slice(0, 1) });
  } catch (error) {
    if (isMissingSupabaseSchema(error)) return json(missingSchemaDashboard);
    throw error;
  }
}

async function getPlaybooks(env: Env, request: Request): Promise<Response> {
  const actor = await resolveActor(env, request);
  if (!actor) throw new HttpError(401, "invalid_agent_key", "An active MCP key is required.");
  requireScope(actor, "playbooks:read");
  const query = `playbooks?select=${selectPlaybook}&or=(visibility.eq.public,org_id.eq.${actor.orgId})&order=worked_count.desc&limit=50`;
  const rows = configured(env) ? await supabaseRest<Array<Record<string, unknown>>>(env, query) : [];
  const playbooks = configured(env) ? await enrichPlaybookAuthors(env, rows) : [];
  return json({ playbooks });
}

async function getPlaybook(env: Env, request: Request, id: string): Promise<Response> {
  const actor = await resolveActor(env, request);
  if (!actor) throw new HttpError(401, "invalid_agent_key", "An active MCP key is required.");
  requireScope(actor, "playbooks:read");
  if (!uuid.safeParse(id).success) throw new HttpError(400, "invalid_playbook_id", "Playbook id must be a UUID.");
  const visibility = `or=(visibility.eq.public,org_id.eq.${actor.orgId})&`;
  const rows = await supabaseRest<Array<Record<string, unknown>>>(
    env,
    `playbooks?select=${selectPlaybook}&${visibility}id=eq.${encodeURIComponent(id)}&limit=1`
  );
  const playbooks = await enrichPlaybookAuthors(env, rows);
  return json({ playbook: playbooks[0] || null });
}

async function search(env: Env, request: Request): Promise<Response> {
  const actor = await resolveActor(env, request);
  if (!actor) throw new HttpError(401, "invalid_agent_key", "An active MCP key is required.");
  requireScope(actor, "playbooks:read");

  const payload = parseInput(searchSchema, await readJson<unknown>(request));
  const query = [payload.query, payload.error, payload.stack, payload.framework, payload.language, payload.packageManager]
    .filter(Boolean)
    .join(" ");
  const limit = clampLimit(payload.limit, 8);

  if (!configured(env)) {
    return json({ query: redactText(query), results: [] });
  }

  const scopeFilter = `or=(visibility.eq.public,org_id.eq.${actor.orgId})`;
  const rows = await supabaseRest<Array<Record<string, unknown>>>(
    env,
    `playbooks?select=${selectPlaybook}&${scopeFilter}&limit=100`
  );

  const results = await enrichPlaybookAuthors(env, rank(rows, query).slice(0, limit));
  return json({
    query: redactText(query),
    scope: actor ? "workspace_and_public" : "public",
    results
  });
}

async function createAgentKey(env: Env, request: Request, ctx: ExecutionContext): Promise<Response> {
  const actor = await resolveActor(env, request);
  requireKeyManager(actor);
  const body = parseInput(agentKeySchema, await readJson<unknown>(request));
  const input: { projectId?: string; scopes?: string[] } = {};
  const projectId = await authorizedProjectId(env, actor, body.projectId);
  if (projectId) input.projectId = projectId;
  if (body.scopes) input.scopes = body.scopes;
  const result = await insertAgentKey(env, actor, input);

  ctx.waitUntil(audit(env, actor, "agent_key.created", "agent_key", result.id));
  return json(result, 201);
}

async function rotateAgentKey(env: Env, request: Request, ctx: ExecutionContext, id: string): Promise<Response> {
  const actor = await resolveActor(env, request);
  requireKeyManager(actor);

  const rows = await supabaseRest<Array<{ id: string; name: string; project_id?: string; scopes: string[] }>>(
    env,
    `agent_keys?select=id,name,project_id,scopes&org_id=eq.${actor.orgId}&id=eq.${encodeURIComponent(id)}&revoked_at=is.null&limit=1`
  );
  const current = rows[0];
  if (!current) return json({ error: "not_found", message: "Agent key was not found or already revoked." }, 404);

  const rotateInput: { projectId?: string; scopes?: string[]; rotatedFrom?: string } = {
    scopes: current.scopes,
    rotatedFrom: current.id
  };
  if (current.project_id) rotateInput.projectId = current.project_id;

  const result = await insertAgentKey(env, actor, rotateInput);

  ctx.waitUntil(audit(env, actor, "agent_key.rotated", "agent_key", result.id));
  return json(result, 201);
}

async function insertAgentKey(
  env: Env,
  actor: HumanActor,
  input: { projectId?: string; scopes?: string[]; rotatedFrom?: string }
): Promise<{ key: string; id: string; name: string; keyPrefix: string; scopes: string[] }> {
  const key = randomToken("ea_live");
  const hash = await sha256Hex(key);
  const allowedScopes = new Set(["playbooks:read", "incidents:write", "resolutions:publish"]);
  const requestedScopes = input.scopes?.filter((scope) => allowedScopes.has(scope)) || [];
  const scopes = requestedScopes.length ? requestedScopes : ["playbooks:read", "incidents:write", "resolutions:publish"];
  const name = `agent-${hash.slice(0, 8)}`;

  const rows = await supabaseRest<Array<{ id: string }>>(env, "rpc/replace_active_agent_key", {
    method: "POST",
    body: JSON.stringify({
      p_org_id: actor.orgId,
      p_project_id: input.projectId || null,
      p_created_by: actor.userId,
      p_name: name,
      p_secret_hash: hash,
      p_key_prefix: key.slice(0, 14),
      p_scopes: scopes,
      p_rotated_from: input.rotatedFrom || null
    })
  });

  const id = rows[0]?.id;
  if (!id) throw new Error("Agent key was created, but no id was returned.");
  return { key, id, name, keyPrefix: key.slice(0, 14), scopes };
}

async function revokeActiveAgentKeys(env: Env, actor: HumanActor, reason: string): Promise<void> {
  await supabaseRest(env, `agent_keys?org_id=eq.${actor.orgId}&revoked_at=is.null`, {
    method: "PATCH",
    body: JSON.stringify({
      revoked_at: new Date().toISOString(),
      revoked_by: actor.userId,
      revoked_reason: reason
    })
  });
}

async function revokeStaleAgentKeys(env: Env, actor: Actor, keys: Array<Record<string, unknown>>): Promise<void> {
  const staleIds = keys
    .slice(1)
    .map((key) => (typeof key.id === "string" ? key.id : ""))
    .filter(Boolean);
  if (!staleIds.length) return;

  await supabaseRest(env, `agent_keys?org_id=eq.${actor.orgId}&id=in.(${staleIds.map(encodeURIComponent).join(",")})`, {
    method: "PATCH",
    body: JSON.stringify({
      revoked_at: new Date().toISOString(),
      revoked_by: actor.kind === "human" ? actor.userId : null,
      revoked_reason: "single_active_key_cleanup"
    })
  });
}

async function createIncident(env: Env, request: Request, ctx: ExecutionContext): Promise<Response> {
  const actor = await resolveActor(env, request);
  if (!actor) return json({ error: "unauthorized", message: "Sign in or provide an agent key before recording incidents." }, 401);
  if (actor) requireScope(actor, "incidents:write");

  const body = parseInput(incidentSchema, await readJson<unknown>(request));
  const error = body.error;
  const projectId = await authorizedProjectId(env, actor, body.projectId);
  const rows = await supabaseRest<Array<{ id: string }>>(env, "incidents", {
    method: "POST",
    body: JSON.stringify([
      {
        org_id: actor.orgId,
        project_id: projectId,
        created_by: actor.kind === "human" ? actor.userId : null,
        created_by_agent_key: actor.kind === "agent" ? actor.keyId : null,
        title: titleFromError(error),
        error_signature: errorSignature(error),
        signal_type: body.signalType || "error",
        language: body.language ? redactText(body.language) : null,
        framework: body.framework ? redactText(body.framework) : null,
        package_manager: body.packageManager ? redactText(body.packageManager) : null,
        command: body.command ? redactText(body.command).slice(0, 500) : null,
        exit_code: body.exitCode ?? null,
        dependency_versions: safeRecord(body.dependencyVersions),
        redacted_context: redactText(signalSummary(body)),
        encrypted_context: await encryptSensitivePayload(env, body),
        visibility: body.visibility || "team"
      }
    ])
  });

  ctx.waitUntil(audit(env, actor, "incident.created", "incident", rows[0]?.id));
  return json({ incidentId: rows[0]?.id, signalId: rows[0]?.id }, 201);
}

async function createResolution(env: Env, request: Request, ctx: ExecutionContext): Promise<Response> {
  const actor = await resolveActor(env, request);
  if (!actor) return json({ error: "unauthorized", message: "Sign in or provide an agent key before publishing resolutions." }, 401);
  if (actor) requireScope(actor, "resolutions:publish");

  const body = parseInput(resolutionSchema, await readJson<unknown>(request));
  const projectId = await authorizedProjectId(env, actor, body.projectId);
  const error = redactText(body.error);
  const rootCause = redactText(body.rootCause);
  const finalFix = redactText(body.finalFix);
  const verification = redactText(body.verification);
  const failedAttempts = body.failedAttempts?.map(redactText);
  const language = body.language ? redactText(body.language) : null;
  const framework = body.framework ? redactText(body.framework) : null;
  const packageManager = body.packageManager ? redactText(body.packageManager) : null;
  const title = titleFromError(error);
  const signature = errorSignature(error);
  const playbookInput: Parameters<typeof buildPlaybookMarkdown>[0] = {
    title,
    error,
    rootCause,
    finalFix
  };
  if (failedAttempts) playbookInput.failedAttempts = failedAttempts;
  playbookInput.verification = verification;
  if (framework) playbookInput.framework = framework;
  if (language) playbookInput.language = language;
  if (body.risk) playbookInput.risk = body.risk;
  if (body.confidence) playbookInput.confidence = body.confidence;
  const playbookMd = buildPlaybookMarkdown(playbookInput);

  const visibility = body.visibility || "public";
  const errorFingerprint = await fingerprint(signature, language, framework, packageManager);
  const environmentFingerprint = await fingerprint(language, framework, packageManager);
  const solutionFingerprint = await fingerprint(rootCause, finalFix);
  const idempotencyKey = await fingerprint(actor.kind, actor.kind === "agent" ? actor.keyId : actor.userId, errorFingerprint, environmentFingerprint, solutionFingerprint);
  const rows = await supabaseRest<Array<GatekeeperResult>>(env, "rpc/gatekeep_resolution_submission", {
    method: "POST",
    body: JSON.stringify({
      p_org_id: actor.orgId,
      p_project_id: projectId,
      p_submitted_by: actor.kind === "human" ? actor.userId : null,
      p_submitted_by_agent_key: actor.kind === "agent" ? actor.keyId : null,
      p_title: title,
      p_error_signature: signature,
      p_error_fingerprint: errorFingerprint,
      p_environment_fingerprint: environmentFingerprint,
      p_solution_fingerprint: solutionFingerprint,
      p_language: language,
      p_framework: framework,
      p_package_manager: packageManager,
      p_root_cause: rootCause,
      p_failed_attempts: failedAttempts || [],
      p_final_fix: finalFix,
      p_verification: verification,
      p_playbook_md: playbookMd,
      p_encrypted_payload: await encryptSensitivePayload(env, body),
      p_risk: body.risk || "medium",
      p_confidence: body.confidence || "medium",
      p_visibility: visibility,
      p_idempotency_key: idempotencyKey
    })
  });

  const result = rows[0];
  if (!result) throw new HttpError(502, "gatekeeper_unavailable", "The resolution gatekeeper did not return a result.");
  ctx.waitUntil(audit(env, actor, `resolution.${result.outcome}`, result.playbook_id ? "playbook" : "submission", result.playbook_id || result.submission_id));
  return json({
    status: result.outcome,
    playbookId: result.playbook_id,
    candidateId: result.submission_id,
    confirmationCount: result.confirmation_count
  }, result.outcome === "pending_confirmation" ? 202 : 201);
}

function rank(rows: Array<Record<string, unknown>>, query: string): Array<Record<string, unknown>> {
  const terms = redactText(query)
    .toLowerCase()
    .split(/[^a-z0-9_@.-]+/)
    .filter((term) => term.length > 2);

  return rows
    .map((row) => {
      const haystack = [
        row.title,
        row.error_signature,
        row.framework,
        row.language,
        row.root_cause,
        row.playbook_md
      ]
        .join(" ")
        .toLowerCase();
      const overlap = terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
      const trust = Number(row.worked_count || 0) - Number(row.failed_count || 0);
      return { ...row, score: overlap * 10 + trust };
    })
    .sort((a, b) => Number(b.score) - Number(a.score));
}

async function enrichPlaybookAuthors(env: Env, rows: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
  if (!rows.length) return [];

  const orgIds = Array.from(new Set(rows.map((row) => String(row.org_id || "")).filter(Boolean)));
  const directUserIds = new Set(rows.map((row) => String(row.approved_by || "")).filter(Boolean));
  const ownerByOrg = new Map<string, string>();

  if (orgIds.length) {
    const owners = await supabaseRest<Array<{ org_id: string; user_id: string }>>(
      env,
      `organization_members?select=org_id,user_id&role=eq.owner&org_id=in.(${orgIds.map(encodeURIComponent).join(",")})`
    );
    for (const owner of owners) {
      if (!ownerByOrg.has(owner.org_id)) ownerByOrg.set(owner.org_id, owner.user_id);
      directUserIds.add(owner.user_id);
    }
  }

  const profileByUser = new Map<string, string>();
  const userIds = Array.from(directUserIds);
  if (userIds.length) {
    const profiles = await supabaseRest<Array<{ user_id: string; username: string }>>(
      env,
      `user_profiles?select=user_id,username&user_id=in.(${userIds.map(encodeURIComponent).join(",")})`
    );
    for (const profile of profiles) profileByUser.set(String(profile.user_id), profile.username);
  }

  return rows.map((row) => {
    const authorId = String(row.approved_by || ownerByOrg.get(String(row.org_id || "")) || "");
    const username = authorId ? profileByUser.get(authorId) : null;
    const { org_id: _orgId, approved_by: _approvedBy, ...safeRow } = row;
    return {
      ...safeRow,
      author: username ? { username } : null
    };
  });
}

function safeRecord(value: Record<string, string> | undefined): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 50)
      .map(([key, entry]) => [redactText(key).slice(0, 80), redactText(entry).slice(0, 240)])
  );
}

function signalSummary(body: Record<string, unknown>): Record<string, unknown> {
  return {
    error: body.error,
    stack: body.stack,
    context: body.context,
    attemptedFixes: body.attemptedFixes,
    command: body.command,
    exitCode: body.exitCode,
    packageManager: body.packageManager,
    framework: body.framework,
    language: body.language,
    dependencyVersions: body.dependencyVersions
  };
}

function parseInput<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, "invalid_request", "Request fields are missing, invalid, or too large.");
  }
  return parsed.data;
}

interface GatekeeperResult {
  outcome: "duplicate_evidence" | "promoted" | "pending_confirmation" | "workspace_published";
  playbook_id: string | null;
  submission_id: string;
  confirmation_count: number;
}

async function fingerprint(...parts: Array<string | null | undefined>): Promise<string> {
  const normalized = parts
    .map((part) => redactText(part || "").toLowerCase().replace(/\s+/g, " ").trim())
    .join("\u001f");
  return sha256Hex(normalized);
}

function requireKeyManager(actor: Actor | null): asserts actor is HumanActor {
  if (!actor || actor.kind !== "human") {
    throw new HttpError(401, "unauthorized", "Sign in before managing MCP keys.");
  }
  if (actor.role !== "owner" && actor.role !== "admin") {
    throw new HttpError(403, "forbidden", "Only workspace owners and admins can manage MCP keys.");
  }
}

async function authorizedProjectId(env: Env, actor: Actor, requested?: string): Promise<string | null> {
  if (actor.kind === "agent" && actor.projectId) {
    if (requested && requested !== actor.projectId) {
      throw new HttpError(403, "project_scope_violation", "Agent key cannot access a different project.");
    }
    return actor.projectId;
  }
  if (!requested) return null;

  const rows = await supabaseRest<Array<{ id: string }>>(
    env,
    `projects?select=id&id=eq.${encodeURIComponent(requested)}&org_id=eq.${actor.orgId}&limit=1`
  );
  if (!rows[0]) throw new HttpError(404, "project_not_found", "Project was not found in this workspace.");
  return rows[0].id;
}

async function audit(env: Env, actor: Actor | null, eventName: string, targetType?: string, targetId?: string): Promise<void> {
  if (!configured(env)) return;
  await supabaseRest(env, "audit_events", {
    method: "POST",
    body: JSON.stringify([
      {
        org_id: actor?.orgId || null,
        actor_user_id: actor?.kind === "human" ? actor.userId : null,
        actor_agent_key_id: actor?.kind === "agent" ? actor.keyId : null,
        event_name: eventName,
        target_type: targetType || null,
        target_id: targetId || null
      }
    ])
  });
}
