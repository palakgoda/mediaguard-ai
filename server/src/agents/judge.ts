import { BaseAgent } from "./base.js";

export class JudgeAgent extends BaseAgent {
  constructor() {
    super("Judge", "gemini-1.5-pro");
  }

  public async processRequest(taskId: string, context?: any) {
    await this.logStatus("init", `${this.name} Agent Initialized`, taskId);
    await this.logStatus("processing", "Evaluating evidence for final verdict", taskId);

    try {
      const decision = "BLOCK";

      // UPDATED: Added taskId
      await this.logStatus("complete", `Decision reached: ${decision}`, taskId);

      // Chain reaction: Trigger Rectifier next
      await this.triggerNextAgent(taskId, "Pending_Rectifier");

      return { decision };
    } catch (error) {
      // UPDATED: Added taskId
      await this.logStatus("error", `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`, taskId);
      throw error;
    }
  }
}