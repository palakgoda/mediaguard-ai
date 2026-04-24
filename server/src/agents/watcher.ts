import { BaseAgent } from "./base.js";

export class WatcherAgent extends BaseAgent {
  constructor() {
    super("Watcher", "gemini-3-flash-proxy");
  }

  public async processRequest(taskId: string, context?: any) {
    // UPDATED: Added taskId to link the log to the task
    await this.logStatus("init", `${this.name} Agent Initialized`, taskId);
    await this.logStatus("processing", "Metadata Scan initiated", taskId);

    try {
      const mockResponse = { status: "success", foundSuspiciousMetadata: true };

      // UPDATED: Added taskId
      await this.logStatus("complete", "Metadata scan complete", taskId);

      // Chain reaction: Trigger Investigator next
      await this.triggerNextAgent(taskId, "Pending_Investigator");

      return mockResponse;
    } catch (error) {
      // UPDATED: Added taskId
      await this.logStatus("error", `Scan failed: ${error instanceof Error ? error.message : String(error)}`, taskId);
      throw error;
    }
  }
}