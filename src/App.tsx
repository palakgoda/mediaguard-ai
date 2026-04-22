import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, CheckCircle2, AlertCircle, Cpu, Activity, Send, Loader2 } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

// Health Check Interface
interface HealthStatus {
  status: string;
  message: string;
  firestore: {
    projectId: string;
    databaseId: string;
    connected: boolean;
  };
  timestamp: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error("Failed to fetch health:", err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || analyzing) return;

    setAnalyzing(true);
    setAnalysis("");

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following content for potential security threats or media misinformation: "${prompt}"`,
        config: {
          systemInstruction: "You are MediaShield AI, a highly advanced media protection specialist. Provide concise, professional analysis.",
        },
      });

      setAnalysis(response.text || "Analysis complete.");
    } catch (err) {
      console.error("Gemini failed:", err);
      setAnalysis("Error: Unable to complete analysis. Please check your AI configuration.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-[#1A1A1A]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold tracking-tight text-xl">MediaShield AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-widest">
              <Activity className="w-3 h-3" />
              <span>Live Engine</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-8 md:p-12 shadow-sm border border-gray-100"
        >
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
              Full-Stack <span className="font-semibold italic">Protection</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              MediaShield AI connects directly to your secure Firestore environment and leverages 
              multimodal intelligence to safeguard your digital presence.
            </p>
            
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-full border border-gray-200 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">Enterprise Cloud Run Infrastructure Ready</span>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Backend Status Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1 bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">System Health</h2>
                {loadingHealth ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : health?.status === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-300 block mb-1">Status</label>
                  <p className="font-mono text-sm uppercase tracking-tighter">
                    {loadingHealth ? "Checking..." : health?.status || "Offline"}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-300 block mb-1">Firestore ID</label>
                  <p className="font-mono text-[10px] text-gray-500 break-all leading-tight">
                    {health?.firestore.databaseId || "Pending..."}
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={fetchHealth}
              disabled={loadingHealth}
              className="mt-6 w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
            >
              Recalibrate Connection
            </button>
          </motion.div>

          {/* AI Protection Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 bg-white rounded-[24px] p-8 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-medium tracking-tight">AI Protection Engine</h2>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Paste media link or text for protective analysis..."
                  className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none text-sm placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={analyzing || !prompt.trim()}
                  className="absolute bottom-4 right-4 p-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-30"
                >
                  {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>

            <AnimatePresence mode="wait">
              {analysis && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-gray-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-300 block mb-2">Shield Response</label>
                      <p className="text-sm leading-relaxed text-gray-700">
                        {analysis}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Deployment Footer Info */}
        <footer className="pt-12 pb-6 flex flex-col items-center gap-4 text-gray-400">
          <div className="h-px w-full bg-gray-200 mb-4" />
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
            <span>Google Cloud Run</span>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Vertex AI Proxy</span>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Express v4.21</span>
          </div>
          <p className="text-[10px]">© 2026 MediaShield AI • One-Click Deploy Template</p>
        </footer>
      </main>
    </div>
  );
}
