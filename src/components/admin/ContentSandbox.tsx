import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignStartHorizontal, AlignStartVertical, ArrowRight, Bold, Check, Circle, Copy, Diamond, Download,
  Eraser, Grip, Italic, Layers, Link2, Loader2, Lock, Map as MapIcon, Maximize, MousePointer, Move, Pencil,
  Redo2, RotateCcw, Save, Search, Sparkles, Square, StickyNote,
  Trash2, Triangle, Type, Underline, Unlink, Unlock, ZoomIn, ZoomOut, RefreshCw, Palette,
  Send, FileDown, Grid3X3, Magnet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportSandboxToDrafts, pushSandboxDirectToPlatforms, getConnectedAccounts, DEFAULT_BEST_TIMES, type ExecutionMode } from "@/lib/contentSync";

/* ─── Types ─── */
type Tool = "select" | "pan" | "pen" | "eraser" | "text" | "note" | "rectangle" | "ellipse" | "triangle" | "diamond" | "arrow";
type ShapeKind = "rectangle" | "ellipse" | "triangle" | "diamond" | "arrow";
type ElementKind = "content" | "note" | "text" | "shape";
type Point = { x: number; y: number };
type Viewport = { x: number; y: number; zoom: number };

interface SandboxStroke {
  id: string;
  tool: "pen" | "eraser";
  color: string;
  size: number;
  points: Point[];
}

interface SandboxElement {
  id: string;
  kind: ElementKind;
  x: number; y: number; width: number; height: number; z: number;
  color: string;
  links: string[];
  groupId?: string;
  sourceItemId?: string;
  data?: any;
  text?: string;
  annotation?: string;
  shape?: ShapeKind;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
}

type InteractionState =
  | { type: "pan"; originClient: Point; originViewport: Viewport }
  | { type: "draw"; tool: "pen" | "eraser"; color: string; size: number; points: Point[] }
  | { type: "drag"; anchor: Point; originPositions: Record<string, Point> }
  | { type: "resize"; elementId: string; anchor: Point; originRect: Pick<SandboxElement, "x" | "y" | "width" | "height"> }
  | { type: "marquee"; origin: Point; current: Point };

interface SandboxSnapshot { elements: SandboxElement[]; strokes: SandboxStroke[]; }

/* ─── Stroke bounding box helper ─── */
const strokeBounds = (s: SandboxStroke): { x: number; y: number; w: number; h: number } => {
  if (!s.points.length) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of s.points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const pad = s.size / 2;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + s.size, h: maxY - minY + s.size };
};

/* ─── Constants ─── */
const STORAGE_KEY = "content_sandbox_state_v7";
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;
const DEFAULT_VIEWPORT: Viewport = { x: 32, y: 32, zoom: 1 };
const MAX_UNDO = 80;
const GRID_SIZE = 20;
const AUTOSAVE_MS = 2500;

const PRESET_COLORS = [
  "#ffffff", "#e2e8f0", "#94a3b8", "#64748b",
  "#3b82f6", "#60a5fa", "#2563eb", "#1d4ed8",
  "#8b5cf6", "#a78bfa", "#7c3aed", "#6d28d9",
  "#ec4899", "#f472b6", "#db2777", "#be185d",
  "#ef4444", "#f87171", "#dc2626", "#b91c1c",
  "#f97316", "#fb923c", "#ea580c", "#c2410c",
  "#eab308", "#facc15", "#ca8a04", "#a16207",
  "#22c55e", "#4ade80", "#16a34a", "#15803d",
  "#14b8a6", "#2dd4bf", "#0d9488", "#0f766e",
  "#06b6d4", "#22d3ee", "#0891b2", "#0e7490",
];

const BRUSH_SIZES = [1, 2, 3, 4, 6, 8, 10, 14, 20, 28, 40];
const ERASER_SIZES = [6, 10, 16, 24, 36, 50, 70];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96];
const FONT_FAMILIES = [
  "Inter, sans-serif", "Georgia, serif", "Courier New, monospace",
  "Comic Sans MS, cursive", "Impact, sans-serif", "Arial Black, sans-serif",
  "Trebuchet MS, sans-serif", "Verdana, sans-serif", "Times New Roman, serif",
];

const TOOL_ITEMS: { id: Tool; label: string; icon: any }[] = [
  { id: "select", label: "V", icon: MousePointer },
  { id: "pan", label: "H", icon: Move },
  { id: "pen", label: "P", icon: Pencil },
  { id: "eraser", label: "E", icon: Eraser },
  { id: "text", label: "T", icon: Type },
  { id: "note", label: "N", icon: StickyNote },
  { id: "rectangle", label: "R", icon: Square },
  { id: "ellipse", label: "O", icon: Circle },
  { id: "triangle", label: "Tri", icon: Triangle },
  { id: "diamond", label: "D", icon: Diamond },
  { id: "arrow", label: "Arr", icon: ArrowRight },
];

/* ─── Helpers ─── */
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const center = (el: SandboxElement) => ({ x: el.x + el.width / 2, y: el.y + el.height / 2 });
const nextZ = (els: SandboxElement[]) => (els.length ? Math.max(...els.map(e => e.z)) + 1 : 1);
const getSource = (item: any) => (typeof item?.metadata?.source === "string" ? item.metadata.source : "");
const gridPos = (i: number, cols: number) => ({ x: 48 + (i % cols) * 312, y: 48 + Math.floor(i / cols) * 228 });

const scenePoint = (cx: number, cy: number, board: HTMLDivElement | null, vp: Viewport): Point => {
  if (!board) return { x: 0, y: 0 };
  const r = board.getBoundingClientRect();
  return { x: (cx - r.left - vp.x) / vp.zoom, y: (cy - r.top - vp.y) / vp.zoom };
};

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  return { r: parseInt(h.substring(0, 2), 16) || 0, g: parseInt(h.substring(2, 4), 16) || 0, b: parseInt(h.substring(4, 6), 16) || 0 };
};
const rgbToHex = (r: number, g: number, b: number) => "#" + [r, g, b].map(v => clamp(v, 0, 255).toString(16).padStart(2, "0")).join("");

const parseAi = (raw: unknown) => {
  const text = typeof raw === "string" ? raw : typeof raw === "object" && raw !== null && "choices" in raw ? (raw as any)?.choices?.[0]?.message?.content || JSON.stringify(raw) : JSON.stringify(raw ?? "");
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0].replace(/,\s*([}\]])/g, "$1"));
  return { title: "Evolved concept", caption: cleaned, platform: "instagram", content_type: "post", hashtags: [], evolution_notes: "Combined inside Sandbox", viral_score: 82 };
};

const shapeSvg = (shape: ShapeKind, color: string) => {
  const fill = color + "24";
  switch (shape) {
    case "rectangle": return <div className="h-full w-full rounded-xl border-2" style={{ borderColor: color, backgroundColor: fill }} />;
    case "ellipse": return <div className="h-full w-full rounded-full border-2" style={{ borderColor: color, backgroundColor: fill }} />;
    case "triangle": return <svg viewBox="0 0 100 100" className="h-full w-full"><polygon points="50,6 94,94 6,94" fill={fill} stroke={color} strokeWidth="2" /></svg>;
    case "diamond": return <svg viewBox="0 0 100 100" className="h-full w-full"><polygon points="50,5 95,50 50,95 5,50" fill={fill} stroke={color} strokeWidth="2" /></svg>;
    case "arrow": return <svg viewBox="0 0 100 100" className="h-full w-full"><path d="M8 50h68" stroke={color} strokeWidth="8" strokeLinecap="round" /><path d="M56 20l30 30-30 30" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default: return null;
  }
};

/* ─── Color Picker ─── */
const ColorPicker = ({ color, onChange }: { color: string; onChange: (c: string) => void }) => {
  const rgb = hexToRgb(color);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="h-7 w-7 rounded-lg border border-white/10 transition-transform hover:scale-105" style={{ backgroundColor: color }} />
      </PopoverTrigger>
      <PopoverContent className="w-[280px] border-white/10 bg-[hsl(222,35%,10%)] p-3" side="bottom" align="start">
        <div className="space-y-3">
          <div className="grid grid-cols-10 gap-1">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => onChange(c)}
                className={cn("h-5 w-5 rounded-md border transition-transform hover:scale-110", color === c ? "border-white scale-110" : "border-transparent")}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={e => onChange(e.target.value)} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
            <div className="flex-1">
              <label className="text-[9px] uppercase tracking-wider text-white/40">Hex</label>
              <input value={color} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
                className="h-6 w-full rounded border border-white/10 bg-white/5 px-2 text-[11px] text-white outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["r", "g", "b"] as const).map(ch => (
              <div key={ch}>
                <label className="text-[9px] uppercase tracking-wider text-white/40">{ch}</label>
                <input type="number" min={0} max={255} value={rgb[ch]}
                  onChange={e => onChange(rgbToHex(ch === "r" ? Number(e.target.value) : rgb.r, ch === "g" ? Number(e.target.value) : rgb.g, ch === "b" ? Number(e.target.value) : rgb.b))}
                  className="h-6 w-full rounded border border-white/10 bg-white/5 px-2 text-[11px] text-white outline-none" />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ─── ElementView ─── */
const ElementView = memo(function ElementView({ el, selected, linkSrc, onDown, onResize, onTextChange }: {
  el: SandboxElement; selected: boolean; linkSrc: boolean;
  onDown: (e: React.PointerEvent, el: SandboxElement) => void;
  onResize: (e: React.PointerEvent, el: SandboxElement) => void;
  onTextChange: (id: string, v: string) => void;
}) {
  const src = el.data ? getSource(el.data) : "";

  return (
    <div
      className={cn("absolute", selected && "ring-2 ring-blue-400/80", linkSrc && "ring-2 ring-emerald-400")}
      style={{ left: el.x, top: el.y, width: el.width, height: el.height, zIndex: el.z, willChange: "transform" }}
      onPointerDown={e => onDown(e, el)}
    >
      {el.kind === "content" && el.data && (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/8 bg-[hsl(222,30%,12%)] shadow-lg">
          <div className="flex items-center gap-2 border-b border-white/6 px-3 py-1.5">
            <Grip className="h-3 w-3 text-white/25" />
            <span className="text-[10px] text-white/50 capitalize">{el.data.platform}</span>
            <span className={cn("text-[10px] capitalize", el.data.status === "published" ? "text-emerald-400/80" : "text-white/40")}>{el.data.status}</span>
            {src && <span className="text-[10px] text-white/30">{src.replace(/_/g, " ")}</span>}
          </div>
          <div className="flex-1 space-y-1.5 overflow-hidden px-3 py-2">
            <p className="line-clamp-2 text-[13px] font-medium text-white/90">{el.data.title}</p>
            <p className="line-clamp-4 text-[11px] leading-relaxed text-white/45">{el.data.caption || "No caption"}</p>
            {el.annotation && <div className="rounded-lg border border-blue-400/15 bg-blue-400/8 px-2 py-1 text-[10px] text-blue-300/80 line-clamp-2">{el.annotation}</div>}
          </div>
          <div className="border-t border-white/6 px-3 py-1.5">
            <div className="flex items-center justify-between text-[9px] text-white/30">
              <span>{el.data.hashtags?.length || 0} tags</span>
              <span>{el.links.length} links</span>
            </div>
            {Number(el.data.viral_score || 0) > 0 && (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/6">
                <div className="h-full rounded-full bg-blue-500/60 transition-all" style={{ width: `${clamp(Number(el.data.viral_score || 0), 0, 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {el.kind === "note" && (
        <div className="flex h-full flex-col rounded-xl border p-3 shadow-lg" style={{ borderColor: el.color + "30", backgroundColor: el.color + "14" }}>
          <div className="mb-1.5 flex items-center gap-2">
            <Grip className="h-3 w-3" style={{ color: el.color + "60" }} />
            <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: el.color + "80" }}>Note</span>
          </div>
          <textarea value={el.text || ""} onPointerDown={e => e.stopPropagation()} onChange={e => onTextChange(el.id, e.target.value)}
            className="h-full w-full resize-none border-0 bg-transparent text-[13px] text-white/85 outline-none placeholder:text-white/25" placeholder="Write..." />
        </div>
      )}

      {el.kind === "text" && (
        <div className="flex h-full items-start rounded-xl border border-dashed border-white/10 bg-white/3 p-3 shadow-sm">
          <div contentEditable suppressContentEditableWarning onPointerDown={e => e.stopPropagation()}
            onBlur={e => onTextChange(el.id, e.currentTarget.textContent || "")}
            className="w-full whitespace-pre-wrap break-words outline-none"
            style={{ color: el.color, fontSize: el.fontSize || 16, fontFamily: el.fontFamily || "Inter, sans-serif", fontWeight: el.fontWeight || "normal", fontStyle: el.fontStyle || "normal", textDecoration: el.textDecoration || "none" }}
          >{el.text || "Type here"}</div>
        </div>
      )}

      {el.kind === "shape" && el.shape && (
        <div className="h-full rounded-xl border border-white/6 bg-white/3 p-2">{shapeSvg(el.shape, el.color)}</div>
      )}

      {el.groupId && <div className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-emerald-400 border border-emerald-900" title="Grouped" />}
      <button type="button" aria-label="Resize" className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border border-white/15 bg-white/10" onPointerDown={e => onResize(e as any, el)} />
    </div>
  );
});

/* ─── Main ─── */
const ContentSandbox = ({ items, onRefresh }: { items: any[]; onRefresh: () => void }) => {
  const isMobile = useIsMobile();
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const elsRef = useRef<SandboxElement[]>([]);
  const selRef = useRef<Set<string>>(new Set());
  const vpRef = useRef<Viewport>(DEFAULT_VIEWPORT);
  const rafRef = useRef<number>(0);

  const [elements, setElements] = useState<SandboxElement[]>([]);
  const [strokes, setStrokes] = useState<SandboxStroke[]>([]);
  const [draftStroke, setDraftStroke] = useState<SandboxStroke | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(4);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importMode, setImportMode] = useState<"all" | "drafts" | "non-drafts" | "competitor">("all");
  const [showInspector, setShowInspector] = useState(false);
  const [evolverPrompt, setEvolverPrompt] = useState("");
  const [evolverPlatform, setEvolverPlatform] = useState("instagram");
  const [evolving, setEvolving] = useState(false);
  const [savingBack, setSavingBack] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Push to platform states
  const [showPushPlatform, setShowPushPlatform] = useState(false);
  const [pushAvailablePlatforms, setPushAvailablePlatforms] = useState<{ platform: string; connected: boolean; username?: string }[]>([]);
  const [pushSelectedPlatforms, setPushSelectedPlatforms] = useState<Set<string>>(new Set());
  const [pushMode, setPushMode] = useState<ExecutionMode>("manual");
  const [pushingToPlatform, setPushingToPlatform] = useState(false);
  const [pushScope, setPushScope] = useState<"all" | "selected">("all");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [locked, setLocked] = useState(true);
  const [zoomSpeed, setZoomSpeed] = useState(1);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<Set<string>>(new Set());
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [mouseScene, setMouseScene] = useState<Point>({ x: 0, y: 0 });
  const spaceHeldRef = useRef(false);
  const selStrokesRef = useRef<Set<string>>(new Set());

  const HISTORY_KEY = STORAGE_KEY + "_history";
  const undoStack = useRef<SandboxSnapshot[]>([]);
  const redoStack = useRef<SandboxSnapshot[]>([]);
  const strokesRef = useRef(strokes);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  const persistHistory = useCallback(() => {
    try {
      const payload = JSON.stringify({ undo: undoStack.current, redo: redoStack.current });
      // Only persist if under ~4MB to avoid quota issues
      if (payload.length < 4_000_000) {
        localStorage.setItem(HISTORY_KEY, payload);
      } else {
        // Trim oldest undo entries until it fits
        const trimmed = { undo: undoStack.current.slice(-40), redo: redoStack.current.slice(-20) };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      }
    } catch { /* storage full – silently skip */ }
  }, [HISTORY_KEY]);

  const pushUndo = useCallback(() => {
    undoStack.current.push({ elements: clone(elsRef.current), strokes: clone(strokesRef.current) });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
    setDirty(true);
    persistHistory();
  }, [persistHistory]);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    redoStack.current.push({ elements: clone(elsRef.current), strokes: clone(strokesRef.current) });
    const s = undoStack.current.pop()!;
    setElements(s.elements); setStrokes(s.strokes); setDirty(true);
    persistHistory();
  }, [persistHistory]);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    undoStack.current.push({ elements: clone(elsRef.current), strokes: clone(strokesRef.current) });
    const s = redoStack.current.pop()!;
    setElements(s.elements); setStrokes(s.strokes); setDirty(true);
    persistHistory();
  }, [persistHistory]);

  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 7, elements: elsRef.current, strokes: strokesRef.current }));
    persistHistory();
    setDirty(false); setLastSaved(new Date());
  }, [persistHistory]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setElements(Array.isArray(p?.elements) ? p.elements : []);
        setStrokes(Array.isArray(p?.strokes) ? p.strokes : []);
      }
      // Restore full undo/redo history from previous sessions
      const histRaw = localStorage.getItem(HISTORY_KEY);
      if (histRaw) {
        const h = JSON.parse(histRaw);
        if (Array.isArray(h?.undo)) undoStack.current = h.undo;
        if (Array.isArray(h?.redo)) redoStack.current = h.redo;
      }
      setLastSaved(new Date());
    } catch { /* noop */ }
  }, [HISTORY_KEY]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, elements, strokes, save]);

  useEffect(() => { elsRef.current = elements; }, [elements]);
  useEffect(() => { selRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => { vpRef.current = viewport; }, [viewport]);

  useEffect(() => {
    if (!locked) { document.body.style.overflow = ""; return; }
    wrapperRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [locked]);

  const ordered = useMemo(() => [...elements].sort((a, b) => a.z - b.z), [elements]);
  const primaryId = useMemo(() => Array.from(selectedIds)[0] || null, [selectedIds]);
  const primaryEl = useMemo(() => ordered.find(e => e.id === primaryId) || null, [ordered, primaryId]);
  const importedSrcIds = useMemo(() => new Set(elements.map(e => e.sourceItemId).filter(Boolean)), [elements]);

  const importable = useMemo(() => {
    const q = importQuery.trim().toLowerCase();
    return items.filter(item => {
      const ok = importMode === "all" || (importMode === "drafts" && item.status === "draft")
        || (importMode === "non-drafts" && item.status !== "draft")
        || (importMode === "competitor" && ["competitor_intel", "swot_analysis", "gap_analysis"].includes(getSource(item)));
      if (!ok) return false;
      if (!q) return true;
      return [item.title, item.caption, item.platform, item.content_type, getSource(item)].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [importMode, importQuery, items]);

  /* ─── Canvas ─── */
  const drawScene = useCallback(() => {
    const board = boardRef.current, canvas = canvasRef.current;
    if (!board || !canvas) return;
    const rect = board.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = rect.width * dpr, h = rect.height * dpr;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    const vp = vpRef.current;
    ctx.translate(vp.x, vp.y);
    ctx.scale(vp.zoom, vp.zoom);

    const lookup = new Map(elsRef.current.map(e => [e.id, e]));
    for (const el of elsRef.current) {
      for (const tid of el.links) {
        const t = lookup.get(tid);
        if (!t) continue;
        const f = center(el), to = center(t);
        ctx.beginPath(); ctx.strokeStyle = "rgba(96,165,250,0.35)"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
        ctx.moveTo(f.x, f.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.setLineDash([]);
        const a = Math.atan2(to.y - f.y, to.x - f.x), hl = 8;
        ctx.beginPath(); ctx.fillStyle = "rgba(96,165,250,0.6)";
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - hl * Math.cos(a - Math.PI / 6), to.y - hl * Math.sin(a - Math.PI / 6));
        ctx.lineTo(to.x - hl * Math.cos(a + Math.PI / 6), to.y - hl * Math.sin(a + Math.PI / 6));
        ctx.closePath(); ctx.fill();
      }
    }

    const ds = draftStroke;
    const all = ds ? [...strokesRef.current, ds] : strokesRef.current;
    for (const s of all) {
      if (s.points.length < 2) continue;
      ctx.beginPath(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = s.size;
      ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = s.color;
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }, [draftStroke]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawScene);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawScene, elements, strokes, viewport]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const obs = new ResizeObserver(() => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(drawScene); });
    obs.observe(board);
    return () => obs.disconnect();
  }, [drawScene]);

  /* ─── Element ops ─── */
  const linkEls = useCallback((from: string, to: string) => {
    pushUndo();
    setElements(p => p.map(e => e.id !== from ? e : { ...e, links: e.links.includes(to) ? e.links.filter(i => i !== to) : [...e.links, to] }));
  }, [pushUndo]);

  const addEl = useCallback((t: Tool, pt: Point) => {
    pushUndo();
    const z = nextZ(elsRef.current);
    const base: Partial<SandboxElement> = { id: `sb-${crypto.randomUUID()}`, x: pt.x, y: pt.y, z, color: activeColor, links: [], annotation: "", fontSize, fontFamily, fontWeight: "normal", fontStyle: "normal", textDecoration: "none" };
    let el: SandboxElement | null = null;
    if (t === "note") el = { ...base, kind: "note", width: 240, height: 180, text: "" } as SandboxElement;
    if (t === "text") el = { ...base, kind: "text", width: 260, height: 96, text: "Type here" } as SandboxElement;
    if (["rectangle", "ellipse", "triangle", "diamond", "arrow"].includes(t))
      el = { ...base, kind: "shape", width: t === "arrow" ? 220 : 180, height: t === "arrow" ? 80 : 160, shape: t as ShapeKind } as SandboxElement;
    if (!el) return;
    setElements(p => [...p, el!]);
    setSelectedIds(new Set([el.id]));
  }, [activeColor, pushUndo, fontSize, fontFamily]);

  const updateEl = useCallback((id: string, patch: Partial<SandboxElement>) => {
    setElements(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
    setDirty(true);
  }, []);

  const updateContentField = useCallback((field: string, value: any) => {
    if (!primaryEl || primaryEl.kind !== "content") return;
    pushUndo();
    setElements(p => p.map(e => e.id !== primaryEl.id ? e : { ...e, data: { ...e.data, [field]: value } }));
  }, [primaryEl, pushUndo]);

  const bringForward = useCallback(() => {
    const ids = Array.from(selRef.current);
    if (!ids.length) return;
    setElements(p => { let z = nextZ(p); return p.map(e => ids.includes(e.id) ? { ...e, z: z++ } : e); });
  }, []);

  const duplicateSel = useCallback(() => {
    const ids = Array.from(selRef.current);
    if (!ids.length) return;
    pushUndo();
    const src = elsRef.current.filter(e => ids.includes(e.id));
    let z = nextZ(elsRef.current);
    const dups = src.map(e => ({ ...clone(e), id: `sb-${crypto.randomUUID()}`, x: e.x + 28, y: e.y + 28, z: z++, links: [] }));
    setElements(p => [...p, ...dups]);
    setSelectedIds(new Set(dups.map(e => e.id)));
  }, [pushUndo]);

  const deleteSel = useCallback(() => {
    const ids = new Set(selRef.current);
    if (!ids.size) return;
    pushUndo();
    setElements(p => p.filter(e => !ids.has(e.id)).map(e => ({ ...e, links: e.links.filter(l => !ids.has(l)) })));
    setSelectedIds(new Set()); setLinkSourceId(null);
  }, [pushUndo]);

  const clearBoard = useCallback(() => {
    if (!confirm("Clear the entire board? All elements and strokes will be removed. You can undo with Ctrl+Z.")) return;
    pushUndo();
    setElements([]); setStrokes([]); setSelectedIds(new Set()); setLinkSourceId(null);
  }, [pushUndo]);

  const clearInk = useCallback(() => { pushUndo(); setStrokes([]); }, [pushUndo]);

  const groupSelected = useCallback(() => {
    const ids = Array.from(selRef.current);
    if (ids.length < 2) { toast.info("Select 2+ elements to group"); return; }
    pushUndo();
    const gid = `grp-${crypto.randomUUID()}`;
    setElements(p => p.map(e => ids.includes(e.id) ? { ...e, groupId: gid } : e));
    toast.success(`${ids.length} elements grouped`);
  }, [pushUndo]);

  const ungroupSelected = useCallback(() => {
    const ids = Array.from(selRef.current);
    if (!ids.length) return;
    pushUndo();
    setElements(p => p.map(e => ids.includes(e.id) ? { ...e, groupId: undefined } : e));
  }, [pushUndo]);

  const autoArrange = useCallback(() => {
    pushUndo();
    const ids = Array.from(selRef.current);
    const targets = ids.length ? ids : elsRef.current.map(e => e.id);
    const cols = isMobile ? 1 : 3;
    let i = 0;
    setElements(p => p.map(e => { if (!targets.includes(e.id)) return e; const pt = gridPos(i++, cols); return { ...e, x: pt.x, y: pt.y }; }));
  }, [isMobile, pushUndo]);

  const importItems = useCallback((rows: any[]) => {
    const existing = new Set(elsRef.current.map(e => e.sourceItemId).filter(Boolean));
    const next = rows.filter(item => !existing.has(item.id));
    if (!next.length) { toast.info("Already on the board"); return; }
    pushUndo();
    const cols = isMobile ? 1 : 3;
    let z = nextZ(elsRef.current);
    const imported = next.map((item, i) => ({
      id: `sb-${crypto.randomUUID()}`, kind: "content" as const, x: gridPos(i, cols).x, y: gridPos(i, cols).y,
      width: 284, height: 192, z: z++, color: "#3b82f6", links: [], sourceItemId: item.id,
      data: clone(item), annotation: item.description || "", fontSize: 14,
    } as SandboxElement));
    setElements(p => [...p, ...imported]);
    setSelectedIds(new Set(imported.map(e => e.id)));
    toast.success(`${imported.length} cards imported`);
  }, [isMobile, pushUndo]);

  const saveBack = useCallback(async () => {
    if (!primaryEl || primaryEl.kind !== "content" || !primaryEl.data?.id) return;
    setSavingBack(true);
    try {
      const meta = { ...(primaryEl.data.metadata || {}), sandbox_annotation: primaryEl.annotation || null };
      const { data, error } = await supabase.from("content_calendar").update({
        title: primaryEl.data.title, caption: primaryEl.data.caption,
        description: primaryEl.annotation || primaryEl.data.description || null, metadata: meta,
      }).eq("id", primaryEl.data.id).select().single();
      if (error) throw error;
      setElements(p => p.map(e => e.id === primaryEl.id ? { ...e, data, annotation: data.description || primaryEl.annotation } : e));
      onRefresh(); toast.success("Saved to Content");
    } catch (err: any) { toast.error(err.message || "Save failed"); }
    finally { setSavingBack(false); }
  }, [onRefresh, primaryEl]);

  /* ─── AI Evolver ─── */
  const evolve = useCallback(async () => {
    const sel = elsRef.current.filter(e => selRef.current.has(e.id));
    if (sel.length < 2) { toast.error("Select 2+ cards to evolve"); return; }
    setEvolving(true);
    try {
      const prompt = sel.map(e => {
        if (e.kind === "content" && e.data) return `CONTENT\nTitle: ${e.data.title}\nPlatform: ${e.data.platform}\nType: ${e.data.content_type}\nCaption: ${e.data.caption || ""}\nNotes: ${e.annotation || "none"}`;
        if (e.kind === "note") return `NOTE\n${e.text || ""}`;
        if (e.kind === "text") return `TEXT\n${e.text || ""}`;
        return `SHAPE\n${e.shape}`;
      }).join("\n\n---\n\n");

      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `You are an elite creative director in a visual sandbox. Combine these selected elements into one stronger, evolved concept.\n\n${prompt}\n\nGoal: ${evolverPrompt || "Make the concept more strategic, original, and publishable."}\nTarget platform: ${evolverPlatform}\n\nReturn ONLY valid JSON:\n{"title":"...","caption":"...","platform":"${evolverPlatform}","content_type":"post/reel/story/tweet/promo","hashtags":["tag"],"evolution_notes":"...","viral_score":85,"hook":"...","cta":"...","angle":"..."}`,
          }],
        },
      });
      if (error) throw error;
      const evolved = parseAi(data);
      pushUndo();

      const { data: newItem, error: ie } = await supabase.from("content_calendar").insert({
        title: evolved.title || "Evolved concept", caption: evolved.caption || "",
        platform: (evolved.platform || evolverPlatform || "instagram").toLowerCase(),
        content_type: evolved.content_type || "post",
        hashtags: Array.isArray(evolved.hashtags) ? evolved.hashtags.map((t: string) => t.replace(/^#/, "")) : [],
        status: "draft", viral_score: Number(evolved.viral_score || 82),
        description: evolved.evolution_notes || "Created via Sandbox Evolver",
        metadata: { source: "sandbox_evolver", evolved_from: sel.map(e => e.sourceItemId || e.id), sandbox_prompt: evolverPrompt || null, hook: evolved.hook, cta: evolved.cta, angle: evolved.angle },
      }).select().single();
      if (ie) throw ie;

      const c = sel.reduce((a, e) => ({ x: a.x + e.x, y: a.y + e.y }), { x: 0, y: 0 });
      const evolved_el: SandboxElement = {
        id: `sb-${crypto.randomUUID()}`, kind: "content",
        x: c.x / sel.length + 48, y: c.y / sel.length - 120, width: 304, height: 208,
        z: nextZ(elsRef.current), color: "#22c55e", links: sel.map(e => e.id),
        sourceItemId: newItem.id, data: newItem, annotation: evolved.evolution_notes || "", fontSize: 14,
      };
      setElements(p => [...p, evolved_el]);
      setSelectedIds(new Set([evolved_el.id]));
      setEvolverPrompt("");
      onRefresh();
      toast.success(`Evolved ${sel.length} cards`);
    } catch (err: any) { toast.error(err.message || "Evolver failed"); }
    finally { setEvolving(false); }
  }, [evolverPlatform, evolverPrompt, onRefresh, pushUndo]);

  /* ─── Pointer handlers ─── */
  const startDrag = useCallback((el: SandboxElement, cx: number, cy: number) => {
    const pt = scenePoint(cx, cy, boardRef.current, vpRef.current);
    let ids = selRef.current.has(el.id) ? Array.from(selRef.current) : [el.id];
    if (el.groupId) {
      const groupEls = elsRef.current.filter(e => e.groupId === el.groupId).map(e => e.id);
      ids = [...new Set([...ids, ...groupEls])];
    }
    const origins = Object.fromEntries(elsRef.current.filter(e => ids.includes(e.id)).map(e => [e.id, { x: e.x, y: e.y }]));
    interactionRef.current = { type: "drag", anchor: pt, originPositions: origins };
  }, []);

  const handleElDown = useCallback((e: React.PointerEvent, el: SandboxElement) => {
    e.stopPropagation();
    if (linkSourceId && linkSourceId !== el.id) { linkEls(linkSourceId, el.id); setLinkSourceId(null); toast.success("Linked"); return; }
    pushUndo();
    const next = new Set(selRef.current);
    if (e.shiftKey) { next.has(el.id) ? next.delete(el.id) : next.add(el.id); }
    else { next.clear(); next.add(el.id); if (el.groupId) elsRef.current.filter(g => g.groupId === el.groupId).forEach(g => next.add(g.id)); }
    setSelectedIds(new Set(next));
    bringForward();
    if (tool === "select") startDrag(el, e.clientX, e.clientY);
  }, [tool, bringForward, linkEls, linkSourceId, startDrag, pushUndo]);

  const handleResizeDown = useCallback((e: React.PointerEvent, el: SandboxElement) => {
    e.stopPropagation();
    pushUndo();
    const anchor = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
    interactionRef.current = { type: "resize", elementId: el.id, anchor, originRect: { x: el.x, y: el.y, width: el.width, height: el.height } };
    setSelectedIds(new Set([el.id]));
  }, [pushUndo]);

  const handleBoardDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1 || tool === "pan") {
      interactionRef.current = { type: "pan", originClient: { x: e.clientX, y: e.clientY }, originViewport: vpRef.current };
      return;
    }
    const pt = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
    if (tool === "pen" || tool === "eraser") {
      interactionRef.current = { type: "draw", tool, color: activeColor, size: brushSize, points: [pt] };
      setDraftStroke({ id: "draft", tool, color: activeColor, size: brushSize, points: [pt] });
      return;
    }
    if (["note", "text", "rectangle", "ellipse", "triangle", "diamond", "arrow"].includes(tool)) { addEl(tool, pt); return; }
    // Start marquee selection on empty canvas with select tool
    if (tool === "select") {
      interactionRef.current = { type: "marquee", origin: pt, current: pt };
      setMarqueeRect(null);
      setSelectedIds(new Set());
      setLinkSourceId(null);
      return;
    }
    setSelectedIds(new Set());
    setLinkSourceId(null);
  }, [tool, activeColor, addEl, brushSize]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const ix = interactionRef.current;
      if (!ix) return;
      if (ix.type === "pan") { setViewport({ ...ix.originViewport, x: ix.originViewport.x + e.clientX - ix.originClient.x, y: ix.originViewport.y + e.clientY - ix.originClient.y }); return; }
      const pt = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
      if (ix.type === "marquee") {
        ix.current = pt;
        const mx = Math.min(ix.origin.x, pt.x), my = Math.min(ix.origin.y, pt.y);
        const mw = Math.abs(pt.x - ix.origin.x), mh = Math.abs(pt.y - ix.origin.y);
        setMarqueeRect({ x: mx, y: my, w: mw, h: mh });
        // Live-select elements intersecting the marquee
        const hit = new Set<string>();
        for (const el of elsRef.current) {
          if (el.x + el.width > mx && el.x < mx + mw && el.y + el.height > my && el.y < my + mh) {
            hit.add(el.id);
            if (el.groupId) elsRef.current.filter(g => g.groupId === el.groupId).forEach(g => hit.add(g.id));
          }
        }
        setSelectedIds(hit);
        return;
      }
      if (ix.type === "draw") { ix.points.push(pt); setDraftStroke({ id: "draft", tool: ix.tool, color: ix.color, size: ix.size, points: [...ix.points] }); return; }
      if (ix.type === "drag") {
        const dx = pt.x - ix.anchor.x, dy = pt.y - ix.anchor.y;
        setElements(p => p.map(el => { const o = ix.originPositions[el.id]; return o ? { ...el, x: o.x + dx, y: o.y + dy } : el; }));
        return;
      }
      if (ix.type === "resize") {
        const dx = pt.x - ix.anchor.x, dy = pt.y - ix.anchor.y;
        setElements(p => p.map(el => el.id === ix.elementId ? { ...el, width: clamp(ix.originRect.width + dx, 80, 1200), height: clamp(ix.originRect.height + dy, 50, 900) } : el));
      }
    };
    const onUp = () => {
      const ix = interactionRef.current;
      if (!ix) return;
      if (ix.type === "draw" && ix.points.length > 1) {
        pushUndo();
        setStrokes(p => [...p, { id: crypto.randomUUID(), tool: ix.tool, color: ix.color, size: ix.size, points: ix.points }]);
      }
      if (ix.type === "marquee") {
        setMarqueeRect(null);
      }
      interactionRef.current = null;
      setDraftStroke(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [pushUndo]);

  const zoomTo = useCallback((nz: number, cx?: number, cy?: number) => {
    const board = boardRef.current;
    if (!board) return;
    const r = board.getBoundingClientRect();
    const ax = cx ?? r.left + r.width / 2, ay = cy ?? r.top + r.height / 2;
    const pt = scenePoint(ax, ay, board, vpRef.current);
    const z = clamp(nz, MIN_ZOOM, MAX_ZOOM);
    setViewport({ zoom: z, x: ax - r.left - pt.x * z, y: ay - r.top - pt.y * z });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY * 0.001 * zoomSpeed;
    zoomTo(vpRef.current.zoom * (1 + delta * 3), e.clientX, e.clientY);
  }, [zoomTo, zoomSpeed]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.addEventListener("wheel", handleWheel, { passive: false });
    return () => board.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  /* ─── Keys ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt && ["INPUT", "TEXTAREA", "SELECT"].includes(tgt.tagName)) return;
      if (tgt?.isContentEditable) return;
      const ctrl = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (ctrl && k === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (ctrl && k === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
      if (ctrl && k === "y") { e.preventDefault(); redo(); return; }
      if (ctrl && k === "s") { e.preventDefault(); save(); toast.success("Saved"); return; }
      if (ctrl && k === "d") { e.preventDefault(); duplicateSel(); return; }
      if (ctrl && k === "g") { e.preventDefault(); groupSelected(); return; }
      if (ctrl && k === "0") { e.preventDefault(); setViewport(DEFAULT_VIEWPORT); return; }
      if (e.key === "Delete" || (e.key === "Backspace" && !tgt?.isContentEditable)) { e.preventDefault(); deleteSel(); }
      if (k === "v" && !ctrl) setTool("select");
      if (k === "h" && !ctrl) setTool("pan");
      if (k === "p" && !ctrl) setTool("pen");
      if (k === "e" && !ctrl) setTool("eraser");
      if (k === "n" && !ctrl) setTool("note");
      if (k === "t" && !ctrl) setTool("text");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, save, deleteSel, duplicateSel, groupSelected]);

  const activeSizes = tool === "eraser" ? ERASER_SIZES : BRUSH_SIZES;

  /* ─── Render ─── */
  return (
    <div ref={wrapperRef} data-sandbox-wrapper className="flex flex-col gap-1.5 w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/6 bg-[hsl(222,30%,10%)] px-2 py-1.5">
        {/* Tools */}
        <div className="flex items-center gap-px rounded-lg bg-white/4 p-px">
          {TOOL_ITEMS.map(t => (
            <button key={t.id} type="button" title={t.label} onClick={() => setTool(t.id)}
              className={cn("rounded-md px-1.5 py-1 transition-colors", tool === t.id ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:bg-white/6 hover:text-white/70")}>
              <t.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-white/8" />

        {/* Color picker */}
        <ColorPicker color={activeColor} onChange={setActiveColor} />

        {/* Quick preset row */}
        <div className="flex items-center gap-0.5">
          {["#ffffff", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#64748b"].map(c => (
            <button key={c} type="button" onClick={() => setActiveColor(c)}
              className={cn("h-5 w-5 rounded-md border transition-transform", activeColor === c ? "border-white/60 scale-110" : "border-transparent hover:scale-105")}
              style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="h-5 w-px bg-white/8" />

        {/* Sizes */}
        {(tool === "pen" || tool === "eraser") && (
          <div className="flex items-center gap-0.5 overflow-x-auto max-w-[260px]">
            {activeSizes.map(s => (
              <button key={s} type="button" onClick={() => setBrushSize(s)}
                className={cn("rounded-full shrink-0 transition-transform", brushSize === s ? "ring-1 ring-white/50" : "")}
                style={{ width: clamp(s * 1.1, 6, 32), height: clamp(s * 1.1, 6, 32), backgroundColor: brushSize === s ? activeColor : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        )}

        {/* Text formatting */}
        {tool === "text" && (
          <div className="flex items-center gap-1">
            <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); if (primaryEl?.kind === "text") updateEl(primaryEl.id, { fontFamily: e.target.value }); }}
              className="h-6 rounded-md border border-white/10 bg-white/5 text-[10px] text-white/80 outline-none px-1">
              {FONT_FAMILIES.map(f => <option key={f} value={f} className="bg-[hsl(222,30%,12%)] text-white">{f.split(",")[0]}</option>)}
            </select>
            <select value={fontSize} onChange={e => { const v = Number(e.target.value); setFontSize(v); if (primaryEl?.kind === "text") updateEl(primaryEl.id, { fontSize: v }); }}
              className="h-6 w-12 rounded-md border border-white/10 bg-white/5 text-[10px] text-white/80 outline-none px-1">
              {FONT_SIZES.map(s => <option key={s} value={s} className="bg-[hsl(222,30%,12%)] text-white">{s}px</option>)}
            </select>
            <button type="button" onClick={() => { if (primaryEl?.kind === "text") updateEl(primaryEl.id, { fontWeight: primaryEl.fontWeight === "bold" ? "normal" : "bold" }); }}
              className={cn("rounded-md px-1.5 py-0.5", primaryEl?.fontWeight === "bold" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <Bold className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => { if (primaryEl?.kind === "text") updateEl(primaryEl.id, { fontStyle: primaryEl.fontStyle === "italic" ? "normal" : "italic" }); }}
              className={cn("rounded-md px-1.5 py-0.5", primaryEl?.fontStyle === "italic" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <Italic className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => { if (primaryEl?.kind === "text") updateEl(primaryEl.id, { textDecoration: primaryEl.textDecoration === "underline" ? "none" : "underline" }); }}
              className={cn("rounded-md px-1.5 py-0.5", primaryEl?.textDecoration === "underline" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <Underline className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => zoomTo(viewport.zoom - 0.15)} className="rounded-md p-1 text-white/40 hover:text-white/70"><ZoomOut className="h-3.5 w-3.5" /></button>
          <span className="min-w-[36px] text-center text-[10px] text-white/50">{Math.round(viewport.zoom * 100)}%</span>
          <button type="button" onClick={() => zoomTo(viewport.zoom + 0.15)} className="rounded-md p-1 text-white/40 hover:text-white/70"><ZoomIn className="h-3.5 w-3.5" /></button>
          <div className="h-4 w-px bg-white/8" />
          <div className="flex items-center gap-0.5 rounded-md border border-white/8 bg-white/4 px-1.5 py-0.5">
            <span className="text-[9px] text-white/35">Spd</span>
            <input type="number" min={0.1} max={5} step={0.1} value={zoomSpeed}
              onChange={e => setZoomSpeed(clamp(Number(e.target.value) || 1, 0.1, 5))}
              className="h-4 w-8 rounded border-0 bg-transparent text-center text-[10px] text-white/70 outline-none" />
          </div>
          <div className="h-4 w-px bg-white/8" />
          <button type="button" onClick={() => setLocked(p => !p)} className={cn("flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]", locked ? "bg-blue-500/15 text-blue-400" : "text-white/40")}>
            {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            {locked ? "Locked" : "Unlocked"}
          </button>
          <div className="h-4 w-px bg-white/8" />
          <button type="button" onClick={undo} title="Ctrl+Z" className="rounded-md p-1 text-white/40 hover:text-white/70"><RotateCcw className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={redo} title="Ctrl+Shift+Z" className="rounded-md p-1 text-white/40 hover:text-white/70"><Redo2 className="h-3.5 w-3.5" /></button>
          <div className="h-4 w-px bg-white/8" />
          <button type="button" onClick={() => { save(); toast.success("Saved"); }} title="Ctrl+S" className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-white/40 hover:text-white/70">
            <Save className="h-3 w-3" /><span className="text-[10px]">Save</span>
          </button>
          <div className={cn("h-2.5 w-2.5 rounded-full", dirty ? "bg-amber-400" : "bg-emerald-400")} title={dirty ? "Unsaved" : "Saved"} />
          {lastSaved && <span className="text-[9px] text-white/25 hidden sm:inline">{lastSaved.toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={() => setShowImport(true)} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 hover:text-white/80">Import</button>
        <button type="button" onClick={autoArrange} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 hover:text-white/80">Arrange</button>
        <button type="button" onClick={duplicateSel} disabled={!selectedIds.size} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">Duplicate</button>
        <button type="button" onClick={() => { if (selectedIds.size !== 1) { toast.info("Select one card"); return; } setLinkSourceId(p => p ? null : Array.from(selectedIds)[0]); }} disabled={!selectedIds.size} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">{linkSourceId ? "Cancel link" : "Link"}</button>
        <button type="button" onClick={() => { const ids = Array.from(selRef.current); if (!ids.length) return; pushUndo(); setElements(p => p.map(e => ({ ...e, links: ids.includes(e.id) ? [] : e.links.filter(l => !ids.includes(l)) }))); }} disabled={!selectedIds.size} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">Unlink</button>
        <button type="button" onClick={groupSelected} disabled={selectedIds.size < 2} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">Group</button>
        <button type="button" onClick={ungroupSelected} disabled={!selectedIds.size} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">Ungroup</button>
        <button type="button" onClick={clearInk} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8">Clear ink</button>

        {/* Export buttons */}
        <button type="button" onClick={async () => {
          const contentEls = elements.filter(e => e.kind === "content" && e.data);
          if (!contentEls.length) { toast.info("No content cards to export"); return; }
          const count = await exportSandboxToDrafts(contentEls.map(e => ({
            title: e.data?.title, caption: e.data?.caption, platform: e.data?.platform,
            type: e.data?.content_type, hashtags: e.data?.hashtags, annotation: e.annotation,
          })));
          if (count > 0) { onRefresh(); toast.success(`${count} cards exported to Content drafts`); }
        }} className="rounded-md border border-blue-500/15 bg-blue-500/5 px-2.5 py-1 text-[10px] text-blue-400/70 hover:bg-blue-500/10">
          <FileDown className="inline h-3 w-3 mr-0.5" />Export All
        </button>
        <button type="button" onClick={async () => {
          const sel = elements.filter(e => selectedIds.has(e.id) && e.kind === "content" && e.data);
          if (!sel.length) { toast.info("Select content cards to export"); return; }
          const count = await exportSandboxToDrafts(sel.map(e => ({
            title: e.data?.title, caption: e.data?.caption, platform: e.data?.platform,
            type: e.data?.content_type, hashtags: e.data?.hashtags, annotation: e.annotation,
          })));
          if (count > 0) { onRefresh(); toast.success(`${count} selected cards exported to drafts`); }
        }} disabled={!selectedIds.size} className="rounded-md border border-blue-500/15 bg-blue-500/5 px-2.5 py-1 text-[10px] text-blue-400/70 hover:bg-blue-500/10 disabled:opacity-30">
          <Send className="inline h-3 w-3 mr-0.5" />Export Selected
        </button>

        {/* Push to Platform button */}
        <button type="button" onClick={async () => {
          const allPlatforms = Object.keys(DEFAULT_BEST_TIMES);
          const platformList = [];
          for (const p of allPlatforms) {
            const accs = await getConnectedAccounts(p);
            platformList.push({ platform: p, connected: accs.length > 0, username: accs[0]?.platform_username });
          }
          setPushAvailablePlatforms(platformList);
          setPushSelectedPlatforms(new Set(platformList.filter(p => p.connected).map(p => p.platform)));
          setShowPushPlatform(true);
        }} className="rounded-md border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-1 text-[10px] text-emerald-400/70 hover:bg-emerald-500/10">
          <Layers className="inline h-3 w-3 mr-0.5" />Push to Platforms
        </button>

        <button type="button" onClick={deleteSel} disabled={!selectedIds.size} className="rounded-md border border-red-500/15 bg-red-500/5 px-2.5 py-1 text-[10px] text-red-400/70 hover:bg-red-500/10 disabled:opacity-30">Delete</button>
        <button type="button" onClick={clearBoard} className="rounded-md border border-red-500/15 bg-red-500/5 px-2.5 py-1 text-[10px] text-red-400/70 hover:bg-red-500/10">Clear board</button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setShowInspector(p => !p)} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8">{showInspector ? "Hide panel" : "Inspector"}</button>
          {selectedIds.size >= 2 && (
            <button type="button" onClick={evolve} disabled={evolving} className="rounded-md bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50">
              {evolving ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}Evolve {selectedIds.size}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-white/25">
          <span>{elements.filter(e => e.kind === "content").length} cards</span>
          <span>&middot;</span>
          <span>{elements.filter(e => e.kind !== "content").length} els</span>
          <span>&middot;</span>
          <span>{strokes.length} strokes</span>
          {linkSourceId && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400/70">Click target to link</span>}
        </div>
      </div>

      {/* Board + Inspector */}
      <div className={cn("flex gap-2", showInspector ? "flex-col lg:flex-row" : "")}>
        <div
          ref={boardRef}
          data-sandbox-board
          onPointerDown={handleBoardDown}
          className="relative flex-1 overflow-hidden rounded-xl border border-white/6 bg-[hsl(222,32%,8%)] touch-none"
          style={{
            height: isMobile ? "75vh" : "80vh",
            cursor: tool === "pan" ? "grab" : tool === "pen" ? "crosshair" : tool === "eraser" ? "cell" : tool === "text" ? "text" : "default",
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
            backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
          {/* Marquee selection rectangle */}
          {marqueeRect && marqueeRect.w > 2 && marqueeRect.h > 2 && (
            <div className="absolute pointer-events-none border-2 border-blue-400/60 bg-blue-400/10 rounded-sm" style={{
              left: viewport.x + marqueeRect.x * viewport.zoom,
              top: viewport.y + marqueeRect.y * viewport.zoom,
              width: marqueeRect.w * viewport.zoom,
              height: marqueeRect.h * viewport.zoom,
              zIndex: 999999,
            }} />
          )}
          <div className="absolute inset-0" style={{ transform: `translate3d(${viewport.x}px,${viewport.y}px,0) scale(${viewport.zoom})`, transformOrigin: "0 0" }}>
            {ordered.map(el => (
              <ElementView key={el.id} el={el} selected={selectedIds.has(el.id)} linkSrc={linkSourceId === el.id}
                onDown={handleElDown} onResize={handleResizeDown} onTextChange={(id, v) => updateEl(id, { text: v })} />
            ))}
          </div>
          {!elements.length && !strokes.length && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-xs rounded-xl border border-white/6 bg-white/3 p-5 text-center backdrop-blur-sm">
                <h3 className="text-base font-medium text-white/80">Sandbox</h3>
                <p className="mt-1.5 text-[12px] text-white/35">Import content, draw, link ideas, evolve with AI</p>
                <p className="mt-1 text-[10px] text-white/20">Ctrl+Z undo · Ctrl+Shift+Z redo · Ctrl+S save · Scroll to zoom</p>
              </div>
            </div>
          )}
        </div>

        {/* Inspector */}
        {showInspector && (
          <div className="w-full space-y-2 lg:w-[280px] shrink-0">
            <div className="rounded-xl border border-white/6 bg-[hsl(222,30%,10%)] p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Inspector</span>
                {primaryEl && <span className="text-[10px] text-white/30 capitalize">{primaryEl.kind}</span>}
              </div>
              {!primaryEl ? (
                <p className="text-[11px] text-white/25">Select an element</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1 text-[9px] text-white/35">
                    <div className="rounded-md border border-white/6 bg-white/3 px-2 py-1">x {Math.round(primaryEl.x)}</div>
                    <div className="rounded-md border border-white/6 bg-white/3 px-2 py-1">y {Math.round(primaryEl.y)}</div>
                    <div className="rounded-md border border-white/6 bg-white/3 px-2 py-1">w {Math.round(primaryEl.width)}</div>
                    <div className="rounded-md border border-white/6 bg-white/3 px-2 py-1">h {Math.round(primaryEl.height)}</div>
                  </div>
                  {primaryEl.kind === "content" && primaryEl.data && (
                    <>
                      <input value={primaryEl.data.title || ""} onChange={e => updateContentField("title", e.target.value)} className="w-full rounded-md border border-white/8 bg-white/5 px-2 py-1.5 text-[11px] text-white/80 outline-none placeholder:text-white/20" placeholder="Title" />
                      <textarea value={primaryEl.data.caption || ""} onChange={e => updateContentField("caption", e.target.value)} className="min-h-[80px] w-full rounded-md border border-white/8 bg-white/5 px-2 py-1.5 text-[11px] text-white/80 outline-none placeholder:text-white/20 resize-none" placeholder="Caption" />
                      <textarea value={primaryEl.annotation || ""} onChange={e => updateEl(primaryEl.id, { annotation: e.target.value })} className="min-h-[48px] w-full rounded-md border border-white/8 bg-white/5 px-2 py-1.5 text-[11px] text-white/80 outline-none placeholder:text-white/20 resize-none" placeholder="Annotation" />
                      <button type="button" onClick={saveBack} disabled={savingBack} className="w-full rounded-md bg-blue-500/15 border border-blue-500/20 py-1.5 text-[11px] text-blue-400 hover:bg-blue-500/25 disabled:opacity-50">
                        {savingBack ? "Saving..." : "Save to Content"}
                      </button>
                    </>
                  )}
                  {(primaryEl.kind === "note" || primaryEl.kind === "text") && (
                    <>
                      <textarea value={primaryEl.text || ""} onChange={e => { pushUndo(); updateEl(primaryEl.id, { text: e.target.value }); }} className="min-h-[80px] w-full rounded-md border border-white/8 bg-white/5 px-2 py-1.5 text-[11px] text-white/80 outline-none resize-none" />
                      {primaryEl.kind === "text" && (
                        <div className="grid grid-cols-2 gap-1">
                          <select value={primaryEl.fontFamily || "Inter, sans-serif"} onChange={e => updateEl(primaryEl.id, { fontFamily: e.target.value })} className="rounded-md border border-white/8 bg-white/5 px-1.5 py-1 text-[10px] text-white/70 outline-none">
                            {FONT_FAMILIES.map(f => <option key={f} value={f} className="bg-[hsl(222,30%,12%)] text-white">{f.split(",")[0]}</option>)}
                          </select>
                          <select value={primaryEl.fontSize || 16} onChange={e => updateEl(primaryEl.id, { fontSize: Number(e.target.value) })} className="rounded-md border border-white/8 bg-white/5 px-1.5 py-1 text-[10px] text-white/70 outline-none">
                            {FONT_SIZES.map(s => <option key={s} value={s} className="bg-[hsl(222,30%,12%)] text-white">{s}px</option>)}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                  {primaryEl.kind === "shape" && (
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.slice(0, 12).map(c => (
                        <button key={c} type="button" onClick={() => updateEl(primaryEl.id, { color: c })}
                          className={cn("h-5 w-5 rounded-md border", primaryEl.color === c ? "border-white/50 scale-110" : "border-transparent")}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Evolver */}
            <div className="rounded-xl border border-white/6 bg-[hsl(222,30%,10%)] p-3 space-y-2">
              <span className="text-[10px] text-white/40 uppercase tracking-wider">Evolver</span>
              <p className="text-[10px] text-white/25">{selectedIds.size >= 2 ? `${selectedIds.size} selected` : "Select 2+ to evolve"}</p>
              <textarea value={evolverPrompt} onChange={e => setEvolverPrompt(e.target.value)} className="min-h-[48px] w-full rounded-md border border-white/8 bg-white/5 px-2 py-1.5 text-[11px] text-white/80 outline-none placeholder:text-white/20 resize-none" placeholder="Evolution goal..." />
              <input value={evolverPlatform} onChange={e => setEvolverPlatform(e.target.value)} className="w-full rounded-md border border-white/8 bg-white/5 px-2 py-1.5 text-[11px] text-white/80 outline-none placeholder:text-white/20" placeholder="Platform" />
              <button type="button" onClick={evolve} disabled={selectedIds.size < 2 || evolving} className="w-full rounded-md bg-emerald-500/15 border border-emerald-500/20 py-1.5 text-[11px] text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50">
                {evolving ? "Evolving..." : "Evolve"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-h-[86vh] max-w-5xl overflow-hidden border-white/8 bg-[hsl(222,30%,10%)] text-white">
          <DialogHeader><DialogTitle className="text-white/90">Import cards</DialogTitle></DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
              <input value={importQuery} onChange={e => setImportQuery(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-[12px] text-white/80 outline-none placeholder:text-white/25" placeholder="Search..." />
            </div>
            {(["all", "drafts", "non-drafts", "competitor"] as const).map(m => (
              <button key={m} type="button" onClick={() => setImportMode(m)}
                className={cn("rounded-md px-2.5 py-1.5 text-[10px] capitalize border", importMode === m ? "border-blue-500/20 bg-blue-500/10 text-blue-400" : "border-white/8 text-white/40")}>{m.replace("-", " ")}</button>
            ))}
            <button type="button" onClick={() => importItems(importable)} className="rounded-md bg-blue-500/15 border border-blue-500/20 px-3 py-1.5 text-[11px] text-blue-400">Import ({importable.length})</button>
          </div>
          <div className="grid gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3" style={{ maxHeight: "60vh" }}>
            {importable.slice(0, 60).map(item => (
              <button key={item.id} type="button" onClick={() => importItems([item])}
                className={cn("flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                  importedSrcIds.has(item.id) ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/6 bg-white/3 hover:border-blue-500/20 hover:bg-blue-500/5")}>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/40 capitalize">{item.platform}</span>
                  <span className="text-[9px] text-white/30 capitalize">{item.status}</span>
                  {importedSrcIds.has(item.id) && <Check className="h-3 w-3 text-emerald-400" />}
                </div>
                <span className="line-clamp-2 text-[11px] font-medium text-white/80">{item.title}</span>
                <span className="line-clamp-2 text-[10px] text-white/30">{item.caption || "No caption"}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Push to Platform Dialog */}
      <Dialog open={showPushPlatform} onOpenChange={setShowPushPlatform}>
        <DialogContent className="max-w-lg border-white/8 bg-[hsl(222,30%,10%)] text-white">
          <DialogHeader><DialogTitle className="text-white/90 flex items-center gap-2"><Layers className="h-4 w-4 text-emerald-400" />Push to Platform Tabs</DialogTitle></DialogHeader>

          <div className="space-y-3">
            {/* Scope */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Cards to Push</label>
              <div className="flex gap-2">
                <button onClick={() => setPushScope("all")} className={cn("rounded-md px-3 py-1.5 text-[10px] border", pushScope === "all" ? "border-primary/30 bg-primary/10 text-primary" : "border-white/8 text-white/40")}>
                  All Content ({elements.filter(e => e.kind === "content" && e.data).length})
                </button>
                <button onClick={() => setPushScope("selected")} disabled={!selectedIds.size} className={cn("rounded-md px-3 py-1.5 text-[10px] border", pushScope === "selected" ? "border-primary/30 bg-primary/10 text-primary" : "border-white/8 text-white/40 disabled:opacity-30")}>
                  Selected ({elements.filter(e => selectedIds.has(e.id) && e.kind === "content" && e.data).length})
                </button>
              </div>
            </div>

            {/* Platforms */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Target Platforms</label>
                <button onClick={() => {
                  const connected = pushAvailablePlatforms.filter(p => p.connected).map(p => p.platform);
                  setPushSelectedPlatforms(prev => prev.size === connected.length ? new Set() : new Set(connected));
                }} className="text-[10px] text-primary hover:underline">Toggle All</button>
              </div>
              <div className="space-y-1">
                {pushAvailablePlatforms.map(p => (
                  <div key={p.platform} onClick={() => {
                    if (!p.connected) return;
                    setPushSelectedPlatforms(prev => {
                      const next = new Set(prev);
                      next.has(p.platform) ? next.delete(p.platform) : next.add(p.platform);
                      return next;
                    });
                  }} className={cn("flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all",
                    !p.connected ? "opacity-40 cursor-not-allowed border-white/4" :
                    pushSelectedPlatforms.has(p.platform) ? "border-emerald-500/25 bg-emerald-500/5" : "border-white/6 hover:border-white/12")}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center",
                        pushSelectedPlatforms.has(p.platform) ? "bg-emerald-500/20 border-emerald-500/40" : "border-white/15")}>
                        {pushSelectedPlatforms.has(p.platform) && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                      </div>
                      <span className="text-xs text-white capitalize">{p.platform}</span>
                    </div>
                    {p.connected ? <span className="text-[9px] text-emerald-400/60">@{p.username || "connected"}</span> : <span className="text-[9px] text-white/30">Not connected</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Execution Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPushMode("manual")} className={cn("p-2.5 rounded-lg border text-left", pushMode === "manual" ? "border-primary/30 bg-primary/10" : "border-white/6")}>
                  <p className={cn("text-[11px] font-semibold", pushMode === "manual" ? "text-primary" : "text-white/50")}>Manual</p>
                  <p className="text-[9px] text-white/30 mt-0.5">Push as drafts for manual scheduling</p>
                </button>
                <button onClick={() => setPushMode("automated")} className={cn("p-2.5 rounded-lg border text-left", pushMode === "automated" ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/6")}>
                  <p className={cn("text-[11px] font-semibold", pushMode === "automated" ? "text-emerald-400" : "text-white/50")}>Automated</p>
                  <p className="text-[9px] text-white/30 mt-0.5">Auto-schedule at best posting hours</p>
                </button>
              </div>
            </div>

            <button disabled={pushingToPlatform || pushSelectedPlatforms.size === 0} onClick={async () => {
              setPushingToPlatform(true);
              try {
                const cards = (pushScope === "selected"
                  ? elements.filter(e => selectedIds.has(e.id) && e.kind === "content" && e.data)
                  : elements.filter(e => e.kind === "content" && e.data)
                ).map(e => ({
                  title: e.data?.title, caption: e.data?.caption, platform: e.data?.platform,
                  type: e.data?.content_type, hashtags: e.data?.hashtags, annotation: e.annotation,
                }));
                if (!cards.length) { toast.info("No content cards to push"); return; }
                const result = await pushSandboxDirectToPlatforms(cards, Array.from(pushSelectedPlatforms), pushMode);
                toast.success(`${result.total_created} posts pushed to ${result.platforms_processed.length} platform(s)${pushMode === "automated" ? ` (${result.total_scheduled} auto-scheduled)` : " as drafts"}`);
                setShowPushPlatform(false);
                onRefresh();
              } catch (e: any) { toast.error(e.message || "Push failed"); }
              finally { setPushingToPlatform(false); }
            }} className={cn("w-full rounded-md py-2 text-[11px] font-medium border disabled:opacity-50",
              pushMode === "automated" ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400" : "bg-primary/15 border-primary/20 text-primary")}>
              {pushingToPlatform ? <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> : null}
              {pushingToPlatform ? "Pushing..." : pushMode === "automated" ? `Push & Auto-Schedule to ${pushSelectedPlatforms.size} Platform(s)` : `Push as Drafts to ${pushSelectedPlatforms.size} Platform(s)`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentSandbox;
