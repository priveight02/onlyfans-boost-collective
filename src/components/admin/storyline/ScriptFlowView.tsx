import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Image, Film, GitBranch, Clock, Trash2, Copy, ChevronUp, ChevronDown,
  GripVertical, Check, X, DollarSign,
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
  onUpdateStep?: (index: number, field: string, value: any) => void;
  onReorderSteps?: (fromIndex: number, toIndex: number) => void;
}

/* ── Google Sheet Color Map ── */
const STEP_STYLES: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  welcome:            { bg: "#00CED1", text: "#000", label: "Welcome", emoji: "👋" },
  message:            { bg: "#FFFF00", text: "#000", label: "Message", emoji: "💬" },
  free_content:       { bg: "#00FF00", text: "#000", label: "Free Content", emoji: "🎁" },
  ppv_content:        { bg: "#32CD32", text: "#000", label: "PPV Content", emoji: "💰" },
  content:            { bg: "#32CD32", text: "#000", label: "Content", emoji: "📦" },
  question:           { bg: "#FFD700", text: "#000", label: "Question", emoji: "❓" },
  condition:          { bg: "#00BFFF", text: "#000", label: "Condition", emoji: "⑂" },
  followup_purchased: { bg: "#DDA0DD", text: "#000", label: "Follow-up ✓", emoji: "✅" },
  followup:           { bg: "#DDA0DD", text: "#000", label: "Follow-up", emoji: "↩️" },
  followup_ignored:   { bg: "#FF4500", text: "#FFF", label: "Follow-up ✗", emoji: "🔄" },
  delay:              { bg: "#A9A9A9", text: "#000", label: "Delay", emoji: "⏱" },
  offer:              { bg: "#FFA500", text: "#000", label: "Offer", emoji: "⭐" },
  media:              { bg: "#FF8C00", text: "#000", label: "Media", emoji: "🎬" },
};

const STEP_TYPE_OPTIONS = [
  "welcome", "message", "free_content", "ppv_content", "question",
  "condition", "followup_purchased", "followup_ignored", "delay",
];

const getStyle = (type: string) => STEP_STYLES[type] || STEP_STYLES.message;

const ScriptFlowView = ({ steps, onEditStep, onAddStep, onRemoveStep, onMoveStep, onDuplicateStep, onUpdateStep, onReorderSteps }: Props) => {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const startEdit = (row: number, field: string, currentValue: string | number) => {
    if (!onUpdateStep) { onEditStep(row); return; }
    setEditingCell({ row, field });
    setEditValue(String(currentValue));
  };

  const commitEdit = () => {
    if (!editingCell || !onUpdateStep) return;
    const { row, field } = editingCell;
    const val = field === "price" || field === "delay_minutes" ? parseFloat(editValue) || 0 : editValue;
    onUpdateStep(row, field, val);
    setEditingCell(null);
  };

  const cancelEdit = () => setEditingCell(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") cancelEdit();
  };

  // Drag handlers
  const handleDragStart = (i: number) => {
    setDragIndex(i);
    dragRef.current = i;
  };
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOverIndex(i);
  };
  const handleDrop = (i: number) => {
    if (dragRef.current !== null && dragRef.current !== i && onReorderSteps) {
      onReorderSteps(dragRef.current, i);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragRef.current = null;
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragRef.current = null;
  };

  if (steps.length === 0) {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="space-y-2">
          <div className="text-white/20 text-sm">No steps yet. Start building your script.</div>
          <p className="text-white/10 text-xs">A script = 4-5 media items in the same setting with chat messages between them</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {["welcome", "message", "free_content", "ppv_content", "question", "condition"].map(type => {
            const s = getStyle(type);
            return (
              <button key={type} onClick={() => onAddStep(type)}
                style={{ background: s.bg, color: s.text }}
                className="px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
                {s.emoji} {s.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const totalPrice = steps.reduce((sum, s) => sum + (s.price || 0), 0);
  const mediaCount = steps.filter(s => s.media_type).length;

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/5">
        <span className="text-[10px] text-white/40">{steps.length} steps</span>
        <span className="text-[10px] text-white/40">•</span>
        <span className="text-[10px] text-white/40">{mediaCount} media</span>
        <span className="text-[10px] text-white/40">•</span>
        <span className="text-[10px] text-amber-400 font-semibold">${totalPrice} total</span>
        <span className="text-[10px] text-white/20 ml-auto">Click any cell to edit • Drag rows to reorder</span>
      </div>

      {/* Spreadsheet Canvas */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] shadow-xl">
        {/* Header */}
        <div className="grid grid-cols-[28px_28px_80px_1fr_120px_60px_50px_40px] bg-white/[0.06] border-b border-white/10">
          <div className="p-1.5 text-[8px] text-white/20 font-mono text-center">⠿</div>
          <div className="p-1.5 text-[8px] text-white/20 font-mono text-center">#</div>
          <div className="p-1.5 text-[8px] text-white/30 font-semibold">TYPE</div>
          <div className="p-1.5 text-[8px] text-white/30 font-semibold">CONTENT</div>
          <div className="p-1.5 text-[8px] text-white/30 font-semibold">MEDIA</div>
          <div className="p-1.5 text-[8px] text-white/30 font-semibold text-center">PRICE</div>
          <div className="p-1.5 text-[8px] text-white/30 font-semibold text-center">⏱</div>
          <div className="p-1.5 text-[8px] text-white/30 font-semibold text-center">⚡</div>
        </div>

        {/* Rows */}
        {steps.map((step, i) => {
          const s = getStyle(step.step_type);
          const isDragging = dragIndex === i;
          const isDragOver = dragOverIndex === i;
          const isEditing = editingCell?.row === i;

          return (
            <div key={i} className="group relative">
              <div
                className={`grid grid-cols-[28px_28px_80px_1fr_120px_60px_50px_40px] min-h-[38px] border-b transition-all ${
                  isDragging ? "opacity-40" : ""
                } ${isDragOver ? "border-t-2 border-t-accent" : "border-white/[0.06]"}`}
                style={{ background: s.bg + "18" }}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
              >
                {/* Drag handle */}
                <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-white/15 hover:text-white/40">
                  <GripVertical className="h-3 w-3" />
                </div>

                {/* Row number */}
                <div className="flex items-center justify-center text-[10px] font-mono text-white/25">
                  {i + 1}
                </div>

                {/* Type cell - colored badge */}
                <div className="flex items-center px-1.5 py-1">
                  {isEditing && editingCell.field === "step_type" ? (
                    <Select value={editValue} onValueChange={v => { onUpdateStep?.(i, "step_type", v); setEditingCell(null); }}>
                      <SelectTrigger className="h-6 text-[9px] bg-white/10 border-white/20 text-white w-full"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                        {STEP_TYPE_OPTIONS.map(t => {
                          const ts = getStyle(t);
                          return <SelectItem key={t} value={t} className="text-white text-[10px]">{ts.emoji} {ts.label}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <button
                      onClick={() => startEdit(i, "step_type", step.step_type)}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold truncate w-full text-left hover:brightness-110 transition-all"
                      style={{ background: s.bg, color: s.text }}
                    >
                      {s.emoji} {s.label}
                    </button>
                  )}
                </div>

                {/* Content cell */}
                <div className="flex items-center px-2 py-1 min-w-0">
                  {isEditing && editingCell.field === "content" ? (
                    <div className="flex items-center gap-1 w-full">
                      <Textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={commitEdit}
                        autoFocus
                        className="min-h-[28px] h-7 bg-white/10 border-white/20 text-white text-xs resize-none py-1"
                      />
                    </div>
                  ) : (
                    <span
                      onClick={() => startEdit(i, "content", step.content || "")}
                      className="text-xs text-white/80 truncate cursor-text hover:text-white transition-colors w-full"
                      title={step.content || "Click to edit"}
                    >
                      {step.content || step.title || <span className="text-white/20 italic">Click to add content...</span>}
                    </span>
                  )}
                </div>

                {/* Media cell */}
                <div className="flex items-center px-1.5 py-1 min-w-0">
                  {isEditing && editingCell.field === "media_url" ? (
                    <Input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={commitEdit}
                      autoFocus
                      className="h-6 bg-white/10 border-white/20 text-white text-[10px]"
                      placeholder="e.g. 2 selfies"
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(i, "media_url", step.media_url || "")}
                      className="text-[10px] text-white/40 truncate cursor-text hover:text-white/60 transition-colors"
                      title={step.media_url}
                    >
                      {step.media_url ? (
                        <span className="flex items-center gap-1">
                          {step.media_type === "image" ? "📸" : step.media_type === "video" ? "🎬" : step.media_type === "mixed" ? "📎" : ""} {step.media_url}
                        </span>
                      ) : (
                        <span className="text-white/15 italic">—</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Price cell */}
                <div className="flex items-center justify-center px-1 py-1">
                  {isEditing && editingCell.field === "price" ? (
                    <Input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={commitEdit}
                      autoFocus
                      type="number"
                      className="h-6 w-14 bg-white/10 border-white/20 text-white text-[10px] text-center"
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(i, "price", step.price)}
                      className={`text-[11px] font-bold cursor-text transition-colors ${
                        step.price > 0 ? "text-amber-400 hover:text-amber-300" : "text-white/15 hover:text-white/30"
                      }`}
                    >
                      {step.price > 0 ? `$${step.price}` : "—"}
                    </span>
                  )}
                </div>

                {/* Delay cell */}
                <div className="flex items-center justify-center px-1 py-1">
                  {isEditing && editingCell.field === "delay_minutes" ? (
                    <Input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={commitEdit}
                      autoFocus
                      type="number"
                      className="h-6 w-10 bg-white/10 border-white/20 text-white text-[10px] text-center"
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(i, "delay_minutes", step.delay_minutes)}
                      className={`text-[10px] cursor-text transition-colors ${
                        step.delay_minutes > 0 ? "text-blue-300" : "text-white/15 hover:text-white/30"
                      }`}
                    >
                      {step.delay_minutes > 0 ? `${step.delay_minutes}m` : "—"}
                    </span>
                  )}
                </div>

                {/* Actions cell */}
                <div className="flex items-center justify-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-0.5 hover:bg-white/10 rounded" onClick={() => onDuplicateStep(i)}>
                    <Copy className="h-2.5 w-2.5 text-white/30" />
                  </button>
                  <button className="p-0.5 hover:bg-red-500/20 rounded" onClick={() => onRemoveStep(i)}>
                    <Trash2 className="h-2.5 w-2.5 text-red-400/50" />
                  </button>
                </div>
              </div>

              {/* Branch visualization for conditions */}
              {step.step_type === "condition" && (
                <div className="grid grid-cols-[56px_1fr] border-b border-white/[0.06]">
                  <div className="bg-white/[0.02]" />
                  <div className="flex text-[10px]">
                    <div className="flex-1 py-1 px-3 bg-emerald-500/10 text-emerald-400 font-semibold text-center border-r border-white/5">
                      ✓ {step.condition_logic?.condition || "If YES / Responded"}
                    </div>
                    <div className="w-[140px] py-1 px-2 bg-red-500/10 text-red-400 font-semibold text-center">
                      ✗ If NO / Ignored
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick add toolbar */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <p className="text-[10px] text-white/25 mr-1">Add:</p>
        {STEP_TYPE_OPTIONS.map(type => {
          const s = getStyle(type);
          return (
            <button key={type} onClick={() => onAddStep(type)}
              style={{ background: s.bg + "20", borderColor: s.bg + "30" }}
              className="px-2 py-1 rounded-md text-[10px] font-medium text-white/60 hover:text-white transition-all border hover:brightness-125">
              {s.emoji} {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ScriptFlowView;
