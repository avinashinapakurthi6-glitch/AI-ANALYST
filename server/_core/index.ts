import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Anthropic (Claude) proxy endpoint to avoid CORS
  app.post("/api/claude", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: "API key is required" });
        return;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      console.error("Anthropic API Proxy Error:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  // OpenAI proxy endpoint to avoid CORS (new)
  app.post("/api/openai", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: "OpenAI API Key is required" });
        return;
      }

      // Expecting body to contain { model, messages, max_tokens }
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      console.error("OpenAI API Proxy Error:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  // Gemini proxy endpoint to avoid CORS
  app.post("/api/gemini", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] || process.env.GEMINI_API_KEY;
      const geminiUrl = process.env.GEMINI_URL;
      if (!apiKey || !geminiUrl) {
        res.status(400).json({ error: "GEMINI_API_KEY and GEMINI_URL must be set in the server environment or provide x-api-key header and GEMINI_URL." });
        return;
      }

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      console.error("Gemini API Proxy Error:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
