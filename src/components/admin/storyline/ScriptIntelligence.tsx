import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, Sparkles, TrendingUp, Lightbulb, AlertTriangle, Zap, Target,
  DollarSign, RefreshCw, Loader2, FileText, Beaker, Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const AI_MODES = [
  { value: "analyze_scripts", label: "Full Analysis", icon: Brain, description: "Deep-dive into all scripts & revenue patterns", color: "text-purple-400" },
  { value: "generate_script", label: "Generate Script", icon: Wand2, description: "AI creates a new high-performing script", color: "text-emerald-400" },
  { value: "optimize_script", label: "Optimize Script", icon: Target, description: "Improve an existing script's performance", color: "text-amber-400" },
  { value: "whatif_simulation", label: "What-If Simulation", icon: Beaker, description: "Simulate pricing & strategy changes", color: "text-blue-400" },
];

const ScriptIntelligence = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedMode, setSelectedMode] = useState("analyze_scripts");
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<{ mode: string; result: string; timestamp: Date }[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [s, st, a, w] = await Promise.all([
        supabase.from("scripts").select("*"),
        supabase.from("script_steps").select("*").order("step_order"),
        supabase.from("managed_accounts").select("*"),
        supabase.from("automation_workflows").select("*"),
      ]);
      setScripts(s.data || []);
      setSteps(st.data || []);
      setAccounts(a.data || []);
      setWorkflows(w.data || []);
    };
    load();
  }, []);

  const runAnalysis = async () => {
    setIsStreaming(true);
    setResult("");

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/script-intelligence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: selectedMode,
            scripts,
            steps,
            accounts,
            workflows,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        if (resp.status === 429) {
          toast.error("Rate limit exceeded. Please wait and try again.");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted. Please add credits in workspace settings.");
        } else {
          toast.error(err.error || "AI analysis failed");
        }
        setIsStreaming(false);
        return;
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullResult = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResult += content;
              setResult(fullResult);
              if (resultRef.current) {
                resultRef.current.scrollTop = resultRef.current.scrollHeight;
              }
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResult += content;
              setResult(fullResult);
            }
          } catch { /* ignore */ }
        }
      }

      setHistory(prev => [{ mode: selectedMode, result: fullResult, timestamp: new Date() }, ...prev.slice(0, 9)]);
      toast.success("Analysis complete");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to run analysis");
    } finally {
      setIsStreaming(false);
    }
  };

  const dataStats = {
    scripts: scripts.length,
    steps: steps.length,
    accounts: accounts.length,
    totalRevenue: scripts.reduce((s, sc) => s + Number(sc.total_revenue || 0), 0),
    accountRevenue: accounts.reduce((s, a) => s + Number(a.monthly_revenue || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Data context bar */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[
          { title: "Scripts", value: dataStats.scripts, icon: FileText, color: "text-blue-400" },
          { title: "Steps", value: dataStats.steps, icon: Zap, color: "text-purple-400" },
          { title: "Accounts", value: dataStats.accounts, icon: Target, color: "text-emerald-400" },
          { title: "Script Revenue", value: `$${dataStats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-amber-400" },
          { title: "Monthly Rev", value: `$${dataStats.accountRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-pink-400" },
        ].map(s => (
          <Card key={s.title} className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-3">
              <s.icon className={`h-3.5 w-3.5 ${s.color} mb-1`} />
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[9px] text-white/40">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {AI_MODES.map(mode => (
          <button
            key={mode.value}
            onClick={() => setSelectedMode(mode.value)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedMode === mode.value
                ? "bg-accent/10 border-accent/30"
                : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
            }`}
          >
            <mode.icon className={`h-4 w-4 ${mode.color} mb-1.5`} />
            <p className="text-xs font-semibold text-white">{mode.label}</p>
            <p className="text-[9px] text-white/30 mt-0.5">{mode.description}</p>
          </button>
        ))}
      </div>

      {/* Run button */}
      <Button
        onClick={runAnalysis}
        disabled={isStreaming}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-10 gap-2 text-sm font-semibold"
      >
        {isStreaming ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> AI is analyzing your data...</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Run {AI_MODES.find(m => m.value === selectedMode)?.label}</>
        )}
      </Button>

      {/* Result */}
      {(result || isStreaming) && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              AI Intelligence Report
              {isStreaming && <Loader2 className="h-3 w-3 animate-spin text-accent ml-2" />}
              <Badge variant="outline" className="text-[9px] border-purple-500/20 text-purple-400 ml-auto">
                {AI_MODES.find(m => m.value === selectedMode)?.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={resultRef}
              className="max-h-[500px] overflow-y-auto prose prose-sm prose-invert max-w-none
                prose-headings:text-white prose-headings:font-semibold
                prose-h1:text-base prose-h2:text-sm prose-h3:text-xs
                prose-p:text-white/70 prose-p:text-xs prose-p:leading-relaxed
                prose-li:text-white/70 prose-li:text-xs
                prose-strong:text-white prose-strong:font-semibold
                prose-code:text-accent prose-code:text-[10px] prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                prose-a:text-accent"
            >
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && !isStreaming && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-white/30" /> Analysis History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setResult(h.result)}
                  className="w-full flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg hover:bg-white/[0.05] transition-colors text-left"
                >
                  <Brain className="h-3 w-3 text-purple-400 shrink-0" />
                  <span className="text-xs text-white flex-1">
                    {AI_MODES.find(m => m.value === h.mode)?.label}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {h.timestamp.toLocaleTimeString()}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!result && !isStreaming && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="py-12 text-center">
            <Brain className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm font-medium">AI Script Intelligence</p>
            <p className="text-white/20 text-xs mt-1 max-w-sm mx-auto">
              Select an analysis mode above and run it to get AI-powered insights based on your real script data, revenue metrics, and account performance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScriptIntelligence;
