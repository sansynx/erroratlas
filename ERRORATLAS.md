# ErrorAtlas

## One-sentence description

ErrorAtlas gives coding agents durable debugging memory across sessions while keeping detailed project context local to the developer machine.

## Problem statement

Coding agents lose debugging memory between sessions. When an agent has already diagnosed and fixed an issue, a later agent session often repeats the same investigation, failed attempts, and context gathering. ErrorAtlas lets agents retrieve prior verified debugging knowledge before they begin again.

This is not a passive codebase scanner or terminal recorder. The coding agent intentionally searches, captures useful debugging signals, and publishes a resolution only after it verifies the fix.

## What ErrorAtlas does

1. An agent searches for a related error before changing code.
2. ErrorAtlas returns relevant local project memory and approved shared playbooks.
3. The agent investigates and fixes the issue.
4. The agent captures useful error context when it discovers a meaningful signal.
5. The agent publishes a reusable playbook after the fix is verified.
6. A future coding-agent session can retrieve that knowledge instead of rediscovering it.

```text
Developer gives a coding task to an agent
                    |
                    v
          Agent encounters an error
                    |
                    v
           search_error through MCP
             |                  |
             v                  v
    Supermemory local     Hosted ErrorAtlas
    private project       sanitized verified
    debugging memory      debugging playbooks
             |                  |
             +--------+---------+
                      v
          Agent investigates with context
                      |
                      v
                Agent verifies fix
                      |
          +-----------+------------+
          |                        |
          v                        v
capture_error_signal       publish_resolution
private/local signal        reusable hosted playbook
```

## End-to-end architecture

```text
Coding client: Codex, Cursor, Windsurf, OpenCode, Claude Code, or another MCP client
    |
    | Starts the configured local MCP process
    v
ErrorAtlas npm package
    |
    v
Local ErrorAtlas MCP server
    |                              |
    | localhost only               | HTTPS with MCP key
    v                              v
Supermemory local              ErrorAtlas Worker API
private project memory         hosted shared knowledge
    |                              |
    v                              v
.supermemory/                  Supabase
developer machine               hashed keys, sanitized incidents,
                                approved playbooks, encrypted payloads
```

## What the agent stores

### Local memory

Supermemory local stores richer, project-specific context on the developer machine. It can include useful private debugging notes and detailed context that should not become a shared playbook.

The local service runs at `http://localhost:6767` and stores project memory under `.supermemory/`.

### Hosted ErrorAtlas memory

ErrorAtlas stores reusable, sanitized debugging knowledge remotely. It stores structured signals rather than an arbitrary copy of the project.

Typical error signal fields:

```text
error message
stack summary
relevant context
failed command
exit code
language and framework
package manager
dependency versions
failed attempts
signal type and visibility
```

Typical verified-resolution fields:

```text
error
root cause
failed attempts
final fix
verification result
language and framework
risk and confidence
```

Before a value is sent remotely, ErrorAtlas redacts common credentials and local paths. Sensitive incident snapshots are encrypted before database storage.

## Example: how an agent creates memory

An agent is working in a TypeScript project and sees:

```text
Error: Cannot find module '@supabase/supabase-js'
Command: npm run build
Exit code: 1
```

### 1. Search first

The agent calls `search_error` with the error, command, package manager, and framework.

ErrorAtlas may return a previous playbook:

```text
Root cause: package.json and package-lock.json were out of sync after a partial merge.
Fix: npm install @supabase/supabase-js
Verification: npm run build
```

### 2. Capture useful debugging signal

If the agent confirms this is useful context, it calls `capture_error_signal`:

```json
{
  "error": "Cannot find module '@supabase/supabase-js'",
  "command": "npm run build",
  "exitCode": 1,
  "packageManager": "npm",
  "attemptedFixes": ["npm install", "checked package-lock.json"],
  "signalType": "error"
}
```

The detailed context can remain in Supermemory local. The hosted record receives only sanitized, bounded data.

### 3. Publish a verified resolution

After `npm install @supabase/supabase-js` and a successful build, the agent calls `publish_resolution`:

```json
{
  "error": "Cannot find module '@supabase/supabase-js'",
  "rootCause": "The dependency was missing from the lockfile after a partial merge.",
  "finalFix": "npm install @supabase/supabase-js",
  "verification": "npm run build passed",
  "risk": "low",
  "confidence": "high"
}
```

ErrorAtlas creates a searchable playbook. The next agent can retrieve it before spending another context window on the same issue.

## Gatekeeper: how shared knowledge stays clean

Agents do not write directly to the shared playbook collection. Every `publish_resolution` request first passes through the hosted ErrorAtlas Gatekeeper.

```text
Agent submits a verified, sanitized resolution
                    |
                    v
Gatekeeper normalizes the error, environment, root cause, and final fix
                    |
          +---------+---------+
          |                   |
          v                   v
Same canonical fix      New or competing fix
becomes evidence        becomes a candidate
          |                   |
          +---------+---------+
                    |
                    v
Only promoted canonical playbooks are searchable remotely
```

The Gatekeeper uses deterministic fingerprints, idempotency keys, and database transaction locks. It does not depend on an LLM to decide whether a record is a duplicate.

| Submission type | Gatekeeper result |
| --- | --- |
| Same error, environment, root cause, and final fix as a canonical playbook | Adds evidence and increases that playbook's trust count. No duplicate playbook is created. |
| New `private` or `team` verified fix | Publishes one canonical playbook for that scope. |
| First `public` verified fix | Stores a non-searchable candidate. |
| Same public fix from an independent MCP key, user, or project | Promotes it to a searchable public playbook. |
| Different fix for the same error | Keeps it as a separate candidate rather than overwriting another solution. |

Public candidates expire after 30 days if they are not independently confirmed. Raw candidates and evidence are never returned by agent search; agents receive canonical playbooks only.

## Authentication and key validation

Humans use the hosted dashboard to sign in and generate one MCP secret for their workspace.

The raw secret is shown once. ErrorAtlas stores only its SHA-256 hash.

For each agent request:

```text
Agent sends ERRORATLAS_API_KEY
             |
             v
Local MCP server sends X-ErrorAtlas-Key to ErrorAtlas
             |
             v
Worker hashes the supplied key
             |
             v
Worker finds a matching non-revoked stored hash
             |
             v
Worker checks the key scope
             |
             +--> missing, invalid, or revoked key: 401
             +--> missing permission: 403
             +--> valid scoped key: request continues
```

Key scopes are:

```text
playbooks:read
incidents:write
resolutions:publish
```

There is one active MCP key per workspace. Key rotation is transactional, so a failed replacement does not leave the workspace without a working key.

## Developer installation flow

```bash
npm install -D @sansynx/erroratlas
npx erroratlas init
```

The initializer creates only:

```text
.erroratlas/config.json
.erroratlas/instructions.md
.erroratlas/mcp.json.example
```

It does not modify `AGENTS.md`, `CLAUDE.md`, Cursor rules, Windsurf rules, or existing project instructions.

### Local sharing preference

`.erroratlas/config.json` is a local preference file, not a credentials file:

```json
{
  "defaultVisibility": "public"
}
```

This setting does not decide whether Supermemory is local or remote. Supermemory always keeps detailed project memory on the developer machine. It decides the sharing scope only when an agent calls `publish_resolution`, which writes a sanitized reusable resolution to hosted ErrorAtlas.

When an agent publishes a verified resolution without explicitly choosing visibility, ErrorAtlas uses this value.

| Value | Who can search the resulting playbook |
| --- | --- |
| `private` | Only the current project. |
| `team` | The developer's ErrorAtlas workspace. |
| `public` | The shared ErrorAtlas knowledge base, after two independent confirmations. This is the default. |

Use `private` when a fix should be reusable only in the current project. Use `team` when it should be reusable in the developer's workspace. Use `public` when the developer wants to propose the sanitized fix for the shared knowledge base. A public proposal is not searchable until ErrorAtlas receives an independent confirmation.

The file never contains an MCP key, Supabase credentials, a hosted API URL, or a Supermemory key. Hosted connection details and secrets come only from the MCP environment configuration.

The developer then runs Supermemory local and adds the supplied MCP configuration to their coding client.

## How this differs from MCP provided directly by coding platforms

MCP is a protocol, not memory.

Platform-provided MCP support answers this question:

> How can a coding client start a tool server and let an agent call tools?

ErrorAtlas answers a different question:

> What debugging knowledge should survive after this coding-agent session ends, and how should a future agent retrieve it safely?

| Platform MCP support | ErrorAtlas |
| --- | --- |
| Provides the protocol connection between an agent and tools. | Provides a debugging-memory product exposed through that protocol. |
| Usually gives the agent tools for the current session. | Preserves verified debugging knowledge across sessions. |
| Does not decide what error signals or fixes are worth remembering. | Defines structured capture and verified-resolution workflows. |
| Does not separate private local debugging context from shared reusable knowledge. | Keeps detailed project memory local and sends only sanitized reusable data remotely. |
| Is tied to the client that implements the MCP connection. | Works across MCP-compatible coding clients. |

ErrorAtlas does not replace a platform's MCP implementation. It uses that MCP implementation as the connection layer.

```text
Codex/Cursor/Windsurf/OpenCode MCP support
                    |
                    v
              ErrorAtlas MCP server
                    |
                    v
       Local private memory + hosted debugging memory
```

## Agent behavior

The coding client launches the local ErrorAtlas MCP server from its MCP configuration. The agent then discovers these tools:

```text
search_error
capture_error_signal
publish_resolution
get_playbook
```

The agent should:

1. Search before attempting a non-trivial fix.
2. Use the returned local and shared context to investigate.
3. Capture meaningful failures, not every minor event.
4. Publish only after a fix is verified.
5. Never send secrets, customer data, private URLs, full source files, or unnecessary absolute local paths remotely.

The generated `.erroratlas/instructions.md` communicates this workflow, but it does not override repository policy. Existing `AGENTS.md` and other project instructions remain higher priority.
