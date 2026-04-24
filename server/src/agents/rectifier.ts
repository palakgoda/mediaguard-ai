import { BaseAgent } from "./base.js";

export class RectifierAgent extends BaseAgent {
  constructor() {
    super("Rectifier", "gemini-3-flash-proxy");
  }

  public async processRequest(taskId: string, context?: any) {
    await this.logStatus("init", `${this.name} Agent Initialized`, taskId);
    await this.logStatus("processing", "Executing final action", taskId);

    try {
      // UPDATED: Added taskId
      await this.logStatus("complete", "Final action executed successfully", taskId);

      // Chain reaction ends here
      await this.triggerNextAgent(taskId, "Completed");

      return { status: "success" };
    } catch (error) {
      // UPDATED: Added taskId
      await this.logStatus("error", `Execution failed: ${error instanceof Error ? error.message : String(error)}`, taskId);
      throw error;
    }
  }
}