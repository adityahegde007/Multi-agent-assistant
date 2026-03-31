import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Calendar, 
  CheckSquare, 
  StickyNote, 
  Send, 
  Clock, 
  Trash2, 
  LayoutDashboard,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OrchestratorAgent, ProductivityData } from "./agent/orchestrator.ts";

interface Task {
  id: string;
  title: string;
  priority?: "low" | "medium" | "high";
  status: "pending" | "completed";
}

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
}

interface Note {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  trace?: { agent: string; tool: string; args: any; result: string }[];
}

export default function App() {
  const [data, setData] = useState<ProductivityData>({ tasks: [], events: [], notes: [] });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks" | "calendar" | "notes" | "architecture">("dashboard");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const orchestrator = useMemo(() => {
    const apiKey = process.env.GEMINI_API_KEY;
    return apiKey ? new OrchestratorAgent(apiKey) : null;
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !orchestrator) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const result = await orchestrator.processRequest(userMessage, data, (updatedData) => {
        setData(updatedData);
      });
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: result.text,
        trace: result.trace
      }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please check your API key and try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch("/api/data", { method: "DELETE" });
      if (res.ok) {
        setData({ tasks: [], events: [], notes: [] });
        setShowClearConfirm(false);
        setMessages(prev => [...prev, { role: "assistant", content: "I've cleared all your data. You're starting with a fresh slate!" }]);
      }
    } catch (err) {
      console.error("Failed to clear data:", err);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Sparkles size={18} />
              </div>
              <h1 className="font-bold text-lg tracking-tight">AgentFlow</h1>
            </div>
            {activeTab !== "dashboard" && (
              <button 
                onClick={() => setActiveTab("dashboard")}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                <LayoutDashboard size={16} /> Back to Dashboard
              </button>
            )}
            <h2 className="font-semibold text-lg capitalize border-l border-slate-200 pl-4">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400 font-mono uppercase tracking-widest">System Online</div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Track Alignment Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-indigo-200" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Track 1: ADK/A2A</span>
                    </div>
                    <div className="text-sm font-bold mb-1">Primary Orchestrator</div>
                    <div className="text-[10px] opacity-70 leading-relaxed">Agent Card (manifest.json) & Health API enabled for A2A discovery.</div>
                  </div>
                  <div className="bg-emerald-600 p-4 rounded-2xl text-white shadow-lg shadow-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal size={16} className="text-emerald-200" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Track 2: MCP</span>
                    </div>
                    <div className="text-sm font-bold mb-1">MCP Sub-Agents</div>
                    <div className="text-[10px] opacity-70 leading-relaxed">Separated reasoning from execution via standardized tool protocols.</div>
                  </div>
                  <div className="bg-amber-600 p-4 rounded-2xl text-white shadow-lg shadow-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <LayoutDashboard size={16} className="text-amber-200" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Track 3: Vector Search</span>
                    </div>
                    <div className="text-sm font-bold mb-1">Semantic Engine</div>
                    <div className="text-[10px] opacity-70 leading-relaxed">Gemini Embeddings enable concept-based retrieval of notes.</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Overview</h3>
                  <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-rose-100"
                  >
                    <Trash2 size={14} /> Clear All Data
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Summary */}
                <button 
                  onClick={() => setActiveTab("tasks")}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors"><CheckSquare size={20} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Tasks</span>
                  </div>
                  <div className="text-3xl font-bold">{data.tasks.length}</div>
                  <div className="text-sm text-slate-500 mt-1">Pending items</div>
                </button>

                <button 
                  onClick={() => setActiveTab("calendar")}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors"><Calendar size={20} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Events</span>
                  </div>
                  <div className="text-3xl font-bold">{data.events.length}</div>
                  <div className="text-sm text-slate-500 mt-1">Scheduled events</div>
                </button>

                <button 
                  onClick={() => setActiveTab("notes")}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors"><StickyNote size={20} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Notes</span>
                  </div>
                  <div className="text-3xl font-bold">{data.notes.length}</div>
                  <div className="text-sm text-slate-500 mt-1">Saved snippets</div>
                </button>

                <button 
                  onClick={() => setActiveTab("architecture")}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Terminal size={20} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Architecture</span>
                  </div>
                  <div className="text-3xl font-bold">MCP</div>
                  <div className="text-sm text-slate-500 mt-1">System Design</div>
                </button>

                {/* Recent Activity / Quick View */}
                <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 font-semibold flex items-center gap-2">
                    <Clock size={16} /> Recent Tasks
                  </div>
                  <div className="divide-y divide-slate-50">
                    {data.tasks.slice(-5).reverse().map(task => (
                      <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === 'high' ? 'bg-rose-500' : 
                            task.priority === 'medium' ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}></div>
                          <span className="font-medium">{task.title}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400 uppercase">{task.priority}</span>
                      </div>
                    ))}
                    {data.tasks.length === 0 && (
                      <div className="p-8 text-center text-slate-400 italic">No tasks yet. Ask the assistant to add one!</div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 font-semibold flex items-center gap-2">
                    <Calendar size={16} /> Upcoming
                  </div>
                  <div className="p-4 space-y-4">
                    {data.events.slice(0, 3).map(event => {
                      const date = new Date(event.startTime);
                      return (
                        <div key={event.id} className="flex gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold">
                            <span className="text-indigo-600 uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                            <span>{date.getDate()}</span>
                          </div>
                          <div>
                            <div className="font-medium text-sm">{event.title}</div>
                            <div className="text-xs text-slate-500">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </div>
                      );
                    })}
                    {data.events.length === 0 && (
                      <div className="text-center text-slate-400 italic py-4">No events scheduled.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

            {activeTab === "tasks" && (
              <motion.div 
                key="tasks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {data.tasks.map(task => (
                  <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button className="w-6 h-6 rounded-full border-2 border-slate-200 hover:border-indigo-500 transition-colors"></button>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">{task.priority} Priority</div>
                      </div>
                    </div>
                    <button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "architecture" && (
              <motion.div 
                key="architecture"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Terminal size={200} />
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                      <Terminal className="text-indigo-600" /> Multi-Agent Orchestration Architecture
                    </h3>
                    <p className="text-slate-500 mb-12 max-w-2xl">
                      A high-performance system leveraging Gemini 3 Flash for intelligent routing, 
                      specialized sub-agents for domain execution, and the Model Context Protocol (MCP) for tool standardization.
                    </p>

                    <div className="relative flex flex-col items-center gap-12 py-12">
                      {/* User Input Node */}
                      <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-4 border-indigo-500/20">
                        <MessageSquare className="text-indigo-400" />
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Entry Point</div>
                          <div className="font-bold">User Natural Language Request</div>
                        </div>
                      </div>

                      <ChevronRight className="rotate-90 text-slate-300" size={32} />

                      {/* Orchestrator Node */}
                      <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-2xl w-full max-w-md border-4 border-white/20 relative">
                        <div className="absolute -top-3 -right-3 bg-white text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">Gemini 3 Flash</div>
                        <div className="flex items-center gap-4 mb-4">
                          <Sparkles className="text-indigo-200" />
                          <div className="font-bold text-xl">Primary Orchestrator</div>
                        </div>
                        <div className="space-y-2 text-sm opacity-90">
                          <div className="bg-white/10 p-2 rounded-lg border border-white/10 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div> Intent Analysis & Routing
                          </div>
                          <div className="bg-white/10 p-2 rounded-lg border border-white/10 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div> Multi-Turn Tool Synthesis
                          </div>
                        </div>
                      </div>

                      <div className="w-full max-w-4xl grid grid-cols-3 gap-8 relative">
                        {/* Connecting Lines (Simplified) */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-full h-12 border-x-2 border-t-2 border-slate-200 rounded-t-3xl -z-10"></div>
                        
                        {/* Sub-Agents */}
                        {[
                          { name: "TASK_AGENT", icon: <CheckSquare />, color: "bg-indigo-500", tools: ["add_task", "get_data"] },
                          { name: "CALENDAR_AGENT", icon: <Calendar />, color: "bg-amber-500", tools: ["add_event", "get_data"] },
                          { name: "KNOWLEDGE_AGENT", icon: <StickyNote />, color: "bg-emerald-500", tools: ["add_note", "semantic_search"] }
                        ].map((agent, i) => (
                          <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-lg hover:border-indigo-200 transition-all group">
                            <div className={`w-10 h-10 ${agent.color} text-white rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                              {agent.icon}
                            </div>
                            <div className="font-bold text-sm mb-3">{agent.name}</div>
                            <div className="space-y-1.5">
                              {agent.tools.map(tool => (
                                <div key={tool} className="text-[9px] font-mono bg-slate-50 text-slate-500 px-2 py-1 rounded flex items-center gap-1.5">
                                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div> λ {tool}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <ChevronRight className="rotate-90 text-slate-300" size={32} />

                      {/* Infrastructure Layer */}
                      <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex items-center gap-4">
                          <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100"><LayoutDashboard className="text-indigo-600" /></div>
                          <div>
                            <div className="font-bold text-sm">Express Backend</div>
                            <div className="text-[10px] text-slate-400 font-mono">REST API / JSON DB</div>
                          </div>
                        </div>
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex items-center gap-4">
                          <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100"><Sparkles className="text-emerald-600" /></div>
                          <div>
                            <div className="font-bold text-sm">Vector Engine</div>
                            <div className="text-[10px] text-slate-400 font-mono">Gemini Embeddings 2</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Specs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold mb-4 flex items-center gap-2"><Terminal size={16} className="text-indigo-600" /> MCP Tool Protocol</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Every sub-agent interaction is governed by a strict JSON-Schema based tool definition. 
                      This ensures that the LLM only generates valid, executable function calls, 
                      reducing hallucinations and enabling reliable state mutations.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold mb-4 flex items-center gap-2"><Sparkles size={16} className="text-emerald-600" /> Semantic Retrieval (RAG)</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Notes are indexed using high-dimensional vector embeddings. When searching, 
                      the system calculates the cosine similarity between the query and stored notes, 
                      allowing for "conceptual" matches even when keywords don't overlap.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === "calendar" && (
              <motion.div 
                key="calendar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-xl">
                    {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight size={20} className="rotate-180" />
                    </button>
                    <button 
                      onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const year = calendarDate.getFullYear();
                    const month = calendarDate.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const days = [];

                    // Padding for previous month
                    for (let i = 0; i < firstDay; i++) {
                      days.push(<div key={`pad-${i}`} className="aspect-square"></div>);
                    }

                    // Days of current month
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dayEvents = data.events.filter(e => {
                        const ed = new Date(e.startTime);
                        return ed.getDate() === d && ed.getMonth() === month && ed.getFullYear() === year;
                      });
                      const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;

                      days.push(
                        <div key={d} className={`aspect-square border border-slate-100 rounded-lg p-1 flex flex-col gap-1 overflow-hidden ${isToday ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                          <span className={`text-xs font-medium ${isToday ? 'text-indigo-600' : ''}`}>{d}</span>
                          <div className="flex flex-col gap-0.5 overflow-y-auto scrollbar-hide">
                            {dayEvents.map(e => (
                              <div key={e.id} className="bg-indigo-600 text-white text-[7px] px-1 py-0.5 rounded truncate" title={e.title}>
                                {e.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return days;
                  })()}
                </div>
              </motion.div>
            )}

            {activeTab === "notes" && (
              <motion.div 
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {data.notes.map(note => (
                  <div key={note.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group">
                    <div className="text-slate-700 leading-relaxed mb-4">{note.content}</div>
                    <div className="flex flex-wrap gap-2">
                      {note.tags?.map(tag => (
                        <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded">#{tag}</span>
                      ))}
                    </div>
                    <div className="mt-4 text-[10px] text-slate-300">{new Date(note.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

        {/* Chat Interface (Sidebar on desktop) */}
        <aside className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-[400px] md:h-full">
          <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare size={16} className="text-indigo-600" /> AI Assistant
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                  <MessageSquare size={24} />
                </div>
                <p className="text-slate-500 text-sm">How can I help you today?</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {["Add task: Buy milk", "Schedule meeting at 3pm", "Note: Project deadline is Friday"].map(hint => (
                    <button 
                      key={hint}
                      onClick={() => setInput(hint)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-100' 
                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                }`}>
                  <div className="leading-relaxed">{msg.content}</div>
                  
                  {msg.trace && msg.trace.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Terminal size={10} /> MCP Tool Trace
                      </div>
                      {msg.trace.map((t, i) => (
                        <div key={i} className="bg-white/50 rounded-lg p-2 text-[11px] font-mono border border-slate-200/50">
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-indigo-600 font-bold">λ {t.tool}</div>
                            <div className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-bold">{t.agent?.replace('_AGENT', '')}</div>
                          </div>
                          <div className="text-slate-400 mb-1 text-[9px] truncate">args: {JSON.stringify(t.args)}</div>
                          <div className="text-emerald-600">→ {t.result}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="relative">
            <input
              type="text"
              value={input}
              disabled={!orchestrator}
              onChange={(e) => setInput(e.target.value)}
              placeholder={orchestrator ? "Ask the Primary Agent..." : "AI Chat disabled (Missing API Key)"}
              className="w-full bg-slate-100 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim() || !orchestrator}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </aside>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200"
            >
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Clear all data?</h3>
              <p className="text-slate-500 text-sm text-center mb-6">
                This will permanently delete all your tasks, events, and notes. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleClearAll}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-100 transition-all"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
