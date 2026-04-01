import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { taskTools, calendarTools, knowledgeTools } from "../mcp/productivity.ts";
import { 
  Task, 
  Event as CalendarEvent, 
  Note, 
  ProductivityData, 
  GEMINI_MODEL, 
  EMBEDDING_MODEL 
} from "../../shared/types.ts";

export class OrchestratorAgent {
  private ai: GoogleGenAI;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(apiKey: string) {
    if (!apiKey?.trim()) {
      throw new Error("Invalid API key provided to OrchestratorAgent.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async getEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = new Array(texts.length);
    const toEmbed: { text: string; index: number }[] = [];

    texts.forEach((text, i) => {
      if (this.embeddingCache.has(text)) {
        results[i] = this.embeddingCache.get(text)!;
      } else {
        toEmbed.push({ text, index: i });
      }
    });

    if (toEmbed.length > 0) {
      const response = await this.ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: toEmbed.map(item => item.text)
      });

      response.embeddings.forEach((emb, i) => {
        const vector = emb.values;
        const originalIndex = toEmbed[i].index;
        const text = toEmbed[i].text;
        results[originalIndex] = vector;
        this.embeddingCache.set(text, vector);
      });
    }

    return results;
  }

  private async invokeSubAgent(
    agentName: string, 
    systemInstruction: string, 
    message: string, 
    tools: any[], 
    previousResults: { name: string; content: string }[]
  ): Promise<GenerateContentResponse> {
    const parts: any[] = [{ text: message }];
    
    if (previousResults.length > 0) {
      parts.push(...previousResults.map(r => ({ text: `Context from previous actions: Tool ${r.name} returned: ${r.content}` })));
    }

    return await this.ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts }],
      config: { systemInstruction, tools }
    });
  }

  private async getRoutingDecision(message: string, dateContext: string): Promise<string[]> {
    const response = await this.ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: `You are the Primary Orchestrator Agent. ${dateContext}
        Analyze the user request and decide which specialized sub-agents are needed:
        - TASK_AGENT: For managing tasks and to-dos.
        - CALENDAR_AGENT: For scheduling and events.
        - KNOWLEDGE_AGENT: For notes and semantic search.
        
        Respond with a JSON list of agents to invoke. Example: ["TASK_AGENT", "KNOWLEDGE_AGENT"]`,
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text);
  }

  private async executeTool(
    call: { name: string; args: any }, 
    updatedData: ProductivityData,
    agent: string
  ): Promise<{ resultText: string; updatedData: ProductivityData }> {
    let resultText = "";
    const data = { ...updatedData };

    switch (call.name) {
      case "add_task": {
        const args = call.args as { title: string; priority?: "low" | "medium" | "high" };
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args)
        });
        const task = await res.json();
        data.tasks.push(task);
        resultText = `Task added: ${task.title}`;
        break;
      }
      case "add_event": {
        const args = call.args as { title: string; startTime: string; endTime?: string };
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args)
        });
        const event = await res.json();
        data.events.push(event);
        resultText = `Event scheduled: ${event.title}`;
        break;
      }
      case "add_note": {
        const args = call.args as { content: string; tags?: string[] };
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args)
        });
        const note = await res.json();
        data.notes.push(note);
        resultText = `Note saved.`;
        break;
      }
      case "semantic_search_notes": {
        const args = call.args as { query: string };
        const [queryVector] = await this.getEmbeddings([args.query]);
        const noteVectors = await this.getEmbeddings(data.notes.map(n => n.content));

        const results = data.notes.map((note, i) => {
          const vector = noteVectors[i];
          const score = vector.reduce((acc, val, idx) => acc + val * queryVector[idx], 0);
          return { ...note, score };
        })
        .filter(r => r.score > 0.6)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

        resultText = results.length > 0 
          ? `Found ${results.length} relevant notes:\n${results.map(r => `- ${r.content}`).join("\n")}`
          : "No highly relevant notes found.";
        break;
      }
      case "get_productivity_data": {
        resultText = `Current Data: ${JSON.stringify(data)}`;
        break;
      }
      default:
        resultText = `Unknown tool: ${call.name}`;
    }

    return { resultText, updatedData: data };
  }

  async processRequest(message: string, currentData: ProductivityData, onUpdate: (data: ProductivityData) => void) {
    try {
      const now = new Date();
      const userOffset = -now.getTimezoneOffset();
      const offsetStr = (userOffset >= 0 ? "+" : "-") + 
                        String(Math.floor(Math.abs(userOffset) / 60)).padStart(2, "0") + ":" + 
                        String(Math.abs(userOffset) % 60).padStart(2, "0");
      
      const dateContext = `Current Date/Time: ${now.toISOString()} (User Local Time: ${now.toLocaleString()}, Timezone Offset: ${offsetStr})`;

      // Step 1: Routing
      const agentsToInvoke = await this.getRoutingDecision(message, dateContext);
      const trace: any[] = [];
      const toolResults: { name: string; content: string }[] = [];
      let updatedData = { ...currentData };

      // Step 2: Sub-Agent Execution
      for (const agent of agentsToInvoke) {
        const { systemInstruction, tools } = this.getAgentConfig(agent, dateContext, offsetStr);
        if (!tools.length) continue;

        let turnCount = 0;
        const maxTurns = 3;
        const agentToolResults = [...toolResults];

        while (turnCount < maxTurns) {
          const response = await this.invokeSubAgent(agent, systemInstruction, message, tools, agentToolResults);
          const functionCalls = response.functionCalls;
          if (!functionCalls?.length) break;

          for (const call of functionCalls) {
            if (!call.name) continue;
            const { resultText, updatedData: newData } = await this.executeTool(
              { name: call.name, args: call.args || {} }, 
              updatedData, 
              agent
            );
            updatedData = newData;
            const traceItem = { agent, tool: call.name, args: call.args, result: resultText };
            trace.push(traceItem);
            agentToolResults.push({ name: call.name, content: resultText });
            toolResults.push({ name: call.name, content: resultText });
          }
          turnCount++;
        }
      }

      onUpdate(updatedData);

      // Step 3: Synthesis
      const finalResponse = await this.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { 
            role: "user", 
            parts: [
              { text: message },
              ...toolResults.map(r => ({ text: `Sub-Agent Action Result (${r.name}): ${r.content}` }))
            ] 
          }
        ],
        config: {
          systemInstruction: "You are the Primary Orchestrator. Summarize the actions taken by your sub-agents and provide a final response to the user."
        }
      });

      return { text: finalResponse.text, data: updatedData, trace };
    } catch (error) {
      console.error("Orchestrator error:", error);
      throw error;
    }
  }

  private getAgentConfig(agent: string, dateContext: string, offsetStr: string) {
    switch (agent) {
      case "TASK_AGENT":
        return {
          systemInstruction: `You are the Task Agent. ${dateContext}. Use the add_task tool to manage user tasks. Use get_productivity_data to see existing tasks if needed.`,
          tools: taskTools
        };
      case "CALENDAR_AGENT":
        return {
          systemInstruction: `You are the Calendar Agent. ${dateContext}. Use the add_event tool to manage user schedules. Use get_productivity_data to see existing events if needed. IMPORTANT: Always use the add_event tool if the user wants to schedule something. If you need to check for conflicts, call get_productivity_data first, then in your next turn call add_event. When scheduling, use the user's local time and include the timezone offset (${offsetStr}) in the ISO 8601 string.`,
          tools: calendarTools
        };
      case "KNOWLEDGE_AGENT":
        return {
          systemInstruction: `You are the Knowledge Agent. ${dateContext}. Use the add_note or semantic_search_notes tools to manage information. Use get_productivity_data to see existing notes if needed.`,
          tools: knowledgeTools
        };
      default:
        return { systemInstruction: "", tools: [] };
    }
  }
}

