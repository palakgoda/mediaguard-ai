import { BaseAgent } from "./base.js";

const AI_PROXY_URL = process.env.AI_PROXY_URL || "https://api.aistudio.google.com/v1/models/gemini-3-flash:generateContent";

export class ConciergeAgent extends BaseAgent {
  constructor() {
    super("Concierge", "gemini-3-flash-proxy");
  }

  public async processRequest(taskId: string, prompt: string) {
    await this.logStatus("processing", `Handling request: ${prompt.substring(0, 50)}...`);
    
    try {
      console.log(`[${this.name}] Sending request for task ${taskId} to proxy...`);
      
      const mockResponse = {
        status: "success",
        text: "Concierge acknowledges your request and is routing appropriately."
      };
      
      await this.logStatus("complete", "Request processed and routed successfully");
      
      // Chain reaction: Trigger Watcher next
      await this.triggerNextAgent(taskId, "Pending_Watcher");
      
      return mockResponse;
    } catch (error) {
      await this.logStatus("error", `Failed to process request: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
