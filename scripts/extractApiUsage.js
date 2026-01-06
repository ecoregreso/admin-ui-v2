import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "docs");
const OUT_FILE = path.join(OUT_DIR, "api-used-by-ui.json");

const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git"]);

function buildLineIndex(text) {
  const lineStarts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") lineStarts.push(i + 1);
  }
  return lineStarts;
}

function lineAt(lineStarts, index) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (lineStarts[mid] <= index) {
      if (mid === lineStarts.length - 1 || lineStarts[mid + 1] > index) {
        return mid + 1;
      }
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return 1;
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...(await listFiles(full)));
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function extractApiPath(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (/^https?:\/\//i.test(value)) return null;
  if (!value.startsWith("/api")) return null;
  const normalized = value;
  if (
    normalized === "/api" ||
    normalized === "/api/" ||
    normalized === "/api/v1" ||
    normalized === "/api/v1/"
  ) {
    return null;
  }
  return normalized;
}

function addEntry(out, seen, entry) {
  const key = `${entry.method}|${entry.path}|${entry.source}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(entry);
}

async function main() {
  const files = await listFiles(SRC_DIR);
  const results = [];
  const seen = new Set();

  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    const source = await fs.readFile(file, "utf8");
    const lineStarts = buildLineIndex(source);

    const axiosRegex =
      /(?:\baxios\b|\bapi\b)\s*\.\s*(get|post|put|delete|patch|options)\s*\(\s*([`'"])([\s\S]*?)\2/g;
    for (const match of source.matchAll(axiosRegex)) {
      const rawPath = extractApiPath(match[3]);
      if (!rawPath) continue;
      const line = lineAt(lineStarts, match.index || 0);
      addEntry(results, seen, {
        method: String(match[1] || "ANY").toUpperCase(),
        path: rawPath,
        source: `${relPath}:${line}`,
        notes: "axios call",
      });
    }

    const axiosRequestRegex =
      /(?:\baxios\b|\bapi\b)\s*\.\s*request\s*\(\s*\{[\s\S]*?\}\s*\)/g;
    for (const match of source.matchAll(axiosRequestRegex)) {
      const snippet = match[0];
      const urlMatch = snippet.match(/url\s*:\s*([`'"])([\s\S]*?)\1/);
      const methodMatch = snippet.match(/method\s*:\s*([`'"])(\w+)\1/i);
      const rawPath = extractApiPath(urlMatch?.[2]);
      if (!rawPath) continue;
      const line = lineAt(lineStarts, match.index || 0);
      addEntry(results, seen, {
        method: methodMatch ? methodMatch[2].toUpperCase() : "ANY",
        path: rawPath,
        source: `${relPath}:${line}`,
        notes: methodMatch ? "axios request options" : "axios request (method unknown)",
      });
    }

    const fetchRegex =
      /fetch\s*\(\s*([`'"])([\s\S]*?)\1/g;
    for (const match of source.matchAll(fetchRegex)) {
      const rawPath = extractApiPath(match[2]);
      if (!rawPath) continue;
      const window = source.slice(match.index || 0, (match.index || 0) + 400);
      const methodMatch = window.match(/method\s*:\s*([`'"])(\w+)\1/i);
      const method = methodMatch ? methodMatch[2].toUpperCase() : "GET";
      const line = lineAt(lineStarts, match.index || 0);
      addEntry(results, seen, {
        method,
        path: rawPath,
        source: `${relPath}:${line}`,
        notes: methodMatch ? "fetch with method" : "fetch (default GET)",
      });
    }

    const literalRegex = /([`'"])([\s\S]*?)\1/g;
    for (const match of source.matchAll(literalRegex)) {
      const rawPath = extractApiPath(match[2]);
      if (!rawPath) continue;
      const line = lineAt(lineStarts, match.index || 0);
      addEntry(results, seen, {
        method: "ANY",
        path: rawPath,
        source: `${relPath}:${line}`,
        notes: "string literal",
      });
    }
  }

  results.sort((a, b) => {
    if (a.path === b.path) {
      return a.method.localeCompare(b.method);
    }
    return a.path.localeCompare(b.path);
  });

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} entries to ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
