import express from "express";
import cors from "cors";
import { sessionsRouter } from "./routes/sessions.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/sessions", sessionsRouter);

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
