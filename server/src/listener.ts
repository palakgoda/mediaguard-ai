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
          const { status, taskId, message } = data;

          // DEBUG: This helps you see exactly what Firestore is receiving in your terminal
          console.log(`[Incoming Log] Status: ${status} | Message: ${message}`);

          // We check the 'message' field because that's where the "Pending_..." command is located

          // 1. Trigger Watcher
          if (message.includes("Pending_Watcher")) {
            console.log(`[Chain] Signal detected. Waking up Watcher for ${taskId}`);
            const agent = new WatcherAgent();
            agent.processRequest(taskId, message).catch(e => console.error(e));
          }

          // 2. Trigger Investigator
          else if (message.includes("Pending_Investigator")) {
            console.log(`[Chain] Signal detected. Waking up Investigator for ${taskId}`);
            const agent = new InvestigatorAgent();
            agent.processRequest(taskId, message).catch(e => console.error(e));
          }

          // 3. Trigger Judge
          else if (message.includes("Pending_Judge")) {
            console.log(`[Chain] Signal detected. Waking up Judge for ${taskId}`);
            const agent = new JudgeAgent();
            agent.processRequest(taskId, message).catch(e => console.error(e));
          }

          // 4. Trigger Rectifier
          else if (message.includes("Pending_Rectifier")) {
            console.log(`[Chain] Signal detected. Waking up Rectifier for ${taskId}`);
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