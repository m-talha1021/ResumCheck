const express = require("express");
const path = require("path");
const fs = require("fs");
const analyze = require("./api/analyze");
const contact = require("./api/contact");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

const app = express();
const PORT = Number(process.env.PORT || 8000);
const STATIC_DIR = __dirname;

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function invokeFunction(handler, req, res) {
  try {
    const raw = await readRawBody(req);
    const contentType = String(req.headers["content-type"] || "");
    const isBinary = contentType.toLowerCase().includes("multipart/form-data");
    const event = { httpMethod: req.method, headers: req.headers, body: isBinary ? raw.toString("base64") : raw.toString("utf8"), isBase64Encoded: isBinary };
    const result = await handler(event);
    res.status(result.statusCode || 500);
    Object.entries(result.headers || {}).forEach(([key, value]) => res.setHeader(key, value));
    res.send(result.body == null ? "" : result.body);
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS" && req.path.startsWith("/api")) return res.status(204).end();
  next();
});

app.all("/api/analyze", (req, res) => invokeFunction(analyze, req, res));
app.all("/api/contact", (req, res) => invokeFunction(contact, req, res));
app.get("/api/health", (_req, res) => res.json({ ok: true, geminiConfigured: Boolean(process.env.GEMINI_API_KEY), models: String(process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || "default fallback list").split(",").map(s => s.trim()).filter(Boolean) }));
app.use(express.static(STATIC_DIR, { extensions: ["html"] }));
app.listen(PORT, "0.0.0.0", () => console.log(`ResumCheck running at http://localhost:${PORT}`));
