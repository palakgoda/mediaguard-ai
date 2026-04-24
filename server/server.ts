import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { db, config } from "./src/db.js";
import { startLogListener, streamLogsHandler } from "./src/listener.js";
// Import the Concierge Agent to start the relay
import { ConciergeAgent } from "./src/agents/concierge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Path to your frontend client folder
  const clientPath = path.resolve(__dirname, "..", "client");
  console.log("🚀 Serving static files from:", clientPath);

  // --- API ROUTES ---

  // 1. Health Check
  app.get("/api/health", async (req, res) => {
    res.json({ status: "ok", connected: true });
  });

  // 2. SSE endpoint for real-time logs
  app.get("/api/logs/stream", streamLogsHandler);

  // 3. The Analyze Trigger (The "Brain" Switch)
  app.post("/api/analyze", async (req, res) => {
    const { url, taskId } = req.body;
    const finalTaskId = taskId || `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    console.log(`🚀 Dispatching Concierge for: ${url}`);

    try {
      res.json({
        success: true,
        message: "Relay initiated. Check the reasoning log.",
        taskId: finalTaskId
      });

      const concierge = new ConciergeAgent();

      // FIX: Changed .process() to .processRequest() 
      // FIX: Passed finalTaskId first, then the url (as the prompt)
      concierge.processRequest(finalTaskId, url).catch(err => {
        console.error("Relay Chain Error:", err);
      });

    } catch (error) {
      console.error("Failed to start agent relay:", error);
    }
  });
  // --- STATIC SERVING ---

  // Start the Firestore FIFO listener to catch agent thoughts
  startLogListener();

  // Serve the frontend files (HTML, CSS, JS)
  app.use(express.static(clientPath));

  // Fallback: Send everything else to index.html (SPA support)
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n================================================`);
    console.log(`🛡️  MediaShield AI Engine Online`);
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`================================================\n`);
  });
}

startServer();