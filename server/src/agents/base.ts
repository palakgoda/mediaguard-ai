import { db } from "../db.js";

export abstract class BaseAgent {
  public name: string;
  public model: string;

  constructor(name: string, model: string) {
    this.name = name;
    this.model = model;
    // Note: 'init' log now happens inside processRequest to capture the taskId
  }

  // UPDATED: Added taskId as an optional parameter to link logs to specific tasks
  public async logStatus(status: string, message: string, taskId?: string) {
    try {
      const logsRef = db.collection("agent_logs");
      await logsRef.add({
        agent: this.name,
        model: this.model,
        status,
        message,
        taskId: taskId || null, // CRITICAL: This allows the listener to find the ID
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

      await taskRef.set({
        status: nextStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // UPDATED: Passing taskId here so the "trigger" log contains the ID
      await this.logStatus("trigger", `Triggered sequence: ${nextStatus}`, taskId);
    } catch (error) {
      // UPDATED: Passing taskId here too for error tracking
      await this.logStatus("error", `Failed to trigger next sequence: ${error instanceof Error ? error.message : String(error)}`, taskId);
    }
  }

  public abstract processRequest(taskId: string, context?: any): Promise<any>;
}