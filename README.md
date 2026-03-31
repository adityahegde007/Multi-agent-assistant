# AgentFlow: Multi-Track AI Agent System

**AgentFlow** is a comprehensive AI productivity system built for the **Google AI Hackathon**. It demonstrates a sophisticated **Multi-Agent Architecture** that aligns with all three hackathon tracks: **ADK/A2A**, **MCP**, and **Vector Search**.

## 🏆 Multi-Track Alignment

### 1. Track 1: Agent Development Kit (ADK) & A2A
- **Standardized Manifest**: Includes an `agent-card.json` (manifest) describing capabilities, making the system **Agent2Agent (A2A)** ready.
- **Production-Ready Backend**: Features a dedicated `/api/health` endpoint and structured API routes designed for serverless deployment on **Cloud Run**.
- **Primary Orchestrator**: Implements a central reasoning agent that coordinates specialized sub-agent logic.

### 2. Track 2: Model Context Protocol (MCP)
- **Separation of Reasoning & Execution**: Uses the **MCP Pattern** to decouple AI decision-making from deterministic tool execution.
- **Sub-Agent Tooling**: Specialized tools for **Tasks**, **Calendar**, and **Notes** are integrated via standardized function declarations.
- **Visible Trace**: The UI provides a real-time **MCP Tool Trace**, showing the agent's multi-step reasoning and tool invocation process.

### 3. Track 3: AI-Enabled Data & Vector Search
- **Semantic Retrieval**: Implements **Semantic Search** over unstructured notes using **Gemini Embeddings** (`gemini-embedding-2-preview`).
- **Natural Language Data Interaction**: Users can query their information using concepts rather than just keywords (e.g., *"Find my work-related notes"*).

## 🚀 Core Requirements Met

- ✅ **Primary Agent**: Coordinates specialized sub-agents for different domains.
- ✅ **Structured Data**: Persistent storage using a type-safe database layer.
- ✅ **MCP Integration**: Multiple tools (Calendar, Tasks, Notes) integrated via standardized protocols.
- ✅ **Multi-Step Workflows**: Handles complex, multi-part requests in a single turn.
- ✅ **API-Based System**: Fully functional REST API serving as the data and health layer.

## 📂 Project Structure

```text
├── ui/                 # React Frontend (Vite Root)
│   ├── agent/          # Orchestrator Agent (Primary Reasoning)
│   ├── mcp/            # MCP Tool Definitions (Capability Layer)
│   └── App.tsx         # Dashboard with Multi-Track Trace
├── backend/            # Express Server (Execution & Data Layer)
│   ├── index.ts        # API Routes, Health, & Manifest
│   └── data/           # Persistent JSON Storage
├── manifest.json       # Agent Card for A2A Discovery
└── vite.config.ts      # Full-Stack Configuration
```

## ⚙️ Setup & Installation

1. **Environment Variables**:
   Set your `GEMINI_API_KEY` in your environment.
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

2. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

## 💡 How to Demo

1. **Multi-Step Workflow**: Try: *"Finish the design docs (high priority), schedule a kickoff meeting tomorrow at 9 AM, and note that the project code is 'Project-X'."*
2. **Semantic Search**: Try: *"Find my notes about project deadlines"* (even if the word 'deadline' isn't in the note, the semantic engine will find relevant content).
3. **Architecture Verification**: Check the **Dashboard** for the track alignment overview and the **Chat Trace** for real-time MCP activity.

---
*Built for the Google AI Hackathon - Demonstrating the power of Multi-Agent Coordination, MCP, and Vector Search.*
