import { BaseAgent } from "./base.js";

export class InvestigatorAgent extends BaseAgent {
  constructor() {
    super("Investigator", "gemini-3-flash-proxy");
  }

  public async processRequest(taskId: string, context?: any) {
    await this.logStatus("init", `${this.name} Agent Initialized`, taskId);
    await this.logStatus("processing", "Analyzing piracy patterns", taskId);

    try {
      const mockResponse = { status: "success", confidenceScore: 0.95 };

      // UPDATED: Added taskId
      await this.logStatus("complete", "Pattern analysis complete with high confidence", taskId);

      // Chain reaction: Trigger Judge next
      await this.triggerNextAgent(taskId, "Pending_Judge");

      return mockResponse;
    } catch (error) {
      // UPDATED: Added taskId
      await this.logStatus("error", `Analysis failed: ${error instanceof Error ? error.message : String(error)}`, taskId);
      throw error;
    }
  }
}