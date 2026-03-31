import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { db } from "./db/index.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
  });

  app.get("/manifest.json", (req, res) => {
    const manifestPath = path.join(process.cwd(), "manifest.json");
    res.sendFile(manifestPath);
  });

  app.get("/api/data", (req, res) => {
    res.json(db.read());
  });

  app.post("/api/tasks", (req, res) => {
    const args = req.body;
    const currentData = db.read();
    const task = { id: Date.now().toString(), ...args, status: "pending" };
    currentData.tasks.push(task);
    db.write(currentData);
    res.json(task);
  });

  app.post("/api/events", (req, res) => {
    const args = req.body;
    const currentData = db.read();
    const event = { id: Date.now().toString(), ...args };
    currentData.events.push(event);
    db.write(currentData);
    res.json(event);
  });

  app.post("/api/notes", (req, res) => {
    const args = req.body;
    const currentData = db.read();
    const note = { id: Date.now().toString(), ...args, createdAt: new Date().toISOString() };
    currentData.notes.push(note);
    db.write(currentData);
    res.json(note);
  });

  app.delete("/api/data", (req, res) => {
    const emptyData = { tasks: [], events: [], notes: [] };
    db.write(emptyData);
    res.json({ status: "ok", message: "All data cleared" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
