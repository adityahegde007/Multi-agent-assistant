import { GoogleGenAI } from "@google/genai";
import { taskTools, calendarTools, knowledgeTools } from "../mcp/productivity.ts";

export interface Task {
  id: string;
  title: string;
  priority?: "low" | "medium" | "high";
  status: "pending" | "completed";
}

export interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
}

export interface Note {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

export interface ProductivityData {
  tasks: Task[];
  events: Event[];
  notes: Note[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  trace?: { agent: string; tool: string; args: any; result: string }[];
}

export class OrchestratorAgent {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Invalid API key provided to OrchestratorAgent.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async invokeSubAgent(agentName: string, systemInstruction: string, message: string, tools: any[], previousResults: { name: string; content: string }[]) {
    const contents: any[] = [{ role: "user", parts: [{ text: message }] }];
    
    if (previousResults.length > 0) {
      contents.push({ 
        role: "user", 
        parts: previousResults.map(r => ({ text: `Context from previous actions: Tool ${r.name} returned: ${r.content}` })) 
      });
    }

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction,
        tools
      }
    });
    return response;
  }

  async processRequest(message: string, currentData: ProductivityData, onUpdate: (data: ProductivityData) => void) {
    try {
      const now = new Date();
      const userOffset = -now.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(userOffset) / 60);
      const offsetMinutes = Math.abs(userOffset) % 60;
      const offsetStr = (userOffset >= 0 ? "+" : "-") + 
                        String(offsetHours).padStart(2, "0") + ":" + 
                        String(offsetMinutes).padStart(2, "0");
      
      const dateContext = `Current Date/Time: ${now.toISOString()} (User Local Time: ${now.toLocaleString()}, Timezone Offset: ${offsetStr})`;

      // Step 1: Primary Orchestrator Routing
      const routingResponse = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
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

      const agentsToInvoke: string[] = JSON.parse(routingResponse.text);
      const trace: { agent: string; tool: string; args: any; result: string }[] = [];
      const toolResults: { name: string; content: string }[] = [];
      let updatedData = { ...currentData };

      // Step 2: Invoke Specialized Sub-Agents with Tool Loop
      for (const agent of agentsToInvoke) {
        let systemInstruction = "";
        let tools: any[] = [];

        if (agent === "TASK_AGENT") {
          systemInstruction = `You are the Task Agent. ${dateContext}. Use the add_task tool to manage user tasks. Use get_productivity_data to see existing tasks if needed.`;
          tools = taskTools;
        } else if (agent === "CALENDAR_AGENT") {
          systemInstruction = `You are the Calendar Agent. ${dateContext}. Use the add_event tool to manage user schedules. Use get_productivity_data to see existing events if needed. IMPORTANT: Always use the add_event tool if the user wants to schedule something. If you need to check for conflicts, call get_productivity_data first, then in your next turn call add_event. When scheduling, use the user's local time and include the timezone offset (${offsetStr}) in the ISO 8601 string.`;
          tools = calendarTools;
        } else if (agent === "KNOWLEDGE_AGENT") {
          systemInstruction = `You are the Knowledge Agent. ${dateContext}. Use the add_note or semantic_search_notes tools to manage information. Use get_productivity_data to see existing notes if needed.`;
          tools = knowledgeTools;
        }

        if (tools.length === 0) continue;

        let agentTurnCount = 0;
        const maxTurns = 3;
        const agentToolResults: { name: string; content: string }[] = [...toolResults];

        while (agentTurnCount < maxTurns) {
          const agentResponse = await this.invokeSubAgent(agent, systemInstruction, message, tools, agentToolResults);
          const functionCalls = agentResponse.functionCalls;

          if (!functionCalls || functionCalls.length === 0) break;

          for (const call of functionCalls) {
            let resultText = "";
            if (call.name === "add_task") {
              const args = call.args as { title: string; priority?: "low" | "medium" | "high" };
              const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(args)
              });
              const task = await res.json();
              updatedData.tasks.push(task);
              resultText = `Task added: ${task.title}`;
            } else if (call.name === "add_event") {
              const args = call.args as { title: string; startTime: string; endTime?: string };
              const res = await fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(args)
              });
              const event = await res.json();
              updatedData.events.push(event);
              resultText = `Event scheduled: ${event.title}`;
            } else if (call.name === "add_note") {
              const args = call.args as { content: string; tags?: string[] };
              const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(args)
              });
              const note = await res.json();
              updatedData.notes.push(note);
              resultText = `Note saved.`;
            } else if (call.name === "semantic_search_notes") {
              const args = call.args as { query: string };
              const queryEmbedding = await this.ai.models.embedContent({
                model: "gemini-embedding-2-preview",
                contents: [args.query]
              });

              const noteEmbeddings = await Promise.all(updatedData.notes.map(async (n) => {
                const emb = await this.ai.models.embedContent({
                  model: "gemini-embedding-2-preview",
                  contents: [n.content]
                });
                return { note: n, embedding: emb.embeddings[0].values };
              }));

              const results = noteEmbeddings.map(ne => {
                const score = ne.embedding.reduce((acc, val, idx) => acc + val * queryEmbedding.embeddings[0].values[idx], 0);
                return { ...ne.note, score };
              })
              .filter(r => r.score > 0.5) // Lowered threshold slightly for better recall
              .sort((a, b) => b.score - a.score)
              .slice(0, 3);

              if (results.length > 0) {
                resultText = `Found ${results.length} relevant notes via semantic search: ${results.map(r => r.content.substring(0, 30) + "...").join(", ")}`;
              } else {
                resultText = "No highly relevant notes found for this query.";
              }
            } else if (call.name === "get_productivity_data") {
              resultText = `Current Data: ${JSON.stringify(updatedData)}`;
            }

            trace.push({ agent, tool: call.name, args: call.args, result: resultText });
            agentToolResults.push({ name: call.name, content: resultText });
            toolResults.push({ name: call.name, content: resultText });
          }
          agentTurnCount++;
        }
      }

      onUpdate(updatedData);

      // Step 3: Final Synthesis by Orchestrator
      const finalResponse = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: "user", parts: [{ text: message }] },
          { role: "user", parts: toolResults.map(r => ({ text: `Sub-Agent Action Result (${r.name}): ${r.content}` })) }
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
}
