#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const command = process.argv[2] || "help";

if (command === "init") {
  init();
} else if (command === "mcp") {
  await import("../mcp/server.js");
} else {
  printHelp();
}

function printHelp(): void {
  console.log(`ErrorAtlas

Commands:
  init    create .erroratlas config and MCP template files
  mcp     start the ErrorAtlas MCP server over stdio
`);
}

function init(): void {
  const files = [
    [".erroratlas/config.json", template("config.json.example")],
    [".erroratlas/instructions.md", template("instructions.md")],
    [".erroratlas/mcp.json.example", template("mcp.json.example")]
  ] as const;

  for (const [target, body] of files) {
    writeIfMissing(join(root, target), body);
  }

  console.log(`Created ErrorAtlas project files:
- .erroratlas/config.json
- .erroratlas/instructions.md
- .erroratlas/mcp.json.example

No existing agent instruction file was modified.`);
}

function template(name: string): string {
  const projectTemplate = join(root, "templates", name);
  const packageTemplate = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates", name);

  if (existsSync(projectTemplate)) return readFileSync(projectTemplate, "utf8");
  return readFileSync(packageTemplate, "utf8");
}

function writeIfMissing(path: string, body: string): void {
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}
