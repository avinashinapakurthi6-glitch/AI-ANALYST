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
      if (!geminiUrl) {
        res.status(400).json({ error: "GEMINI_URL must be set in the server environment or provide x-api-key header and GEMINI_URL." });
        return;
      }

      // Build a plain-text prompt from OpenAI-style messages (system/user/assistant)
      let promptText = "";
      if (Array.isArray(req.body?.messages)) {
        promptText = req.body.messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
      } else if (typeof req.body?.prompt === "string") {
        promptText = req.body.prompt;
      } else {
        promptText = JSON.stringify(req.body).slice(0, 8000);
      }

      // Construct Gemini-style payload (Google GenerativeText v1beta2 style)
      const geminiBody: any = {
        prompt: { text: promptText },
        maxOutputTokens: req.body?.max_tokens || 1024,
        temperature: typeof req.body?.temperature !== 'undefined' ? req.body.temperature : 0.0,
      };

      // Allow API key either as query param (Google API key) or Bearer token
      let url = geminiUrl;
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (apiKey && (String(apiKey).startsWith("AIza") || (typeof geminiUrl === 'string' && geminiUrl.includes("googleapis.com")))) {
        url = geminiUrl + (geminiUrl.includes("?") ? "&" : "?") + `key=${encodeURIComponent(String(apiKey))}`;
      } else if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(geminiBody),
      });

      const data = await response.json().catch(() => null);

      // Try to extract text from Gemini response variants
      let text: any = null;
      if (data) {
        if (data.candidates && data.candidates[0] && (data.candidates[0].content || data.candidates[0].output)) {
          text = data.candidates[0].content || data.candidates[0].output;
        } else if (data.output && data.output[0] && data.output[0].content && data.output[0].content[0] && data.output[0].content[0].text) {
          text = data.output[0].content[0].text;
        } else if (data.outputs && data.outputs[0] && data.outputs[0].text) {
          text = data.outputs[0].text;
        } else if (typeof data === 'string') {
          text = data;
        } else {
          text = JSON.stringify(data);
        }
      }

      // Return OpenAI-like shape for the frontend to parse easily
      const out = { choices: [{ message: { content: text } }], raw: data };
      res.status(response.status).json(out);
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
