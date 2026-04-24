import { BaseAgent } from "./base.js";

export class InvestigatorAgent extends BaseAgent {
  constructor() {
    super("Investigator", "gemini-3-flash-proxy");
  }

  public async processRequest(taskId: string, context?: any) {
    await this.logStatus("processing", "Analyzing piracy patterns");

    try {
      // Mock logic for deep analysis
      const mockResponse = { status: "success", confidenceScore: 0.95 };
      await this.logStatus("complete", "Pattern analysis complete with high confidence");

      // Chain reaction: Trigger Judge next
      await this.triggerNextAgent(taskId, "Pending_Judge");

      return mockResponse;
    } catch (error) {
      await this.logStatus("error", `Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
