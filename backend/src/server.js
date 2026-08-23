// Entry point for the Writing Authenticity backend.
//
// A small Express server that receives writing-session metadata from the
// Chrome extension and stores it in SQLite. It exposes a JSON API only; there
// is no UI here (the review dashboard is a separate component).
import express from "express";
import cors from "cors";
import { sessionsRouter } from "./routes/sessions.js";

const app = express();

// The extension side panel calls this API from a chrome-extension:// origin.
// For a local prototype we allow all origins; this would be tightened for
// any real deployment.
app.use(cors());
app.use(express.json({ limit: "10mb" })); // For larger amounts of writing data (e.g. long documents)

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/sessions", sessionsRouter);

// Central error handler: turns thrown errors into JSON responses. Handlers can
// throw an error carrying a `.status` to control the HTTP code.
app.use((err, _req, res, _next) => {
  const status = err.status ?? 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
