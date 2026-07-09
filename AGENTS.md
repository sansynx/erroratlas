# ErrorAtlas Agent Guide

Use these instructions when working inside this repository.

## Product rule

ErrorAtlas is a hosted debugging memory service for coding agents.

End users should not clone this repo, configure Supabase, deploy Cloudflare Workers, or manage service-owner secrets. End users only install the npm MCP package, generate one hosted MCP key, run Supermemory locally, and connect their coding agent.

## Architecture

- `src/worker` contains the hosted Cloudflare Worker UI and API.
- `src/mcp` contains the local MCP server used by coding agents.
- `src/cli` contains the `erroratlas` CLI used by the npm package.
- `src/shared` contains redaction and playbook utilities.
- `supabase/schema.sql` is the service-owner database source of truth.
- `templates` contains files copied into user projects by `npx erroratlas init`.
- `public` contains Worker-served assets.
- `scripts/sync-assets.mjs` bundles public assets for Worker routes.

## Hard rules

- Do not hardcode real secrets, tokens, Supabase keys, API keys, account IDs, or user credentials.
- Do not add fake dashboard data, fake heatmaps, fake audit events, or fake playbooks.
- Do not store raw project logs, source files, private URLs, local paths, or customer data in searchable remote fields.
- Keep full private project context local to Supermemory.
- Store only sanitized searchable fields remotely.
- Keep sensitive incident payload snapshots encrypted.
- Agent keys must be shown once and stored only as hashes.
- Keep exactly one active MCP key per workspace.
- The CLI must not modify user instruction files such as `AGENTS.md`, `CLAUDE.md`, Cursor rules, Windsurf rules, or project policy files.
- Do not reintroduce a public docs folder unless the user explicitly asks for documentation pages.

## CLI and templates

`src/cli` is required. It powers:

```txt
npx erroratlas init
erroratlas mcp
```

`templates` is required. The CLI copies these into a developer project:

```txt
.erroratlas/config.json
.erroratlas/instructions.md
.erroratlas/mcp.json.example
```

Keep templates beginner-safe and hosted-service oriented. They must not tell end users to create Supabase projects, deploy Workers, or clone this repo.

## UI rules

- Keep the dashboard focused on MCP key generation and rotation.
- Avoid nested boxes and raw markdown-looking blocks unless the user is copying code.
- Use compact spacing, smooth mobile navigation, and dark/light theme support.
- Loading states should use the dotted loader pattern.
- Landing page copy should stay concise and agent-focused.

## API and schema rules

When changing database shape:

- Update `supabase/schema.sql`.
- Update Worker API handlers in `src/worker/index.ts`.
- Update dashboard rendering in `src/worker/ui.ts` if the response shape changes.
- Preserve backward-safe `alter table ... add column if not exists` statements.

When changing public assets:

- Place files in `public`.
- Update `scripts/sync-assets.mjs` if a new asset must be served by the Worker.
- Run `npm run sync:assets` before expecting Worker asset routes to serve new content.

## Agent workflow

The MCP server should expose the core flow:

```txt
erroratlas.search_error
erroratlas.capture_error_signal
erroratlas.record_incident
erroratlas.publish_resolution
erroratlas.get_playbook
```

Before fixing a non-trivial error, agents should search ErrorAtlas. After a verified fix, agents should publish a resolution with root cause, failed attempts, final fix, verification, risk, and confidence.

## Validation

Useful maintainer commands:

```bash
npm run sync:assets
npm run build
npm run dev
npm run test:e2e
```

Run validation before release or when explicitly asked.
