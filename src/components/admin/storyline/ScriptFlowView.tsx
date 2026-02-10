import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Image, Film, HelpCircle, GitBranch, Send, Clock,
  DollarSign, Trash2, Copy, ChevronUp, ChevronDown, Edit, Plus,
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

const STEP_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  welcome:            { bg: "bg-cyan-500",     border: "border-cyan-600",     text: "text-cyan-950",  label: "Welcome Message" },
  message:            { bg: "bg-yellow-400",   border: "border-yellow-500",   text: "text-yellow-950", label: "Message" },
  free_content:       { bg: "bg-green-500",    border: "border-green-600",    text: "text-green-950", label: "Free Content" },
  ppv_content:        { bg: "bg-green-400",    border: "border-green-500",    text: "text-green-950", label: "PPV Content" },
  content:            { bg: "bg-green-400",    border: "border-green-500",    text: "text-green-950", label: "Content" },
  question:           { bg: "bg-yellow-300",   border: "border-yellow-400",   text: "text-yellow-950", label: "Question" },
  condition:          { bg: "bg-blue-400",     border: "border-blue-500",     text: "text-blue-950",  label: "Condition Branch" },
  followup_purchased: { bg: "bg-pink-300",     border: "border-pink-400",     text: "text-pink-950",  label: "Follow-up (Purchased)" },
  followup:           { bg: "bg-pink-300",     border: "border-pink-400",     text: "text-pink-950",  label: "Follow-up" },
  followup_ignored:   { bg: "bg-red-500",      border: "border-red-600",      text: "text-white",     label: "Follow-up (Ignored)" },
  delay:              { bg: "bg-gray-400",     border: "border-gray-500",     text: "text-gray-900",  label: "Delay" },
  offer:              { bg: "bg-amber-400",    border: "border-amber-500",    text: "text-amber-950", label: "Offer" },
  media:              { bg: "bg-orange-400",   border: "border-orange-500",   text: "text-orange-950", label: "Media" },
};

const getColor = (type: string) => STEP_COLORS[type] || STEP_COLORS.message;

const ScriptFlowView = ({ steps, onEditStep, onAddStep, onRemoveStep, onMoveStep, onDuplicateStep }: Props) => {
  if (steps.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-white/20 text-sm">No steps yet. Start building your script flow.</div>
        <div className="flex flex-wrap justify-center gap-2">
          {["welcome", "message", "free_content", "ppv_content", "question", "condition"].map(type => {
            const c = getColor(type);
            return (
              <button key={type} onClick={() => onAddStep(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${c.bg} ${c.text} hover:opacity-90 transition-opacity`}>
                + {c.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Group steps for visual branching
  const renderStep = (step: ScriptStep, index: number) => {
    const c = getColor(step.step_type);
    const isCondition = step.step_type === "condition";
    const isPPV = step.step_type === "ppv_content" || (step.step_type === "content" && step.price > 0) || step.step_type === "offer";
    const isFollowup = step.step_type === "followup_purchased" || step.step_type === "followup_ignored" || step.step_type === "followup";
    const isBranch = isCondition;

    return (
      <div key={index} className="group relative">
        {/* Connector line */}
        {index > 0 && (
          <div className="flex justify-center py-0.5">
            <div className="w-px h-4 bg-white/10" />
          </div>
        )}

        {/* Step row */}
        <div className={`relative flex items-stretch rounded-lg overflow-hidden border ${c.border}/30 hover:${c.border}/60 transition-all group`}>
          {/* Color bar */}
          <div className={`w-1.5 ${c.bg} shrink-0`} />

          {/* Main content area */}
          <div className={`flex-1 ${c.bg}/10 px-3 py-2 min-h-[40px] flex items-center gap-3`}>
            {/* Step number */}
            <span className="text-[9px] text-white/20 font-mono w-4 shrink-0">#{index + 1}</span>

            {/* Type badge */}
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text} shrink-0 whitespace-nowrap`}>
              {c.label}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {step.title && (
                <p className="text-xs font-semibold text-white truncate">{step.title}</p>
              )}
              {step.content && (
                <p className="text-[11px] text-white/60 truncate">{step.content}</p>
              )}
              {step.media_url && (
                <p className="text-[10px] text-white/40 truncate italic">{step.media_url}</p>
              )}
              {!step.title && !step.content && (
                <p className="text-[10px] text-white/20 italic">Click to edit...</p>
              )}
            </div>

            {/* Price badge */}
            {step.price > 0 && (
              <Badge className={`${c.bg} ${c.text} text-[10px] font-bold shrink-0 border-0`}>
                ${step.price}
              </Badge>
            )}

            {/* Media indicator */}
            {step.media_type && (
              <Badge variant="outline" className="text-[9px] border-white/10 text-white/40 shrink-0 gap-0.5">
                {step.media_type === "image" && <><Image className="h-2.5 w-2.5" /> Pic</>}
                {step.media_type === "video" && <><Film className="h-2.5 w-2.5" /> Vid</>}
                {step.media_type === "mixed" && <><Film className="h-2.5 w-2.5" /> Mixed</>}
              </Badge>
            )}

            {/* Delay */}
            {step.delay_minutes > 0 && (
              <Badge variant="outline" className="text-[9px] border-white/10 text-white/30 shrink-0 gap-0.5">
                <Clock className="h-2 w-2" /> {step.delay_minutes}m
              </Badge>
            )}

            {/* Condition display */}
            {isBranch && step.condition_logic?.condition && (
              <Badge variant="outline" className="text-[9px] border-blue-500/20 text-blue-400 shrink-0 gap-0.5">
                <GitBranch className="h-2.5 w-2.5" /> {step.condition_logic.condition}
              </Badge>
            )}
          </div>

          {/* Actions (show on hover) */}
          <div className="flex items-center gap-0.5 px-1.5 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/30 hover:text-white" onClick={() => onEditStep(index)}>
              <Edit className="h-2.5 w-2.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/30 hover:text-white" onClick={() => onMoveStep(index, "up")}>
              <ChevronUp className="h-2.5 w-2.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/30 hover:text-white" onClick={() => onMoveStep(index, "down")}>
              <ChevronDown className="h-2.5 w-2.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/30 hover:text-white" onClick={() => onDuplicateStep(index)}>
              <Copy className="h-2.5 w-2.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-400/50 hover:text-red-400" onClick={() => onRemoveStep(index)}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>

        {/* Branch visualization for conditions */}
        {isBranch && (
          <div className="flex justify-center py-1">
            <div className="flex items-center gap-4 text-[9px]">
              <div className="flex items-center gap-1 text-blue-400">
                <div className="w-8 h-px bg-blue-400/30" />
                <span>✓ Yes</span>
                <div className="w-8 h-px bg-blue-400/30" />
              </div>
              <GitBranch className="h-3 w-3 text-blue-400/40" />
              <div className="flex items-center gap-1 text-red-400">
                <div className="w-8 h-px bg-red-400/30" />
                <span>✗ No</span>
                <div className="w-8 h-px bg-red-400/30" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0">
      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4 space-y-0">
        {steps.map((step, i) => renderStep(step, i))}
      </div>

      {/* Quick add bar */}
      <div className="flex flex-wrap gap-1.5 pt-3">
        <p className="text-[10px] text-white/30 w-full">Quick add:</p>
        {[
          { type: "welcome", label: "+ Welcome" },
          { type: "message", label: "+ Message" },
          { type: "free_content", label: "+ Free Content" },
          { type: "ppv_content", label: "+ PPV Content" },
          { type: "question", label: "+ Question" },
          { type: "condition", label: "+ Branch" },
          { type: "followup_purchased", label: "+ Follow-up (Bought)" },
          { type: "followup_ignored", label: "+ Follow-up (Ignored)" },
        ].map(b => {
          const c = getColor(b.type);
          return (
            <button key={b.type} onClick={() => onAddStep(b.type)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium ${c.bg}/20 text-white/60 hover:${c.bg}/40 hover:text-white transition-all border border-white/5`}>
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ScriptFlowView;
