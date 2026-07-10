#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
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
  const outputRoot = join(root, ".erroratlas");
  ensureSafeOutputRoot(outputRoot);
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
  const packageTemplate = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates", name);
  return readFileSync(packageTemplate, "utf8");
}

function writeIfMissing(path: string, body: string): void {
  try {
    writeFileSync(path, body, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") return;
    throw error;
  }
}

function ensureSafeOutputRoot(outputRoot: string): void {
  if (existsSync(outputRoot) && lstatSync(outputRoot).isSymbolicLink()) {
    throw new Error("Refusing to initialize through a symbolic .erroratlas directory.");
  }
  mkdirSync(outputRoot, { recursive: true });

  const realProject = realpathSync(root);
  const realOutput = realpathSync(outputRoot);
  const fromProject = relative(realProject, realOutput);
  if (fromProject.startsWith("..") || isAbsolute(fromProject)) {
    throw new Error("Refusing to initialize outside the current project.");
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
