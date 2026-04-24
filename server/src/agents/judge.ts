import { BaseAgent } from "./base.js";

export class JudgeAgent extends BaseAgent {
  constructor() {
    // Model specified as Gemini 1.5 Pro
    super("Judge", "gemini-1.5-pro");
  }

  public async processRequest(taskId: string, context?: any) {
    await this.logStatus("processing", "Evaluating evidence for final verdict");
    
    try {
      // Logic outputs BLOCK or ALLOW
      const decision = "BLOCK";
      await this.logStatus("complete", `Decision reached: ${decision}`);
      
      // Chain reaction: Trigger Rectifier next
      await this.triggerNextAgent(taskId, "Pending_Rectifier");
      
      return { decision };
    } catch (error) {
      await this.logStatus("error", `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
