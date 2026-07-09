# ErrorAtlas

ErrorAtlas is hosted debugging memory for coding agents.

Install the ErrorAtlas MCP client, generate one hosted MCP key, run Supermemory locally, and let your coding agent search or publish verified fixes without losing debugging context.

## Working flow

<p align="center">
  <img src="https://erroratlas.sansynx.workers.dev/public/sequence.png" alt="ErrorAtlas working flow" width="100%">
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

## MCP tools

```txt
erroratlas.search_error
erroratlas.capture_error_signal
erroratlas.record_incident
erroratlas.publish_resolution
erroratlas.get_playbook
```

## Storage model

- Supermemory local stores private project memory on the developer machine.
- ErrorAtlas remote stores sanitized searchable incidents and playbooks.
- Agent keys are shown once and stored remotely only as hashes.
- Sensitive incident payload snapshots are encrypted before database insert.
