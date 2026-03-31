import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar, 
  CheckSquare, 
  StickyNote, 
  Send, 
  Plus, 
  Clock, 
  Trash2, 
  LayoutDashboard,
  MessageSquare,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

interface ProductivityData {
  tasks: Task[];
  events: Event[];
  notes: Note[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [data, setData] = useState<ProductivityData>({ tasks: [], events: [], notes: [] });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks" | "calendar" | "notes">("dashboard");
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history: messages })
      });
      const json = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: json.text }]);
      if (json.data) setData(json.data);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const TabButton = ({ id, icon: Icon, label }: { id: "dashboard" | "tasks" | "calendar" | "notes", icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        activeTab === id 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon size={18} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar / Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-slate-200 p-4 flex md:flex-col gap-2 overflow-x-auto">
        <div className="hidden md:flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">AgentFlow</h1>
        </div>
        
        <TabButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
        <TabButton id="tasks" icon={CheckSquare} label="Tasks" />
        <TabButton id="calendar" icon={Calendar} label="Calendar" />
        <TabButton id="notes" icon={StickyNote} label="Notes" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg capitalize">{activeTab}</h2>
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
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* Stats Summary */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><CheckSquare size={20} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Tasks</span>
                  </div>
                  <div className="text-3xl font-bold">{data.tasks.length}</div>
                  <div className="text-sm text-slate-500 mt-1">Pending items</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Calendar size={20} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Events</span>
                  </div>
                  <div className="text-3xl font-bold">{data.events.length}</div>
                  <div className="text-sm text-slate-500 mt-1">Scheduled events</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><StickyNote size={20} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Notes</span>
                  </div>
                  <div className="text-3xl font-bold">{data.notes.length}</div>
                  <div className="text-sm text-slate-500 mt-1">Saved snippets</div>
                </div>

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
                    {data.events.slice(0, 3).map(event => (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold">
                          <span className="text-indigo-600">MAR</span>
                          <span>31</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{event.title}</div>
                          <div className="text-xs text-slate-500">{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                    {data.events.length === 0 && (
                      <div className="text-center text-slate-400 italic py-4">No events scheduled.</div>
                    )}
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

            {activeTab === "calendar" && (
              <motion.div 
                key="calendar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
              >
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }).map((_, i) => (
                    <div key={i} className={`aspect-square border border-slate-100 rounded-lg p-1 flex flex-col gap-1 ${i + 1 === 31 ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                      <span className="text-xs font-medium">{i + 1}</span>
                      {i + 1 === 31 && data.events.map(e => (
                        <div key={e.id} className="bg-indigo-600 text-white text-[8px] p-1 rounded truncate">{e.title}</div>
                      ))}
                    </div>
                  ))}
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

        {/* Chat Interface */}
        <div className="bg-white border-t border-slate-200 p-4 max-h-[400px] flex flex-col">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 scrollbar-hide">
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
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  {msg.content}
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
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Primary Agent..."
              className="w-full bg-slate-100 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
