import { GoogleGenAI } from "@google/genai";
import { productivityTools } from "../tools/productivity.ts";

export class OrchestratorAgent {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async processRequest(message: string, currentData: any) {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: "You are a Multi-Agent Productivity Assistant. You coordinate between specialized sub-agents for tasks, calendar, and notes. Use the provided tools to manage the user's productivity data. If a user asks to do something, use the appropriate tool. If they ask for an overview, use get_productivity_data.",
          tools: productivityTools
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        const toolResults = [];
        let updatedData = { ...currentData };

        for (const call of functionCalls) {
          if (call.name === "add_task") {
            const args = call.args as { title: string; priority?: string };
            const task = { id: Date.now().toString(), ...args, status: "pending" };
            updatedData.tasks.push(task);
            toolResults.push({ name: call.name, content: `Task added: ${task.title}` });
          } else if (call.name === "add_event") {
            const args = call.args as { title: string; startTime: string; endTime?: string };
            const event = { id: Date.now().toString(), ...args };
            updatedData.events.push(event);
            toolResults.push({ name: call.name, content: `Event scheduled: ${event.title}` });
          } else if (call.name === "add_note") {
            const args = call.args as { content: string; tags?: string[] };
            const note = { id: Date.now().toString(), ...args, createdAt: new Date().toISOString() };
            updatedData.notes.push(note);
            toolResults.push({ name: call.name, content: `Note saved.` });
          } else if (call.name === "get_productivity_data") {
            toolResults.push({ name: call.name, content: JSON.stringify(updatedData) });
          }
        }

        // Final summary request
        const finalResponse = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { role: "user", parts: [{ text: message }] },
            { role: "model", parts: response.candidates[0].content.parts },
            { role: "user", parts: toolResults.map(r => ({ text: `Tool ${r.name} result: ${r.content}` })) }
          ],
          config: {
            systemInstruction: "Summarize the actions taken and provide a helpful response to the user."
          }
        });

        return { text: finalResponse.text, data: updatedData };
      }

      return { text: response.text, data: currentData };
    } catch (error) {
      console.error("Orchestrator error:", error);
      throw error;
    }
  }
}
