import { bearerToken, HttpError, sha256Hex } from "./http";
import type { Actor, AgentActor, Env, HumanActor } from "./types";

export function configured(env: Env): boolean {
  return Boolean(env.PUBLIC_SUPABASE_URL && env.PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY);
}

function baseUrl(env: Env): string {
  const url = env.PUBLIC_SUPABASE_URL;
  if (!url) throw new HttpError(503, "supabase_not_configured", "Supabase URL is not configured.");
  return url.replace(/\/$/, "");
}

export async function supabaseRest<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(503, "supabase_not_configured", "Supabase service role key is not configured.");
  }

  const response = await fetch(`${baseUrl(env)}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new HttpError(response.status, "supabase_error", detail || "Supabase request failed.");
  }

  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

interface UserProfile {
  user_id: string;
  username: string;
  display_name?: string | null;
  bio?: string | null;
}

async function getSupabaseUser(env: Env, request: Request): Promise<SupabaseUser | null> {
  const token = bearerToken(request);
  if (!token || token.startsWith("ea_")) return null;
  if (!env.PUBLIC_SUPABASE_ANON_KEY) return null;

  const response = await fetch(`${baseUrl(env)}/auth/v1/user`, {
    headers: {
      apikey: env.PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) return null;
  return (await response.json()) as SupabaseUser;
}

async function getOrCreateHumanActor(env: Env, user: SupabaseUser): Promise<HumanActor> {
  const profile = await ensureUserProfile(env, user);
  const existing = await supabaseRest<Array<{ org_id: string; role: string }>>(
    env,
    `organization_members?select=org_id,role&user_id=eq.${encodeURIComponent(user.id)}&limit=1`
  );

  if (existing[0]) {
    return {
      kind: "human",
      userId: user.id,
      ...(user.email ? { email: user.email } : {}),
      username: profile.username,
      ...(profile.display_name ? { displayName: profile.display_name } : {}),
      orgId: existing[0].org_id,
      role: existing[0].role
    };
  }

  const slug = `personal-${user.id.slice(0, 8)}`;
  const orgName = "Personal atlas";
  const orgId = await ensurePersonalOrg(env, slug, orgName);

  await supabaseRest(env, "organization_members", {
    method: "POST",
    body: JSON.stringify([{ org_id: orgId, user_id: user.id, role: "owner" }])
  });

  await ensureDefaultProject(env, orgId);

  return {
    kind: "human",
    userId: user.id,
    ...(user.email ? { email: user.email } : {}),
    username: profile.username,
    ...(profile.display_name ? { displayName: profile.display_name } : {}),
    orgId,
    role: "owner"
  };
}

async function ensurePersonalOrg(env: Env, slug: string, orgName: string): Promise<string> {
  try {
    const org = await supabaseRest<Array<{ id: string }>>(env, "organizations", {
      method: "POST",
      body: JSON.stringify([{ name: orgName, slug }])
    });

    const orgId = org[0]?.id;
    if (!orgId) throw new HttpError(500, "org_create_failed", "Could not create workspace.");
    return orgId;
  } catch (error) {
    if (!(error instanceof HttpError && /duplicate|unique|23505|409/i.test(error.message))) throw error;
    const existing = await supabaseRest<Array<{ id: string }>>(
      env,
      `organizations?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`
    );
    const orgId = existing[0]?.id;
    if (!orgId) throw error;
    return orgId;
  }
}

async function ensureDefaultProject(env: Env, orgId: string): Promise<void> {
  try {
    await supabaseRest(env, "projects", {
      method: "POST",
      body: JSON.stringify([{ org_id: orgId, name: "Default", slug: "default", visibility: "team" }])
    });
  } catch (error) {
    if (error instanceof HttpError && /duplicate|unique|23505|409/i.test(error.message)) return;
    throw error;
  }
}

async function ensureUserProfile(env: Env, user: SupabaseUser): Promise<UserProfile> {
  const existing = await supabaseRest<UserProfile[]>(
    env,
    `user_profiles?select=user_id,username,display_name,bio&user_id=eq.${encodeURIComponent(user.id)}&limit=1`
  );
  if (existing[0]) return existing[0];

  const base = usernameFromUser(user);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const username = `${base.slice(0, 32 - suffix.length)}${suffix}`;
    try {
      const rows = await supabaseRest<UserProfile[]>(env, "user_profiles", {
        method: "POST",
        body: JSON.stringify([
          {
            user_id: user.id,
            username,
            display_name: displayNameFromUser(user),
            bio: null
          }
        ])
      });
      if (rows[0]) return rows[0];
    } catch (error) {
      if (error instanceof HttpError && /duplicate|unique|23505/i.test(error.message)) continue;
      throw error;
    }
  }

  throw new HttpError(409, "username_unavailable", "Could not reserve a default username.");
}

function usernameFromUser(user: SupabaseUser): string {
  const metadata = user.user_metadata || {};
  const candidates = [
    metadata.user_name,
    metadata.preferred_username,
    metadata.name,
    user.email?.split("@")[0],
    `dev-${user.id.slice(0, 8)}`
  ];

  for (const candidate of candidates) {
    const username = normalizeUsername(candidate);
    if (username) return username;
  }

  return `dev-${user.id.slice(0, 8)}`;
}

function displayNameFromUser(user: SupabaseUser): string | null {
  const metadata = user.user_metadata || {};
  const raw = [metadata.full_name, metadata.name, metadata.user_name].find((value) => typeof value === "string" && value.trim());
  if (typeof raw !== "string") return null;
  return raw.replace(/\s+/g, " ").trim().slice(0, 80) || null;
}

export function normalizeUsername(value: unknown): string {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 32);

  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(cleaned)) return "";
  return cleaned;
}

async function getAgentActor(env: Env, request: Request): Promise<AgentActor | null> {
  const key = request.headers.get("X-ErrorAtlas-Key") || bearerToken(request);
  if (!key?.startsWith("ea_")) return null;

  const secretHash = await sha256Hex(key);
  const rows = await supabaseRest<
    Array<{ id: string; org_id: string; project_id?: string; scopes: string[] }>
  >(
    env,
    `agent_keys?select=id,org_id,project_id,scopes&secret_hash=eq.${encodeURIComponent(secretHash)}&revoked_at=is.null&limit=1`
  );

  const row = rows[0];
  if (!row) throw new HttpError(401, "invalid_agent_key", "Agent key is invalid or revoked.");

  await supabaseRest(env, `agent_keys?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ last_used_at: new Date().toISOString() })
  });

  return {
    kind: "agent",
    keyId: row.id,
    orgId: row.org_id,
    ...(row.project_id ? { projectId: row.project_id } : {}),
    scopes: row.scopes || []
  };
}

export async function resolveActor(env: Env, request: Request, required = true): Promise<Actor | null> {
  if (!configured(env)) {
    if (required) throw new HttpError(503, "supabase_not_configured", "Supabase is not configured.");
    return null;
  }

  const agent = await getAgentActor(env, request);
  if (agent) return agent;

  const user = await getSupabaseUser(env, request);
  if (user) return getOrCreateHumanActor(env, user);

  if (required) throw new HttpError(401, "unauthorized", "Sign in or provide an ErrorAtlas agent key.");
  return null;
}

export function requireScope(actor: Actor, scope: string): void {
  if (actor.kind === "human") return;
  if (!actor.scopes.includes(scope)) {
    throw new HttpError(403, "missing_scope", `Agent key requires ${scope}.`);
  }
}
