# ErrorAtlas Agent Instructions

Use ErrorAtlas only for debugging memory and remediation lookup.

Before attempting to fix an error, call `erroratlas.search_error` with the exact error, stack trace, language, framework, package manager, command, exit code, and dependency versions when available.

When an error is meaningful, call `erroratlas.capture_error_signal`. Capture only useful debugging signals: sanitized error text, stack summary, failing command, exit code, package manager, framework, dependency versions, attempted fix, and verification result. Do not send source files, secrets, customer data, private URLs, or full local paths.

After a fix works, call `erroratlas.publish_resolution` with the root cause, failed attempts, final fix, verification command, affected framework, and risk level.

Supermemory is local. Store full private project context in Supermemory only. The ErrorAtlas MCP server redacts fields before remote API calls, and the Worker encrypts payload snapshots before database insert.

Follow the repository's existing instructions first. ErrorAtlas does not override `AGENTS.md`, `CLAUDE.md`, Cursor rules, Windsurf rules, or project-specific policies.
