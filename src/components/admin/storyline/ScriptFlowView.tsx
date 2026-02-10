import { Button } from "@/components/ui/button";
import {
  Image, Film, GitBranch, Clock,
  Trash2, Copy, ChevronUp, ChevronDown, Edit,
} from "lucide-react";

interface ScriptStep {
  step_order: number;
  step_type: string;
  title: string;
  content: string;
  media_url: string;
  media_type: string;
  price: number;
  delay_minutes: number;
  condition_logic: any;
  [key: string]: any;
}

interface Props {
  steps: ScriptStep[];
  onEditStep: (index: number) => void;
  onAddStep: (type: string) => void;
  onRemoveStep: (index: number) => void;
  onMoveStep: (index: number, dir: "up" | "down") => void;
  onDuplicateStep: (index: number) => void;
}

/* ── Google Sheet Color Map ── */
const STEP_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  welcome:            { bg: "#00CED1", text: "#000",  label: "Welcome Message" },
  message:            { bg: "#FFFF00", text: "#000",  label: "Message" },
  free_content:       { bg: "#00FF00", text: "#000",  label: "Free Content" },
  ppv_content:        { bg: "#32CD32", text: "#000",  label: "PPV Content" },
  content:            { bg: "#32CD32", text: "#000",  label: "Content" },
  question:           { bg: "#FFD700", text: "#000",  label: "Question" },
  condition:          { bg: "#00BFFF", text: "#000",  label: "Condition Branch" },
  followup_purchased: { bg: "#DDA0DD", text: "#000",  label: "Follow-up (Purchased)" },
  followup:           { bg: "#DDA0DD", text: "#000",  label: "Follow-up" },
  followup_ignored:   { bg: "#FF4500", text: "#FFF",  label: "Follow-up (Ignored)" },
  delay:              { bg: "#A9A9A9", text: "#000",  label: "Delay" },
  offer:              { bg: "#FFA500", text: "#000",  label: "Offer" },
  media:              { bg: "#FF8C00", text: "#000",  label: "Media" },
};

const getStyle = (type: string) => STEP_STYLES[type] || STEP_STYLES.message;

const ScriptFlowView = ({ steps, onEditStep, onAddStep, onRemoveStep, onMoveStep, onDuplicateStep }: Props) => {
  if (steps.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-white/20 text-sm">No steps yet. Start building your script flow.</div>
        <div className="flex flex-wrap justify-center gap-2">
          {["welcome", "message", "free_content", "ppv_content", "question", "condition"].map(type => {
            const s = getStyle(type);
            return (
              <button key={type} onClick={() => onAddStep(type)}
                style={{ background: s.bg, color: s.text }}
                className="px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 transition-opacity">
                + {s.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Find condition indices to render branching
  const conditionIndices = steps.reduce<number[]>((acc, s, i) => {
    if (s.step_type === "condition") acc.push(i);
    return acc;
  }, []);

  return (
    <div className="space-y-3">
      {/* Google Sheets-style spreadsheet */}
      <div className="rounded-lg overflow-hidden border border-white/10 bg-white/[0.02]">
        {/* Header row */}
        <div className="grid grid-cols-[32px_1fr_100px_60px] bg-white/5 border-b border-white/10">
          <div className="p-1.5 text-[9px] text-white/30 font-mono text-center">#</div>
          <div className="p-1.5 text-[9px] text-white/30 font-medium">Content</div>
          <div className="p-1.5 text-[9px] text-white/30 font-medium text-center">Type</div>
          <div className="p-1.5 text-[9px] text-white/30 font-medium text-center">$</div>
        </div>

        {/* Step rows */}
        {steps.map((step, i) => {
          const s = getStyle(step.step_type);
          const isCondition = step.step_type === "condition";
          const isFollowupIgnored = step.step_type === "followup_ignored";
          const isFollowupPurchased = step.step_type === "followup_purchased" || step.step_type === "followup";
          const hasBranch = isFollowupPurchased && steps[i + 1]?.step_type === "followup_ignored";

          // Build display text
          let displayText = step.content || step.title || s.label;
          if (step.media_url) displayText = step.media_url;
          if (step.step_type === "ppv_content" || step.step_type === "offer") {
            const mediaInfo = step.media_url || step.title || "Content";
            displayText = `${mediaInfo}${step.price > 0 ? ` - $${step.price}` : ""}`;
          }

          return (
            <div key={i} className="group relative">
              {/* Main row - FULL WIDTH colored like Google Sheets */}
              <div
                className="grid grid-cols-[32px_1fr] min-h-[32px] border-b border-black/10 cursor-pointer hover:brightness-110 transition-all relative"
                style={{ background: s.bg }}
                onClick={() => onEditStep(i)}
              >
                {/* Row number */}
                <div className="flex items-center justify-center text-[10px] font-mono border-r border-black/10"
                  style={{ color: s.text + "80" }}>
                  {i + 1}
                </div>

                {/* Content cell - full width colored */}
                <div className="flex items-center px-3 py-1.5 gap-2 relative">
                  {/* Condition branch indicator (left border) */}
                  {isCondition && (
                    <span className="text-[10px] font-bold mr-1" style={{ color: s.text }}>
                      ⑂
                    </span>
                  )}

                  {/* Main text */}
                  <span className="text-xs font-semibold flex-1 truncate" style={{ color: s.text }}>
                    {displayText}
                  </span>

                  {/* Media badge */}
                  {step.media_type && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/10 whitespace-nowrap" style={{ color: s.text }}>
                      {step.media_type === "image" ? "📸" : step.media_type === "video" ? "🎬" : "📎"} {step.media_type}
                    </span>
                  )}

                  {/* Price */}
                  {step.price > 0 && step.step_type !== "ppv_content" && step.step_type !== "offer" && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/15" style={{ color: s.text }}>
                      ${step.price}
                    </span>
                  )}

                  {/* Delay */}
                  {step.delay_minutes > 0 && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-black/10" style={{ color: s.text }}>
                      ⏱{step.delay_minutes}m
                    </span>
                  )}

                  {/* Hover actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2 bg-black/30 rounded px-1 py-0.5">
                    <button className="p-0.5 hover:bg-white/20 rounded" onClick={e => { e.stopPropagation(); onMoveStep(i, "up"); }}>
                      <ChevronUp className="h-3 w-3 text-white" />
                    </button>
                    <button className="p-0.5 hover:bg-white/20 rounded" onClick={e => { e.stopPropagation(); onMoveStep(i, "down"); }}>
                      <ChevronDown className="h-3 w-3 text-white" />
                    </button>
                    <button className="p-0.5 hover:bg-white/20 rounded" onClick={e => { e.stopPropagation(); onDuplicateStep(i); }}>
                      <Copy className="h-3 w-3 text-white" />
                    </button>
                    <button className="p-0.5 hover:bg-red-500/50 rounded" onClick={e => { e.stopPropagation(); onRemoveStep(i); }}>
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Branch split visualization */}
              {isCondition && (
                <div className="grid grid-cols-[32px_1fr] border-b border-black/10">
                  <div className="bg-white/5" />
                  <div className="flex items-center gap-0 text-[10px]">
                    <div className="flex-1 py-1 px-3 bg-blue-500/20 text-blue-300 font-bold text-center border-r border-white/10">
                      ✓ {step.condition_logic?.condition || "If YES"}
                    </div>
                    <div className="w-[120px] py-1 px-2 bg-red-500/20 text-red-300 font-bold text-center">
                      ✗ If NO
                    </div>
                  </div>
                </div>
              )}

              {/* Side-by-side follow-up visualization */}
              {hasBranch && (
                <div className="grid grid-cols-[32px_1fr_120px] border-b border-black/10">
                  <div className="bg-white/5 flex items-center justify-center text-[10px] text-white/20 font-mono" />
                  <div className="py-1.5 px-3 text-xs font-semibold" style={{ background: s.bg, color: s.text }}>
                    {step.content || step.title || s.label}
                  </div>
                  <div className="py-1.5 px-2 text-xs font-semibold"
                    style={{ background: getStyle("followup_ignored").bg, color: getStyle("followup_ignored").text }}>
                    {steps[i + 1]?.content || steps[i + 1]?.title || "Follow-up (Ignored)"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick add toolbar */}
      <div className="flex flex-wrap gap-1.5">
        <p className="text-[10px] text-white/30 w-full">Quick add:</p>
        {[
          "welcome", "message", "free_content", "ppv_content",
          "question", "condition", "followup_purchased", "followup_ignored",
        ].map(type => {
          const s = getStyle(type);
          return (
            <button key={type} onClick={() => onAddStep(type)}
              style={{ background: s.bg + "30", borderColor: s.bg + "40" }}
              className="px-2 py-1 rounded-md text-[10px] font-medium text-white/70 hover:text-white transition-all border">
              + {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ScriptFlowView;
