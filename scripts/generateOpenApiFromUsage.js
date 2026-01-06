import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const USAGE_FILE = path.join(ROOT, "docs", "api-used-by-ui.json");
const BACKEND_DOCS = path.resolve(ROOT, "..", "backend-v2", "docs");
const OPENAPI_FILE = path.join(BACKEND_DOCS, "openapi.yaml");

const TAGS = [
  "staff",
  "owner",
  "admin",
  "players",
  "vouchers",
  "purchase-orders",
  "messaging",
  "system",
  "public",
];

function normalizePath(rawPath) {
  let value = String(rawPath || "");
  const apiIdx = value.indexOf("/api");
  if (apiIdx > 0) value = value.slice(apiIdx);
  value = value.replace(/^https?:\/\/[^/]+/i, "");
  value = value.split("?")[0];
  value = value.replace(/\$\{[^}]+\}/g, "{param}");

  if (value.startsWith("/api/v1")) {
    value = value.slice("/api/v1".length);
  } else if (value.startsWith("/api")) {
    value = value.slice("/api".length);
  }

  if (!value.startsWith("/")) value = `/${value}`;
  if (value === "") value = "/";
  return value;
}

function pickTag(pathname) {
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/owner")) return "owner";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/player") || pathname.startsWith("/players")) return "players";
  if (pathname.startsWith("/vouchers") || pathname.startsWith("/voucher")) return "vouchers";
  if (pathname.startsWith("/purchase-orders")) return "purchase-orders";
  if (pathname.startsWith("/messaging") || pathname.includes("/messaging")) return "messaging";
  if (pathname.startsWith("/config") || pathname.startsWith("/system")) return "system";
  if (pathname.startsWith("/public")) return "public";
  return "admin";
}

function isPublic(pathname) {
  return (
    pathname.includes("/login") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/auth")
  );
}

function opTemplate(method, pathname, notes) {
  const op = {
    tags: [pickTag(pathname)],
    summary: `${method.toUpperCase()} ${pathname}`,
    responses: {
      "200": { description: "OK" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "500": { description: "Server error" },
      "501": {
        description: "Not implemented",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/NotImplementedError" },
          },
        },
      },
    },
  };
  if (notes) op.description = notes;
  if (isPublic(pathname)) op.security = [];
  return op;
}

async function main() {
  const raw = await fs.readFile(USAGE_FILE, "utf8");
  const usage = JSON.parse(raw);
  const paths = {};

  for (const entry of usage) {
    const pathname = normalizePath(entry.path);
    const method = String(entry.method || "ANY").toLowerCase();
    if (!paths[pathname]) paths[pathname] = {};

    if (method === "any") {
      const notes = entry.notes ? `Method unknown. Notes: ${entry.notes}` : "Method unknown.";
      if (!paths[pathname].get) paths[pathname].get = opTemplate("get", pathname, notes);
      if (!paths[pathname].post) paths[pathname].post = opTemplate("post", pathname, notes);
      paths[pathname]["x-method-unknown"] = true;
      continue;
    }

    if (!paths[pathname][method]) {
      paths[pathname][method] = opTemplate(method, pathname, entry.notes);
    }
  }

  const doc = {
    openapi: "3.1.0",
    info: {
      title: "Admin UI Contract",
      version: "0.1.0",
    },
    servers: [{ url: "/api/v1" }],
    tags: TAGS.map((name) => ({ name })),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean", const: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: {},
              },
              required: ["code", "message"],
            },
          },
          required: ["ok", "error"],
        },
        NotImplementedError: {
          allOf: [{ $ref: "#/components/schemas/ErrorResponse" }],
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths,
  };

  await fs.mkdir(BACKEND_DOCS, { recursive: true });
  const yaml = toYaml(doc);
  await fs.writeFile(OPENAPI_FILE, yaml);
  console.log(`Wrote ${path.relative(ROOT, OPENAPI_FILE)}`);
}

function toYaml(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  if (obj === null || obj === undefined) return `${pad}null\n`;
  if (typeof obj === "string") return `${pad}${escapeYaml(obj)}\n`;
  if (typeof obj === "number" || typeof obj === "boolean") return `${pad}${obj}\n`;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${pad}[]\n`;
    return obj
      .map((item) => `${pad}- ${stripIndent(toYaml(item, indent + 1))}`)
      .join("");
  }
  const entries = Object.entries(obj);
  if (entries.length === 0) return `${pad}{}\n`;
  return entries
    .map(([key, value]) => {
      const valueYaml = toYaml(value, indent + 1);
      if (isScalar(value)) {
        return `${pad}${key}: ${stripIndent(valueYaml)}`;
      }
      return `${pad}${key}:\n${valueYaml}`;
    })
    .join("");
}

function isScalar(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function stripIndent(text) {
  return text.replace(/^\s+/, "");
}

function escapeYaml(value) {
  if (value === "") return '""';
  if (/[:\-\[\]\{\},#&*!|>'"%@`]/.test(value) || value.includes("\n")) {
    return JSON.stringify(value);
  }
  return value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
