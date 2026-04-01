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
  ChevronDown,
  ChevronLeft,
  RefreshCcw,
  Sparkles,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OrchestratorAgent } from "./agent/orchestrator.ts";
import { 
  Task, 
  Event, 
  Note, 
  ProductivityData, 
  ChatMessage 
} from "../shared/types.ts";

export default function App() {
  const [data, setData] = useState<ProductivityData>({ tasks: [], events: [], notes: [] });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks" | "calendar" | "notes" | "architecture">("dashboard");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
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

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setData(prev => ({ ...prev, events: prev.events.filter(e => e.id !== id) }));
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setData(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const handleToggleTask = (id: string) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden">
      {/* API Key Warning Banner */}
      {!orchestrator && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2">
          <Sparkles size={14} />
          <span>Gemini API Key missing. AI features are disabled. Please set GEMINI_API_KEY in environment variables.</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 mr-2 md:mr-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                <Sparkles size={18} />
              </div>
              <h1 className="font-bold text-base md:text-lg tracking-tight hidden sm:block">AgentFlow</h1>
            </div>
            {activeTab !== "dashboard" && (
              <button 
                onClick={() => setActiveTab("dashboard")}
                className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-xs md:text-sm font-medium"
              >
                <LayoutDashboard size={14} className="md:w-4 md:h-4" /> <span className="hidden xs:inline">Dashboard</span>
              </button>
            )}
            <h2 className="font-semibold text-sm md:text-lg capitalize border-l border-slate-200 pl-2 md:pl-4 truncate max-w-[100px] sm:max-w-none">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="md:hidden p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <MessageSquare size={18} />
            </button>
            <div className="hidden xs:flex items-center gap-2 md:gap-3">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest hidden lg:block">System Online</div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
                  <div className="bg-amber-600 p-4 rounded-2xl text-white shadow-lg shadow-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <LayoutDashboard size={16} className="text-amber-200" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Track 3: Vector Search</span>
                    </div>
                    <div className="text-sm font-bold mb-1">Semantic Engine</div>
                    <div className="text-[10px] opacity-70 leading-relaxed">Gemini Embeddings enable concept-based retrieval of notes.</div>
                  </div>
                  <div className="bg-emerald-600 p-4 rounded-2xl text-white shadow-lg shadow-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal size={16} className="text-emerald-200" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Track 2: MCP</span>
                    </div>
                    <div className="text-sm font-bold mb-1">MCP Sub-Agents</div>
                    <div className="text-[10px] opacity-70 leading-relaxed">Separated reasoning from execution via standardized tool protocols.</div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleToggleTask(task.id)}
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${task.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-indigo-500"}`}
                          >
                            {task.status === "completed" && <CheckSquare size={10} />}
                          </button>
                          <span className={`font-medium ${task.status === "completed" ? "text-slate-400 line-through" : "text-slate-700"}`}>{task.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-400 uppercase">{task.priority}</span>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
                        <div key={event.id} className="flex items-center justify-between group">
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold">
                              <span className="text-indigo-600 uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                              <span>{date.getDate()}</span>
                            </div>
                            <div>
                              <div className="font-medium text-sm">{event.title}</div>
                              <div className="text-xs text-slate-500">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteEvent(event.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
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
                  <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleToggleTask(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 hover:border-indigo-500"}`}
                      >
                        {task.status === "completed" && <CheckSquare size={14} />}
                      </button>
                      <div>
                        <div className={`font-medium ${task.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">{task.priority} Priority</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "architecture" && (
              <motion.div 
                key="architecture"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 md:space-y-8"
              >
                <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5 hidden sm:block">
                    <Terminal size={200} />
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-3">
                      <Terminal className="text-indigo-600" size={24} /> <span className="truncate">Orchestration Architecture</span>
                    </h3>
                    <p className="text-sm md:text-base text-slate-500 mb-8 md:mb-12 max-w-2xl">
                      A high-performance system leveraging Gemini 3 Flash for intelligent routing, 
                      specialized sub-agents for domain execution, and the Model Context Protocol (MCP) for tool standardization.
                    </p>

                    <div className="relative flex flex-col items-center gap-12 md:gap-16 py-6 md:py-12">
                      {/* Step 1: User Input */}
                      <div className="relative group w-full max-w-xs md:max-w-none flex justify-center">
                        <div className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs border-2 border-white shadow-lg z-10">1</div>
                        <div className="bg-slate-900 text-white px-4 md:px-8 py-3 md:py-4 rounded-2xl shadow-2xl flex items-center gap-3 md:gap-4 border-4 border-indigo-500/20 group-hover:scale-105 transition-transform w-full md:w-auto">
                          <MessageSquare className="text-indigo-400" size={20} />
                          <div>
                            <div className="text-[8px] md:text-[10px] uppercase font-bold tracking-widest text-indigo-400">User Intent</div>
                            <div className="font-bold text-xs md:text-base">Natural Language Request</div>
                          </div>
                        </div>
                        <div className="absolute -bottom-10 md:-bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <div className="text-[6px] md:text-[8px] font-bold text-slate-400 mb-1">INPUT STREAM</div>
                          <div className="w-0.5 h-10 md:h-12 bg-gradient-to-b from-slate-900 to-indigo-600"></div>
                          <ChevronDown className="text-indigo-600 -mt-2" size={20} />
                        </div>
                      </div>

                      {/* Step 2: Orchestrator */}
                      <div className="relative group mt-2 md:mt-4 w-full max-w-xs md:max-w-md flex justify-center">
                        <div className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs border-2 border-white shadow-lg z-10">2</div>
                        <div className="bg-indigo-600 text-white p-4 md:p-6 rounded-3xl shadow-2xl w-full border-4 border-white/20 relative group-hover:scale-105 transition-transform">
                          <div className="absolute -top-3 -right-3 bg-white text-indigo-600 px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase shadow-lg">Gemini 3 Flash</div>
                          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                            <Sparkles className="text-indigo-200" size={20} />
                            <div className="font-bold text-lg md:text-xl">Primary Orchestrator</div>
                          </div>
                          <div className="space-y-2 text-xs md:text-sm opacity-90">
                            <div className="bg-white/10 p-2 rounded-lg border border-white/10 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div> Intent Analysis & Routing
                            </div>
                            <div className="bg-white/10 p-2 rounded-lg border border-white/10 flex items-center gap-2 font-bold text-indigo-100">
                              <RefreshCcw size={10} className="animate-spin-slow" /> Multi-Turn Reasoning Loop
                            </div>
                          </div>
                        </div>
                        
                        {/* Control Flow Label */}
                        <div className="absolute -left-20 md:-left-32 top-1/2 -translate-y-1/2 text-right hidden xs:block">
                          <div className="text-[8px] md:text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Control Flow</div>
                          <div className="text-[6px] md:text-[8px] text-slate-400">Reasoning & Logic</div>
                        </div>

                        {/* Loop Arrow */}
                        <div className="absolute -right-16 md:-right-24 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-40 group-hover:opacity-100 transition-opacity hidden sm:flex">
                          <div className="text-[6px] md:text-[8px] font-bold text-indigo-600 uppercase mb-1">Feedback Loop</div>
                          <div className="w-10 h-10 md:w-16 md:h-16 border-t-2 border-r-2 border-b-2 border-indigo-600 rounded-r-full"></div>
                          <ChevronLeft className="text-indigo-600 -mt-2 rotate-180" size={12} md:size={16} />
                        </div>
                      </div>

                      {/* Step 3: Sub-Agents (Parallel Execution) */}
                      <div className="relative w-full max-w-5xl">
                        <div className="absolute -left-4 md:-left-12 top-0 w-6 h-6 md:w-8 md:h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs border-2 border-white shadow-lg z-20">3</div>
                        <div className="absolute -top-10 md:-top-12 left-1/2 -translate-x-1/2 w-full h-10 md:h-12 border-x-2 border-t-2 border-slate-200 rounded-t-3xl -z-10 hidden md:block"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                          {[
                            { name: "TASK_AGENT", icon: <CheckSquare />, color: "bg-indigo-500", tools: ["add_task", "get_data"], desc: "State Management" },
                            { name: "CALENDAR_AGENT", icon: <Calendar />, color: "bg-amber-500", tools: ["add_event", "get_data"], desc: "Temporal Logic" },
                            { name: "KNOWLEDGE_AGENT", icon: <StickyNote />, color: "bg-emerald-500", tools: ["add_note", "semantic_search"], desc: "Vector Retrieval" }
                          ].map((agent, i) => (
                            <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-4 md:p-5 shadow-lg hover:border-indigo-200 transition-all group relative">
                              <div className={`w-8 h-8 md:w-10 md:h-10 ${agent.color} text-white rounded-xl flex items-center justify-center mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                {React.cloneElement(agent.icon as React.ReactElement, { size: 18 })}
                              </div>
                              <div className="font-bold text-xs md:text-sm">{agent.name}</div>
                              <div className="text-[8px] md:text-[10px] text-slate-400 mb-2 md:mb-3">{agent.desc}</div>
                              <div className="space-y-1 md:space-y-1.5">
                                {agent.tools.map(tool => (
                                  <div key={tool} className="text-[8px] md:text-[9px] font-mono bg-slate-50 text-slate-500 px-2 py-1 rounded flex items-center gap-1 md:gap-1.5 border border-slate-100">
                                    <div className="w-1 h-1 bg-indigo-400 rounded-full"></div> λ {tool}
                                  </div>
                                ))}
                              </div>
                              {/* Connector to Infra */}
                              <div className="absolute -bottom-8 md:-bottom-12 left-1/2 -translate-x-1/2 w-0.5 h-8 md:h-12 bg-slate-100 group-hover:bg-indigo-200 transition-colors hidden md:block"></div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* MCP Callout - After Track 3 (Knowledge Agent) */}
                      <div className="relative group mt-2 md:mt-4 w-full max-w-xs md:max-w-none flex justify-center">
                        <div className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-2xl shadow-xl flex items-center gap-2 md:gap-3 border-2 border-white/20 group-hover:scale-105 transition-transform w-full md:w-auto">
                          <Terminal size={18} className="text-blue-200" />
                          <div>
                            <div className="text-[6px] md:text-[8px] uppercase font-bold tracking-widest text-blue-200">MCP Protocol</div>
                            <div className="text-[10px] md:text-xs font-bold">Standardized Tool Execution Layer</div>
                          </div>
                        </div>
                        <div className="absolute -bottom-10 md:-bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <div className="text-[6px] md:text-[8px] font-bold text-slate-400 mb-1">DATA FLOW</div>
                          <div className="w-0.5 h-10 md:h-12 bg-gradient-to-b from-blue-600 to-slate-400"></div>
                          <ChevronDown className="text-slate-400 -mt-2" size={20} />
                        </div>
                      </div>

                      {/* Step 4: Infrastructure & Data */}
                      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 w-full max-w-2xl mt-2 md:mt-4">
                        <div className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-slate-400 text-white rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs border-2 border-white shadow-lg z-10">4</div>
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 md:p-6 flex items-center gap-3 md:gap-4 hover:bg-white hover:border-indigo-200 transition-all group">
                          <div className="p-2 md:p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><LayoutDashboard size={18} /></div>
                          <div>
                            <div className="font-bold text-xs md:text-sm">Deterministic Core</div>
                            <div className="text-[8px] md:text-[10px] text-slate-400 font-mono">Express / JSON DB</div>
                          </div>
                        </div>
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 md:p-6 flex items-center gap-3 md:gap-4 hover:bg-white hover:border-emerald-200 transition-all group">
                          <div className="p-2 md:p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Sparkles size={18} /></div>
                          <div>
                            <div className="font-bold text-xs md:text-sm">Vector Search</div>
                            <div className="text-[8px] md:text-[10px] text-slate-400 font-mono">Gemini Embeddings</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Process Flow Section */}
                <div className="bg-indigo-900 text-white p-6 md:p-8 rounded-3xl border border-indigo-800 shadow-xl overflow-hidden">
                  <h3 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-3">
                    <RefreshCcw className="text-indigo-400" size={20} /> <span className="truncate">Reasoning Process Flow</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative">
                    {[
                      { step: "01", title: "Intent Parsing", desc: "Orchestrator identifies goals and required sub-agents." },
                      { step: "02", title: "Tool Selection", desc: "Sub-agents select tools based on MCP definitions." },
                      { step: "03", title: "Execution Loop", desc: "Tools are executed; results fed back for further reasoning." },
                      { step: "04", title: "State Sync", desc: "Final state is persisted and UI is updated in real-time." }
                    ].map((p, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 relative">
                        <div className="text-xl md:text-2xl font-black text-indigo-500/30 mb-2">{p.step}</div>
                        <div className="font-bold text-xs md:text-sm mb-1">{p.title}</div>
                        <div className="text-[9px] md:text-[10px] text-indigo-200/70 leading-relaxed">{p.desc}</div>
                        {i < 3 && (
                          <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-20">
                            <ChevronRight size={16} className="text-indigo-500" />
                          </div>
                        )}
                      </div>
                    ))}
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
                <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-[10px] md:text-xs font-bold text-slate-400 uppercase">{day.slice(0, 3)}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 md:gap-2">
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
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
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
        <aside className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-600" /> AI Assistant
            </div>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="md:hidden p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
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

          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 relative">
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
              className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </aside>

        {/* Mobile Chat Overlay */}
        {isChatOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsChatOpen(false)}
          />
        )}
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
