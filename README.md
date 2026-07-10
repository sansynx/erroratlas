# ErrorAtlas

ErrorAtlas is hosted debugging memory for coding agents.

Install the ErrorAtlas MCP client, generate one hosted MCP key, run Supermemory locally, and let your coding agent search or publish verified fixes without losing debugging context.

## Working flow

<p align="center">
  <img src="https://erroratlas.sansynx.workers.dev/sequence.png" alt="ErrorAtlas working flow" width="100%" height="auto">
</p>

```txt
1. Developer signs in at the hosted dashboard.
2. Dashboard generates one MCP key.
3. Developer installs @sansynx/erroratlas in their project.
4. Coding agent connects to the local ErrorAtlas MCP server.
5. MCP searches Supermemory local plus hosted ErrorAtlas fixes.
6. After a verified fix, MCP stores sanitized incidents and playbooks remotely.
```

## End-user flow

1. Open the hosted dashboard:

```txt
https://erroratlas.sansynx.workers.dev/dashboard
```

2. Sign in and click `Generate secret`.

Copy the MCP secret immediately. Existing raw secrets cannot be recovered later.

Every MCP request must include this active secret. ErrorAtlas hashes it before lookup, rejects missing, invalid, or revoked keys with `401`, and enforces the key's allowed scopes before reading or writing any memory.

3. Install ErrorAtlas in the project where the coding agent works:

```bash
npm install -D @sansynx/erroratlas
npx erroratlas init
```

4. Run Supermemory local:

```bash
OPENAI_API_KEY=your_model_provider_key
npx supermemory local --port 6767
```

Windows/WSL fallback:

```bash
export OPENAI_API_KEY=your_model_provider_key
PORT=6767 ~/.supermemory/bin/supermemory-server
```

5. Add the MCP server to the agent client:

```json
{
  "mcpServers": {
    "erroratlas": {
      "command": "npx",
      "args": ["-y", "--package", "@sansynx/erroratlas", "erroratlas", "mcp"],
      "env": {
        "ERRORATLAS_API_URL": "https://erroratlas.sansynx.workers.dev",
        "ERRORATLAS_API_KEY": "ea_live_from_dashboard",
        "SUPERMEMORY_URL": "http://localhost:6767"
      }
    }
  }
}
```

If Supermemory local prints an API key, also add:

```txt
SUPERMEMORY_API_KEY=optional_local_supermemory_key
```

## What the CLI creates

`npx erroratlas init` creates only an `.erroratlas` folder in the developer project:

```txt
.erroratlas/config.json
.erroratlas/instructions.md
.erroratlas/mcp.json.example
```

It does not edit `AGENTS.md`, `CLAUDE.md`, Cursor rules, Windsurf rules, or existing project instruction files.

### `config.json` default sharing

The generated `.erroratlas/config.json` controls only the default visibility for resolutions published by an agent:

```json
{
  "defaultVisibility": "public"
}
```

The developer chooses this policy once during setup. This setting does not move Supermemory data to the cloud: Supermemory always keeps detailed project memory locally. It controls only the sharing scope of a sanitized resolution after an agent calls `publish_resolution`.

- `private`: hosted resolution is reusable only by the current project.
- `team`: hosted resolution is reusable by the developer's workspace.
- `public`: hosted resolution is proposed for the shared ErrorAtlas knowledge base. This is the default. The first submission remains a non-searchable candidate until an independent agent, user, or project confirms the same verified solution.

`config.json` never contains MCP keys, API URLs, Supabase credentials, or Supermemory credentials.

## Gatekeeper

`publish_resolution` does not write directly to the shared search index. The hosted Gatekeeper normalizes the sanitized error, environment, root cause, and final fix, then handles the submission atomically.

- A match with an existing canonical fix becomes evidence and increases its trust count.
- A new `private` or `team` fix becomes a canonical playbook in that scope.
- The first `public` fix is a non-searchable candidate.
- A matching public submission from an independent MCP key, user, or project promotes the fix to the shared search index.
- A different fix for the same error remains a separate candidate.

The Gatekeeper uses deterministic fingerprints, idempotency keys, and database transaction locks. It does not rely on an LLM for duplicate decisions. Candidates expire after 30 days, and agent search returns canonical playbooks only.

## MCP tools

```txt
erroratlas.search_error
erroratlas.capture_error_signal
erroratlas.publish_resolution
erroratlas.get_playbook
```

## Storage model

- Supermemory local stores private project memory on the developer machine.
- ErrorAtlas remote stores sanitized searchable incidents and playbooks.
- Agent keys are shown once and stored remotely only as hashes.
- MCP search, capture, publication, and playbook reads require an active, scoped MCP key.
- Sensitive incident payload snapshots are encrypted before database insert.
- The npm client accepts hosted API overrides only from explicit environment configuration and requires Supermemory to stay on a loopback address.
- Remote request fields are size-limited and redacted before persistence; keep full project context in local Supermemory.
