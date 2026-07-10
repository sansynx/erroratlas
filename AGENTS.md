# ErrorAtlas Repository Instructions

## Mission

ErrorAtlas gives coding agents durable debugging memory across sessions.

The repository contains two products:

- A hosted Cloudflare Worker that serves the dashboard and protected API.
- A local npm MCP server that coding clients start inside developer projects.

## Architecture

```text
Coding client -> local ErrorAtlas MCP -> Supermemory local
                                      -> hosted ErrorAtlas Worker -> Supabase
```

- `src/worker`: Cloudflare Worker UI and API.
- `src/mcp`: local MCP server.
- `src/cli`: `erroratlas` initializer and MCP launcher.
- `src/shared`: redaction and playbook helpers.
- `supabase/schema.sql`: database schema and database functions.
- `templates`: files copied by `npx erroratlas init`.
- `public`: Worker static assets.
- `wrangler.jsonc`: Worker configuration and asset binding.
- `src/worker/worker-configuration.d.ts`: generated Wrangler runtime and binding types. Keep it committed and regenerate it after Worker binding changes.

## Product invariants

- The Worker is the hosted source of truth for keys, sanitized incidents, and approved playbooks.
- Supermemory remains local to the developer machine and is reachable only through a loopback URL.
- The local MCP server must not trust project configuration to override hosted API origins or send credentials to arbitrary URLs.
- Every agent API request requires an active MCP key.
- Store only a SHA-256 hash of an MCP secret. Show the raw secret once after creation or rotation.
- Keep exactly one active MCP key per workspace.
- Key replacement must remain transactional. A failed or concurrent rotation must not revoke a working replacement key.
- Enforce scopes before data access: `playbooks:read`, `incidents:write`, and `resolutions:publish`.
- Treat all debugging input as untrusted. Bound request sizes and redact credentials, private paths, and sensitive context before remote storage.
- Keep detailed project memory local. Remote records must be sanitized, structured, and reusable.

## Security rules

- Never commit secrets, API keys, account IDs, access tokens, `.dev.vars`, or generated local state.
- Do not weaken key hashing, revocation checks, scope checks, project-to-organization checks, or database constraints.
- Do not expose raw upstream Supabase errors to browser or MCP clients.
- Do not add public anonymous access to agent search, playbook reads, incident capture, or resolution publishing.
- Do not make the CLI modify `AGENTS.md`, `CLAUDE.md`, Cursor rules, Windsurf rules, or other existing project instruction files.

## Change checklist

When changing Worker bindings or `wrangler.jsonc`:

```bash
npm run cf-types
npm run build
```

When changing schema-dependent behavior:

1. Update `supabase/schema.sql`.
2. Update the Worker route and dashboard data shape as needed.
3. Preserve migration safety with idempotent `alter ... if exists` or `add column if not exists` statements.
4. Keep database functions safe for concurrent requests.

When changing npm onboarding:

1. Keep `npx erroratlas init` limited to `.erroratlas/` files.
2. Keep the package limited to the CLI, MCP server, shared code, templates, and README.
3. Do not ship Worker source, service-owner schema, local secrets, or static site assets in the npm tarball.

## Quality bar

- Preserve the existing dark/light visual language, concise copy, and responsive mobile navigation.
- Prefer one clean state over layered cards and nested boxes.
- Use the dotted loader for genuine loading states; do not show a configuration error before configuration has loaded.
- Keep public setup instructions practical: generate key, install package, run Supermemory local, configure MCP, verify with the agent.
