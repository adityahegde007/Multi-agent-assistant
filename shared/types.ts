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

export const GEMINI_MODEL = "gemini-3-flash-preview";
export const EMBEDDING_MODEL = "gemini-embedding-2-preview";
