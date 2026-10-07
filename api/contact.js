async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}


module.exports = async (req, res) => {
  try {
    const raw = await readRawBody(req);
    const event = {
      httpMethod: req.method,
      headers: req.headers,
      body: raw.toString("base64"),
      isBase64Encoded: true
    };
    const result = await handler(event);
    res.status(result.statusCode || 500);
    for (const [key, value] of Object.entries(result.headers || {})) {
      res.setHeader(key, value);
    }
    res.send(result.body == null ? "" : result.body);
  } catch (error) {
    console.error("Contact API error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
