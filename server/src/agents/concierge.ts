import { BaseAgent } from "./base.js";

const AI_PROXY_URL = process.env.AI_PROXY_URL || "https://api.aistudio.google.com/v1/models/gemini-3-flash:generateContent";

export class ConciergeAgent extends BaseAgent {
  constructor() {
    super("Concierge", "gemini-3-flash-proxy");
  }

  public async processRequest(taskId: string, prompt: string) {
    // UPDATED: Added taskId to every logStatus call
    await this.logStatus("init", `${this.name} Agent Initialized`, taskId);
    await this.logStatus("processing", `Handling request: ${prompt.substring(0, 50)}...`, taskId);

    try {
      console.log(`[${this.name}] Sending request for task ${taskId} to proxy...`);

      const mockResponse = {
        status: "success",
        text: "Concierge acknowledges your request and is routing appropriately."
      };

      // UPDATED: Added taskId here
      await this.logStatus("complete", "Request processed and routed successfully", taskId);

      // Chain reaction: Trigger Watcher next
      await this.triggerNextAgent(taskId, "Pending_Watcher");

      return mockResponse;
    } catch (error) {
      // UPDATED: Added taskId here
      await this.logStatus("error", `Failed to process request: ${error instanceof Error ? error.message : String(error)}`, taskId);
      throw error;
    }
  }
}