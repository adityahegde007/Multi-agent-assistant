import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { db } from "./db/index.ts";
import { Task, Event, Note, ProductivityData } from "../shared/types.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "1.1.0" });
  });

  app.get("/manifest.json", (req, res) => {
    const manifestPath = path.join(process.cwd(), "manifest.json");
    res.sendFile(manifestPath);
  });

  app.get("/api/data", (req, res) => {
    try {
      res.json(db.read());
    } catch (error) {
      console.error("Failed to read data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/tasks", (req, res) => {
    try {
      const args = req.body;
      if (!args.title) return res.status(400).json({ error: "Title is required" });
      
      const currentData: ProductivityData = db.read();
      const task: Task = { 
        id: Date.now().toString(), 
        status: "pending",
        priority: "medium",
        ...args 
      };
      currentData.tasks.push(task);
      db.write(currentData);
      res.json(task);
    } catch (error) {
      console.error("Failed to add task:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/events", (req, res) => {
    try {
      const args = req.body;
      if (!args.title || !args.startTime) return res.status(400).json({ error: "Title and startTime are required" });

      const currentData: ProductivityData = db.read();
      const event: Event = { id: Date.now().toString(), ...args };
      currentData.events.push(event);
      db.write(currentData);
      res.json(event);
    } catch (error) {
      console.error("Failed to add event:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/notes", (req, res) => {
    try {
      const args = req.body;
      if (!args.content) return res.status(400).json({ error: "Content is required" });

      const currentData: ProductivityData = db.read();
      const note: Note = { 
        id: Date.now().toString(), 
        createdAt: new Date().toISOString(),
        ...args 
      };
      currentData.notes.push(note);
      db.write(currentData);
      res.json(note);
    } catch (error) {
      console.error("Failed to add note:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/data", (req, res) => {
    try {
      const emptyData: ProductivityData = { tasks: [], events: [], notes: [] };
      db.write(emptyData);
      res.json({ status: "ok", message: "All data cleared" });
    } catch (error) {
      console.error("Failed to clear data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Individual Delete Endpoints
  app.delete("/api/tasks/:id", (req, res) => {
    try {
      const { id } = req.params;
      const currentData: ProductivityData = db.read();
      currentData.tasks = currentData.tasks.filter(t => t.id !== id);
      db.write(currentData);
      res.json({ status: "ok" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/events/:id", (req, res) => {
    try {
      const { id } = req.params;
      const currentData: ProductivityData = db.read();
      currentData.events = currentData.events.filter(e => e.id !== id);
      db.write(currentData);
      res.json({ status: "ok" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/notes/:id", (req, res) => {
    try {
      const { id } = req.params;
      const currentData: ProductivityData = db.read();
      currentData.notes = currentData.notes.filter(n => n.id !== id);
      db.write(currentData);
      res.json({ status: "ok" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
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
