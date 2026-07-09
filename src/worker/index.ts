import { buildPlaybookMarkdown, errorSignature, redactText, titleFromError } from "../shared/redaction";
import { faviconSvg, sequencePngBase64 } from "./assets";

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return buffer;
}
import { encryptSensitivePayload } from "./crypto";
import { clampLimit, handleError, html, json, options, randomToken, readJson, sha256Hex, text } from "./http";
import { configured, requireScope, resolveActor, supabaseRest } from "./supabase";
import type { Actor, Env, ResolutionPayload, SearchPayload } from "./types";
import { renderDashboardUi, renderLandingUi, renderLlmsTxt, renderSetupGuideUi } from "./ui";

const selectPlaybook = "id,org_id,approved_by,title,error_signature,language,framework,package_manager,root_cause,playbook_md,verification_command,risk,confidence,visibility,worked_count,failed_count,created_at";

const emptyDashboard = {
  agentKeys: [] as Array<Record<string, unknown>>
};

const missingSchemaDashboard = {
  ...emptyDashboard,
  setupWarning:
    "Your workspace storage is not initialized yet. Ask the workspace owner to finish setup, then refresh."
};

function isMissingSupabaseSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /404|not found|Could not find the table|relation .* does not exist|schema cache/i.test(message);
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
      return text(faviconSvg, 200, "image/svg+xml; charset=utf-8");
    }
    if (request.method === "GET" && (url.pathname === "/sequence.png" || url.pathname === "/public/sequence.png")) {
      return new Response(base64ToArrayBuffer(sequencePngBase64), {
        headers: {
          "cache-control": "public, max-age=86400",
          "content-type": "image/png",
        },
      });
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
          hasSupabaseUrl: Boolean(env.PUBLIC_SUPABASE_URL),
          hasSupabaseAnonKey: Boolean(env.PUBLIC_SUPABASE_ANON_KEY),
          hasSupabaseServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
          hasFieldEncryptionKey: Boolean(env.FIELD_ENCRYPTION_KEY),
          missing
        });
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        return json({
          ok: true,
          configured: configured(env),
          encryptionConfigured: Boolean(env.FIELD_ENCRYPTION_KEY),
          service: "erroratlas"
        });
      }

      if (request.method === "GET" && url.pathname === "/api/dashboard") {
        return getDashboard(env, request);
      }

      if (request.method === "GET" && url.pathname === "/api/playbooks") {
        return getPlaybooks(env, request);
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/playbooks/")) {
        return getPlaybook(env, request, url.pathname.split("/").at(-1) || "");
      }

      if (request.method === "POST" && url.pathname === "/api/search") {
        return search(env, request);
      }

      if (request.method === "POST" && url.pathname === "/api/agent-keys") {
        return createAgentKey(env, request, ctx);
      }

      if (request.method === "POST" && /^\/api\/agent-keys\/[^/]+\/rotate$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3] || "";
        return rotateAgentKey(env, request, ctx, id);
      }

      if (request.method === "POST" && url.pathname === "/api/incidents") {
        return createIncident(env, request, ctx);
      }

      if (request.method === "POST" && url.pathname === "/api/resolutions") {
        return createResolution(env, request, ctx);
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
  const actor = await resolveActor(env, request, false);
  const query = actor
    ? `playbooks?select=${selectPlaybook}&or=(visibility.eq.public,org_id.eq.${actor.orgId})&order=worked_count.desc&limit=50`
    : `playbooks?select=${selectPlaybook}&visibility=eq.public&order=worked_count.desc&limit=50`;
  const rows = configured(env) ? await supabaseRest<Array<Record<string, unknown>>>(env, query) : [];
  const playbooks = configured(env) ? await enrichPlaybookAuthors(env, rows) : [];
  return json({ playbooks });
}

async function getPlaybook(env: Env, request: Request, id: string): Promise<Response> {
  const actor = await resolveActor(env, request, false);
  const visibility = actor ? `or=(visibility.eq.public,org_id.eq.${actor.orgId})&` : "visibility=eq.public&";
  const rows = await supabaseRest<Array<Record<string, unknown>>>(
    env,
    `playbooks?select=${selectPlaybook}&${visibility}id=eq.${encodeURIComponent(id)}&limit=1`
  );
  const playbooks = await enrichPlaybookAuthors(env, rows);
  return json({ playbook: playbooks[0] || null });
}

async function search(env: Env, request: Request): Promise<Response> {
  const actor = await resolveActor(env, request, false);
  if (actor) requireScope(actor, "playbooks:read");

  const payload = await readJson<SearchPayload>(request);
  const query = [payload.query, payload.error, payload.stack, payload.framework, payload.language, payload.packageManager]
    .filter(Boolean)
    .join(" ");
  const limit = clampLimit(payload.limit, 8);

  if (!configured(env)) {
    return json({ query: redactText(query), results: [] });
  }

  const scopeFilter = actor
    ? `or=(visibility.eq.public,org_id.eq.${actor.orgId})`
    : "visibility=eq.public";
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
  if (!actor || actor.kind !== "human") return json({ error: "unauthorized", message: "Sign in before creating agent keys." }, 401);
  const body = await readJson<Record<string, unknown>>(request);
  const input: { projectId?: string; scopes?: string[] } = {};
  if (typeof body?.projectId === "string" && body.projectId.trim()) input.projectId = body.projectId;
  if (Array.isArray(body?.scopes)) input.scopes = body.scopes.filter((scope) => typeof scope === "string");
  const result = await insertAgentKey(env, actor, input);

  ctx.waitUntil(audit(env, actor, "agent_key.created", "agent_key", result.id));
  return json(result, 201);
}

async function rotateAgentKey(env: Env, request: Request, ctx: ExecutionContext, id: string): Promise<Response> {
  const actor = await resolveActor(env, request);
  if (!actor || actor.kind !== "human") {
    return json({ error: "unauthorized", message: "Sign in before rotating agent keys." }, 401);
  }

  const rows = await supabaseRest<Array<{ id: string; name: string; project_id?: string; scopes: string[] }>>(
    env,
    `agent_keys?select=id,name,project_id,scopes&org_id=eq.${actor.orgId}&id=eq.${encodeURIComponent(id)}&revoked_at=is.null&limit=1`
  );
  const current = rows[0];
  if (!current) return json({ error: "not_found", message: "Agent key was not found or already revoked." }, 404);

  await supabaseRest(env, `agent_keys?id=eq.${encodeURIComponent(current.id)}&org_id=eq.${actor.orgId}`, {
    method: "PATCH",
    body: JSON.stringify({
      revoked_at: new Date().toISOString(),
      revoked_by: actor.userId,
      revoked_reason: "rotated"
    })
  });

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
  actor: Actor,
  input: { projectId?: string; scopes?: string[]; rotatedFrom?: string }
): Promise<{ key: string; id: string; name: string; keyPrefix: string; scopes: string[] }> {
  const key = randomToken("ea_live");
  const hash = await sha256Hex(key);
  const allowedScopes = new Set(["playbooks:read", "incidents:write", "resolutions:publish"]);
  const requestedScopes = input.scopes?.filter((scope) => allowedScopes.has(scope)) || [];
  const scopes = requestedScopes.length ? requestedScopes : ["playbooks:read", "incidents:write", "resolutions:publish"];
  const name = `agent-${hash.slice(0, 8)}`;

  await revokeActiveAgentKeys(env, actor, input.rotatedFrom ? "rotated" : "replaced");

  const rows = await supabaseRest<Array<{ id: string }>>(env, "agent_keys", {
    method: "POST",
    body: JSON.stringify([
      {
        org_id: actor.orgId,
        project_id: input.projectId || null,
        created_by: actor.kind === "human" ? actor.userId : null,
        name,
        secret_hash: hash,
        key_prefix: key.slice(0, 14),
        rotated_from: input.rotatedFrom || null,
        scopes
      }
    ])
  });

  const id = rows[0]?.id;
  if (!id) throw new Error("Agent key was created, but no id was returned.");
  return { key, id, name, keyPrefix: key.slice(0, 14), scopes };
}

async function revokeActiveAgentKeys(env: Env, actor: Actor, reason: string): Promise<void> {
  await supabaseRest(env, `agent_keys?org_id=eq.${actor.orgId}&revoked_at=is.null`, {
    method: "PATCH",
    body: JSON.stringify({
      revoked_at: new Date().toISOString(),
      revoked_by: actor.kind === "human" ? actor.userId : null,
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

  const body = await readJson<Record<string, unknown>>(request);
  const error = String(body.error || body.title || "Untitled incident");
  const projectId = typeof body.projectId === "string" && body.projectId
    ? body.projectId
    : actor.kind === "agent"
      ? actor.projectId || null
      : null;
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
        signal_type: safeSignalType(body.signalType),
        language: body.language ? redactText(body.language) : null,
        framework: body.framework ? redactText(body.framework) : null,
        package_manager: body.packageManager ? redactText(body.packageManager) : null,
        command: body.command ? redactText(body.command).slice(0, 500) : null,
        exit_code: safeInteger(body.exitCode),
        dependency_versions: safeRecord(body.dependencyVersions),
        redacted_context: redactText(signalSummary(body)),
        encrypted_context: await encryptSensitivePayload(env, body),
        visibility: safeVisibility(body.visibility)
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

  const body = await readJson<ResolutionPayload>(request);
  const title = titleFromError(body.error);
  const signature = errorSignature(body.error);
  const playbookInput: Parameters<typeof buildPlaybookMarkdown>[0] = {
    title,
    error: body.error,
    rootCause: body.rootCause,
    finalFix: body.finalFix
  };
  if (body.failedAttempts) playbookInput.failedAttempts = body.failedAttempts;
  if (body.verification) playbookInput.verification = body.verification;
  if (body.framework) playbookInput.framework = body.framework;
  if (body.language) playbookInput.language = body.language;
  if (body.risk) playbookInput.risk = body.risk;
  if (body.confidence) playbookInput.confidence = body.confidence;
  const playbookMd = buildPlaybookMarkdown(playbookInput);

  const rows = await supabaseRest<Array<{ id: string }>>(env, "playbooks", {
    method: "POST",
    body: JSON.stringify([
      {
        org_id: actor.orgId,
        project_id: body.projectId || (actor.kind === "agent" ? actor.projectId : null),
        approved_by: actor.kind === "human" ? actor.userId : null,
        title,
        error_signature: signature,
        language: body.language ? redactText(body.language) : null,
        framework: body.framework ? redactText(body.framework) : null,
        package_manager: body.packageManager ? redactText(body.packageManager) : null,
        root_cause: redactText(body.rootCause),
        verification_command: body.verification ? redactText(body.verification) : null,
        playbook_md: playbookMd,
        risk: body.risk || "medium",
        confidence: body.confidence || "medium",
        visibility: body.visibility || "team"
      }
    ])
  });

  ctx.waitUntil(audit(env, actor, "resolution.published", "playbook", rows[0]?.id));
  return json({ status: "published", playbookId: rows[0]?.id }, 201);
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

function safeVisibility(value: unknown): "private" | "team" | "public" {
  return value === "private" || value === "public" || value === "team" ? value : "team";
}

function safeSignalType(value: unknown): string {
  return value === "failed_fix" || value === "verification" || value === "note" ? value : "error";
}

function safeInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function safeRecord(value: unknown): Record<string, string> {
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
