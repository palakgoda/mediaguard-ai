import { db } from "../db.js";

export abstract class BaseAgent {
  public name: string;
  public model: string;
  
  constructor(name: string, model: string) {
    this.name = name;
    this.model = model;
    this.logStatus("init", `${this.name} Agent Initialized using ${this.model}`);
  }

  public async logStatus(status: string, message: string) {
    try {
      const logsRef = db.collection("agent_logs");
      await logsRef.add({
        agent: this.name,
        model: this.model,
        status,
        message,
        timestamp: new Date().toISOString(),
      });
      console.log(`[${this.name}] Logged status '${status}': ${message}`);
    } catch (error) {
      console.error(`[${this.name}] Failed to write log:`, error);
    }
  }

  protected async triggerNextAgent(taskId: string, nextStatus: string) {
    try {
      const taskRef = db.collection("tasks").doc(taskId);
      // Update the task status to trigger the next agent
      // Using merge true to ensure the document is created if it doesn't exist
      await taskRef.set({
        status: nextStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      this.logStatus("trigger", `Triggered sequence: ${nextStatus}`);
    } catch (error) {
      this.logStatus("error", `Failed to trigger next sequence: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Abstract method enforcing the template pattern
  public abstract processRequest(taskId: string, context?: any): Promise<any>;
}
