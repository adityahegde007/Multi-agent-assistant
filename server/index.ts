import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { OrchestratorAgent } from "./agents/orchestrator.ts";
import { db } from "./db/index.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const orchestrator = new OrchestratorAgent(process.env.GEMINI_API_KEY!);

  // API Routes
  app.get("/api/data", (req, res) => {
    res.json(db.read());
  });

  app.post("/api/chat", async (req, res) => {
    const { message } = req.body;
    try {
      const currentData = db.read();
      const result = await orchestrator.processRequest(message, currentData);
      db.write(result.data);
      res.json(result);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process request" });
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
