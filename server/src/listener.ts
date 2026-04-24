import { Request, Response } from "express";
import { db } from "./db.js";
// Import all 5 agents
import { ConciergeAgent } from "./agents/concierge.ts";
import { WatcherAgent } from "./agents/watcher.ts";
import { InvestigatorAgent } from "./agents/investigator.ts";
import { JudgeAgent } from "./agents/judge.ts";
import { RectifierAgent } from "./agents/rectifier.ts";

let clients: Response[] = [];
let currentLogs: any[] = [];
let isListening = false;

export function startLogListener() {
  if (isListening) return;
  isListening = true;

  console.log("🚀 MediaGuard Orchestrator: Monitoring all 5 Agent Channels...");
  const logsRef = db.collection("agent_logs");

  logsRef.orderBy("timestamp", "desc").limit(10).onSnapshot(
    async (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      currentLogs = [...logs].reverse();
      broadcastLogs();

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();

          // Ensure we capture the taskId from the log document
          const taskId = data.taskId;
          const message = data.message || "";

          // If there's no taskId, we skip to avoid the "invalid resource path" error
          if (!taskId) return;

          if (message.includes("Pending_Watcher")) {
            const agent = new WatcherAgent();
            agent.processRequest(taskId, message).catch(e => console.error(e));
          }
          else if (message.includes("Pending_Investigator")) {
            const agent = new InvestigatorAgent();
            agent.processRequest(taskId, message).catch(e => console.error(e));
          }
          else if (message.includes("Pending_Judge")) {
            const agent = new JudgeAgent();
            agent.processRequest(taskId, message).catch(e => console.error(e));
          }
          else if (message.includes("Pending_Rectifier")) {
            const agent = new RectifierAgent();
            agent.processRequest(taskId, message).catch(e => console.error(e));
          }
        }
      });
    },
    (error) => console.error("Firestore Error:", error)
  );
}

function broadcastLogs() {
  const payload = JSON.stringify({ logs: currentLogs });
  clients.forEach(client => { try { client.write(`data: ${payload}\n\n`); } catch (e) { } });
}

export function streamLogsHandler(req: Request, res: Response) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
  clients.push(res);
  res.write(`data: ${JSON.stringify({ logs: currentLogs })}\n\n`);
  req.on("close", () => { clients = clients.filter(c => c !== res); });
}