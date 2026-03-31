import { Type } from "@google/genai";

export const productivityTools = [
  {
    functionDeclarations: [
      {
        name: "add_task",
        description: "Add a new task to the task list.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The title of the task" },
            priority: { type: Type.STRING, enum: ["low", "medium", "high"], description: "Task priority" }
          },
          required: ["title"]
        }
      },
      {
        name: "add_event",
        description: "Schedule a new event in the calendar.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Event title" },
            startTime: { type: Type.STRING, description: "ISO 8601 start time" },
            endTime: { type: Type.STRING, description: "ISO 8601 end time" }
          },
          required: ["title", "startTime"]
        }
      },
      {
        name: "add_note",
        description: "Save a new note or piece of information.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, description: "The content of the note" },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional tags" }
          },
          required: ["content"]
        }
      },
      {
        name: "get_productivity_data",
        description: "Retrieve all tasks, events, and notes.",
        parameters: { type: Type.OBJECT, properties: {} }
      }
    ]
  }
];
