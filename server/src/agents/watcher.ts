import { BaseAgent } from "./base.js";

export class WatcherAgent extends BaseAgent {
  constructor() {
    super("Watcher", "gemini-3-flash-proxy");
  }

  public async processRequest(taskId: string, context?: any) {
    await this.logStatus("processing", "Metadata Scan initiated");
    
    try {
      // Mock logic for scanning metadata
      const mockResponse = { status: "success", foundSuspiciousMetadata: true };
      await this.logStatus("complete", "Metadata scan complete");
      
      // Chain reaction: Trigger Investigator next
      await this.triggerNextAgent(taskId, "Pending_Investigator");
      
      return mockResponse;
    } catch (error) {
      await this.logStatus("error", `Scan failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
