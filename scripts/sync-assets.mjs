import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const favicon = readFileSync(join(root, "public", "favicon.svg"), "utf8");
const sequencePng = readFileSync(join(root, "public", "sequence.png")).toString("base64");

writeFileSync(
  join(root, "src", "worker", "assets.ts"),
  `export const faviconSvg = ${JSON.stringify(favicon)};\nexport const sequencePngBase64 = ${JSON.stringify(sequencePng)};\n`
);
