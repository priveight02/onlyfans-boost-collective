import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  ArrowRight, Bold, Check, Circle, Cloud, CloudOff, Copy, Diamond, Download,
  Eraser, Grip, Italic, Layers, Link2, Loader2, MousePointer, Move, Pencil,
  RefreshCw, RotateCcw, Redo2, Save, Search, Sparkles, Square, StickyNote,
  Trash2, Triangle, Type, Underline, Unlink, Wand2, ZoomIn, ZoomOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Types ─── */
type Tool = "select" | "pan" | "pen" | "eraser" | "text" | "note" | "rectangle" | "ellipse" | "triangle" | "diamond" | "arrow";
type ShapeKind = "rectangle" | "ellipse" | "triangle" | "diamond" | "arrow";
type PaletteTone = "primary" | "accent" | "foreground" | "muted" | "destructive";
type ElementKind = "content" | "note" | "text" | "shape";
type Point = { x: number; y: number };
type Viewport = { x: number; y: number; zoom: number };

interface SandboxStroke {
  id: string;
  tool: "pen" | "eraser";
  tone: PaletteTone;
  size: number;
  points: Point[];
}

interface SandboxElement {
  id: string;
  kind: ElementKind;
  x: number; y: number; width: number; height: number; z: number;
  tone: PaletteTone;
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
  | { type: "draw"; tool: "pen" | "eraser"; tone: PaletteTone; size: number; points: Point[] }
  | { type: "drag"; anchor: Point; originPositions: Record<string, Point> }
  | { type: "resize"; elementId: string; anchor: Point; originRect: Pick<SandboxElement, "x" | "y" | "width" | "height"> };

interface SandboxSnapshot {
  elements: SandboxElement[];
  strokes: SandboxStroke[];
}

/* ─── Constants ─── */
const STORAGE_KEY = "content_sandbox_state_v5";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const DEFAULT_VIEWPORT: Viewport = { x: 32, y: 32, zoom: 1 };
const MAX_UNDO = 60;
const AUTOSAVE_MS = 3000;

const PALETTE: Record<PaletteTone, { label: string; stroke: string; fill: string; softClass: string }> = {
  primary: { label: "Primary", stroke: "hsl(var(--primary))", fill: "hsl(var(--primary) / 0.14)", softClass: "border-primary/20 bg-primary/10 text-primary" },
  accent: { label: "Accent", stroke: "hsl(var(--accent))", fill: "hsl(var(--accent) / 0.14)", softClass: "border-accent/20 bg-accent/10 text-accent" },
  foreground: { label: "Ink", stroke: "hsl(var(--foreground))", fill: "hsl(var(--foreground) / 0.12)", softClass: "border-foreground/20 bg-foreground/10 text-foreground" },
  muted: { label: "Muted", stroke: "hsl(var(--muted-foreground))", fill: "hsl(var(--muted-foreground) / 0.12)", softClass: "border-muted-foreground/20 bg-muted text-muted-foreground" },
  destructive: { label: "Red", stroke: "hsl(var(--destructive))", fill: "hsl(var(--destructive) / 0.14)", softClass: "border-destructive/20 bg-destructive/10 text-destructive" },
};

const BRUSH_SIZES = [1, 2, 3, 4, 6, 8, 10, 14, 20, 28, 40];
const ERASER_SIZES = [6, 10, 16, 24, 36, 50, 70];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96];
const FONT_FAMILIES = [
  "Inter, sans-serif", "Georgia, serif", "Courier New, monospace",
  "Comic Sans MS, cursive", "Impact, sans-serif", "Arial Black, sans-serif",
  "Trebuchet MS, sans-serif", "Verdana, sans-serif", "Times New Roman, serif",
];

const TOOL_ITEMS: { id: Tool; label: string; icon: any }[] = [
  { id: "select", label: "Select", icon: MousePointer },
  { id: "pan", label: "Pan", icon: Move },
  { id: "pen", label: "Brush", icon: Pencil },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "text", label: "Text", icon: Type },
  { id: "note", label: "Sticky", icon: StickyNote },
  { id: "rectangle", label: "Rect", icon: Square },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "triangle", label: "Tri", icon: Triangle },
  { id: "diamond", label: "Diamond", icon: Diamond },
  { id: "arrow", label: "Arrow", icon: ArrowRight },
];

/* ─── Helpers ─── */
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const center = (el: SandboxElement) => ({ x: el.x + el.width / 2, y: el.y + el.height / 2 });
const nextZ = (els: SandboxElement[]) => (els.length ? Math.max(...els.map(e => e.z)) + 1 : 1);
const getSource = (item: any) => (typeof item?.metadata?.source === "string" ? item.metadata.source : "");

const gridPos = (i: number, cols: number) => ({
  x: 48 + (i % cols) * 312,
  y: 48 + Math.floor(i / cols) * 228,
});

const scenePoint = (cx: number, cy: number, board: HTMLDivElement | null, vp: Viewport): Point => {
  if (!board) return { x: 0, y: 0 };
  const r = board.getBoundingClientRect();
  return { x: (cx - r.left - vp.x) / vp.zoom, y: (cy - r.top - vp.y) / vp.zoom };
};

const parseAi = (raw: unknown) => {
  const text = typeof raw === "string" ? raw
    : typeof raw === "object" && raw !== null && "choices" in raw
      ? (raw as any)?.choices?.[0]?.message?.content || JSON.stringify(raw)
      : JSON.stringify(raw ?? "");
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0].replace(/,\s*([}\]])/g, "$1"));
  return { title: "Evolved concept", caption: cleaned, platform: "instagram", content_type: "post", hashtags: [], evolution_notes: "Combined inside Sandbox", viral_score: 82 };
};

const shapeSvg = (shape: ShapeKind, tone: PaletteTone) => {
  const p = PALETTE[tone];
  switch (shape) {
    case "rectangle": return <div className="h-full w-full rounded-xl border-2" style={{ borderColor: p.stroke, backgroundColor: p.fill }} />;
    case "ellipse": return <div className="h-full w-full rounded-full border-2" style={{ borderColor: p.stroke, backgroundColor: p.fill }} />;
    case "triangle": return <svg viewBox="0 0 100 100" className="h-full w-full"><polygon points="50,6 94,94 6,94" fill={p.fill} stroke={p.stroke} strokeWidth="2" /></svg>;
    case "diamond": return <svg viewBox="0 0 100 100" className="h-full w-full"><polygon points="50,5 95,50 50,95 5,50" fill={p.fill} stroke={p.stroke} strokeWidth="2" /></svg>;
    case "arrow": return <svg viewBox="0 0 100 100" className="h-full w-full"><path d="M8 50h68" stroke={p.stroke} strokeWidth="8" strokeLinecap="round" /><path d="M56 20l30 30-30 30" fill="none" stroke={p.stroke} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default: return null;
  }
};

/* ─── ElementView ─── */
const ElementView = memo(function ElementView({
  el, selected, linkSrc,
  onDown, onResize, onTextChange,
}: {
  el: SandboxElement; selected: boolean; linkSrc: boolean;
  onDown: (e: React.PointerEvent, el: SandboxElement) => void;
  onResize: (e: React.PointerEvent, el: SandboxElement) => void;
  onTextChange: (id: string, v: string) => void;
}) {
  const pal = PALETTE[el.tone];
  const src = el.data ? getSource(el.data) : "";

  return (
    <div
      className={cn("absolute will-change-transform", selected && "ring-2 ring-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]", linkSrc && "ring-2 ring-accent")}
      style={{ left: el.x, top: el.y, width: el.width, height: el.height, zIndex: el.z }}
      onPointerDown={e => onDown(e, el)}
    >
      {el.kind === "content" && el.data && (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Grip className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="border-border text-[10px] capitalize text-muted-foreground">{el.data.platform}</Badge>
            <Badge variant="outline" className={cn("text-[10px] capitalize", el.data.status === "published" ? "border-accent/20 text-accent" : el.data.status === "draft" ? "border-primary/20 text-primary" : "border-border text-muted-foreground")}>{el.data.status}</Badge>
            {src && <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">{src.replace(/_/g, " ")}</Badge>}
          </div>
          <div className="flex-1 space-y-2 overflow-hidden px-3 py-3">
            <p className="line-clamp-2 text-sm font-semibold text-foreground">{el.data.title}</p>
            <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">{el.data.caption || "No caption yet"}</p>
            {el.annotation && <div className="rounded-xl border border-primary/20 bg-primary/10 px-2 py-1.5 text-[11px] text-primary line-clamp-2">{el.annotation}</div>}
          </div>
          <div className="border-t border-border px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>{el.data.hashtags?.length || 0} hashtags</span>
              <span>{el.links.length} links</span>
            </div>
            {Number(el.data.viral_score || 0) > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clamp(Number(el.data.viral_score || 0), 0, 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {el.kind === "note" && (
        <div className="flex h-full flex-col rounded-2xl border p-3 shadow-sm backdrop-blur-sm" style={{ borderColor: pal.stroke, backgroundColor: pal.fill }}>
          <div className="mb-2 flex items-center gap-2">
            <Grip className="h-3.5 w-3.5" style={{ color: pal.stroke }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: pal.stroke }}>Note</span>
          </div>
          <textarea
            value={el.text || ""}
            onPointerDown={e => e.stopPropagation()}
            onChange={e => onTextChange(el.id, e.target.value)}
            className="h-full w-full resize-none border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Sketch an idea..."
          />
        </div>
      )}

      {el.kind === "text" && (
        <div className="flex h-full items-start rounded-xl border border-dashed border-border bg-background/70 p-3 shadow-sm">
          <div
            contentEditable suppressContentEditableWarning
            onPointerDown={e => e.stopPropagation()}
            onBlur={e => onTextChange(el.id, e.currentTarget.textContent || "")}
            className="w-full whitespace-pre-wrap break-words text-foreground outline-none"
            style={{
              color: pal.stroke,
              fontSize: el.fontSize || 16,
              fontFamily: el.fontFamily || "Inter, sans-serif",
              fontWeight: el.fontWeight || "normal",
              fontStyle: el.fontStyle || "normal",
              textDecoration: el.textDecoration || "none",
            }}
          >{el.text || "New text"}</div>
        </div>
      )}

      {el.kind === "shape" && el.shape && (
        <div className="h-full rounded-2xl border border-border bg-background/60 p-2 backdrop-blur-sm">{shapeSvg(el.shape, el.tone)}</div>
      )}

      {el.groupId && <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-accent border border-accent-foreground" title="Grouped" />}

      <button type="button" aria-label="Resize" className="absolute bottom-1 right-1 h-4 w-4 rounded-full border border-border bg-background shadow-sm" onPointerDown={e => onResize(e as any, el)} />
    </div>
  );
});

/* ─── Main Component ─── */
const ContentSandbox = ({ items, onRefresh }: { items: any[]; onRefresh: () => void }) => {
  const isMobile = useIsMobile();
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const elsRef = useRef<SandboxElement[]>([]);
  const selRef = useRef<Set<string>>(new Set());
  const vpRef = useRef<Viewport>(DEFAULT_VIEWPORT);

  const [elements, setElements] = useState<SandboxElement[]>([]);
  const [strokes, setStrokes] = useState<SandboxStroke[]>([]);
  const [draftStroke, setDraftStroke] = useState<SandboxStroke | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>("select");
  const [tone, setTone] = useState<PaletteTone>("foreground");
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");

  // Undo/Redo stacks
  const undoStack = useRef<SandboxSnapshot[]>([]);
  const redoStack = useRef<SandboxSnapshot[]>([]);

  const pushUndo = useCallback(() => {
    undoStack.current.push({ elements: clone(elsRef.current), strokes: clone(strokes) });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
    setDirty(true);
  }, [strokes]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    redoStack.current.push({ elements: clone(elsRef.current), strokes: clone(strokes) });
    const snap = undoStack.current.pop()!;
    setElements(snap.elements);
    setStrokes(snap.strokes);
    setDirty(true);
  }, [strokes]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    undoStack.current.push({ elements: clone(elsRef.current), strokes: clone(strokes) });
    const snap = redoStack.current.pop()!;
    setElements(snap.elements);
    setStrokes(snap.strokes);
    setDirty(true);
  }, [strokes]);

  // Persistence
  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 5, elements: elsRef.current, strokes }));
    setDirty(false);
    setLastSaved(new Date());
  }, [strokes]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      setElements(Array.isArray(p?.elements) ? p.elements : []);
      setStrokes(Array.isArray(p?.strokes) ? p.strokes : []);
      setLastSaved(new Date());
    } catch { /* ignore */ }
  }, []);

  // Autosave
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, elements, strokes, save]);

  // Sync refs
  useEffect(() => { elsRef.current = elements; }, [elements]);
  useEffect(() => { selRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => { vpRef.current = viewport; }, [viewport]);

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

  /* ─── Canvas drawing ─── */
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
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw links
    const lookup = new Map(elements.map(e => [e.id, e]));
    ordered.forEach(el => {
      el.links.forEach(tid => {
        const t = lookup.get(tid);
        if (!t) return;
        const f = center(el), to = center(t);
        ctx.beginPath(); ctx.strokeStyle = "hsl(var(--primary) / 0.4)"; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
        ctx.moveTo(f.x, f.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.setLineDash([]);
        const a = Math.atan2(to.y - f.y, to.x - f.x), hl = 10;
        ctx.beginPath(); ctx.fillStyle = "hsl(var(--primary) / 0.8)";
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - hl * Math.cos(a - Math.PI / 6), to.y - hl * Math.sin(a - Math.PI / 6));
        ctx.lineTo(to.x - hl * Math.cos(a + Math.PI / 6), to.y - hl * Math.sin(a + Math.PI / 6));
        ctx.closePath(); ctx.fill();
      });
    });

    // Draw strokes
    const allStrokes = [...strokes, ...(draftStroke ? [draftStroke] : [])];
    for (const s of allStrokes) {
      if (s.points.length < 2) continue;
      ctx.beginPath(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = s.size;
      ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = PALETTE[s.tone].stroke;
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }, [draftStroke, elements, ordered, strokes, viewport]);

  useEffect(() => { drawScene(); }, [drawScene]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const obs = new ResizeObserver(() => drawScene());
    obs.observe(board);
    return () => obs.disconnect();
  }, [drawScene]);

  /* ─── Element operations ─── */
  const linkEls = useCallback((from: string, to: string) => {
    pushUndo();
    setElements(p => p.map(e => e.id !== from ? e : { ...e, links: e.links.includes(to) ? e.links.filter(i => i !== to) : [...e.links, to] }));
  }, [pushUndo]);

  const addEl = useCallback((t: Tool, pt: Point) => {
    pushUndo();
    const z = nextZ(elsRef.current);
    const base: Partial<SandboxElement> = { id: `sb-${crypto.randomUUID()}`, x: pt.x, y: pt.y, z, tone, links: [], annotation: "", fontSize, fontFamily, fontWeight: "normal", fontStyle: "normal", textDecoration: "none" };
    let el: SandboxElement | null = null;
    if (t === "note") el = { ...base, kind: "note", width: 240, height: 180, text: "" } as SandboxElement;
    if (t === "text") el = { ...base, kind: "text", width: 260, height: 96, text: "Type here" } as SandboxElement;
    if (["rectangle", "ellipse", "triangle", "diamond", "arrow"].includes(t))
      el = { ...base, kind: "shape", width: t === "arrow" ? 220 : 180, height: t === "arrow" ? 80 : 160, shape: t as ShapeKind } as SandboxElement;
    if (!el) return;
    setElements(p => [...p, el!]);
    setSelectedIds(new Set([el.id]));
  }, [tone, pushUndo, fontSize, fontFamily]);

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
    setSelectedIds(new Set());
    setLinkSourceId(null);
  }, [pushUndo]);

  const clearBoard = useCallback(() => {
    if (!confirm("⚠️ Clear the ENTIRE sandbox board? This will remove all elements and ink strokes. This action can be undone with Ctrl+Z.")) return;
    pushUndo();
    setElements([]);
    setStrokes([]);
    setSelectedIds(new Set());
    setLinkSourceId(null);
  }, [pushUndo]);

  const clearInk = useCallback(() => { pushUndo(); setStrokes([]); }, [pushUndo]);

  // Group / Attach elements
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
    toast.success("Ungrouped");
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
      width: 284, height: 192, z: z++, tone: "primary" as PaletteTone, links: [], sourceItemId: item.id,
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
      onRefresh();
      toast.success("Saved back to Content");
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
        title: evolved.title || "Evolved concept",
        caption: evolved.caption || "",
        platform: (evolved.platform || evolverPlatform || "instagram").toLowerCase(),
        content_type: evolved.content_type || "post",
        hashtags: Array.isArray(evolved.hashtags) ? evolved.hashtags.map((t: string) => t.replace(/^#/, "")) : [],
        status: "draft",
        viral_score: Number(evolved.viral_score || 82),
        description: evolved.evolution_notes || "Created inside Sandbox Evolver",
        metadata: { source: "sandbox_evolver", evolved_from: sel.map(e => e.sourceItemId || e.id), sandbox_prompt: evolverPrompt || null, hook: evolved.hook, cta: evolved.cta, angle: evolved.angle },
      }).select().single();
      if (ie) throw ie;

      const c = sel.reduce((a, e) => ({ x: a.x + e.x, y: a.y + e.y }), { x: 0, y: 0 });
      const evolved_el: SandboxElement = {
        id: `sb-${crypto.randomUUID()}`, kind: "content",
        x: c.x / sel.length + 48, y: c.y / sel.length - 120, width: 304, height: 208,
        z: nextZ(elsRef.current), tone: "accent", links: sel.map(e => e.id),
        sourceItemId: newItem.id, data: newItem, annotation: evolved.evolution_notes || "", fontSize: 14,
      };
      setElements(p => [...p, evolved_el]);
      setSelectedIds(new Set([evolved_el.id]));
      setEvolverPrompt("");
      onRefresh();
      toast.success(`Evolved ${sel.length} cards into a stronger draft`);
    } catch (err: any) { toast.error(err.message || "Evolver failed"); }
    finally { setEvolving(false); }
  }, [evolverPlatform, evolverPrompt, onRefresh, pushUndo]);

  /* ─── Pointer handlers ─── */
  const startDrag = useCallback((el: SandboxElement, cx: number, cy: number) => {
    const pt = scenePoint(cx, cy, boardRef.current, vpRef.current);
    // If element is in a group, select all group members
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
      interactionRef.current = { type: "draw", tool, tone, size: brushSize, points: [pt] };
      setDraftStroke({ id: "draft", tool, tone, size: brushSize, points: [pt] });
      return;
    }
    if (["note", "text", "rectangle", "ellipse", "triangle", "diamond", "arrow"].includes(tool)) { addEl(tool, pt); return; }
    setSelectedIds(new Set());
    setLinkSourceId(null);
  }, [tool, tone, addEl, brushSize]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const ix = interactionRef.current;
      if (!ix) return;
      if (ix.type === "pan") { setViewport({ ...ix.originViewport, x: ix.originViewport.x + e.clientX - ix.originClient.x, y: ix.originViewport.y + e.clientY - ix.originClient.y }); return; }
      const pt = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
      if (ix.type === "draw") { ix.points.push(pt); setDraftStroke({ id: "draft", tool: ix.tool, tone: ix.tone, size: ix.size, points: [...ix.points] }); return; }
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
        setStrokes(p => [...p, { id: crypto.randomUUID(), tool: ix.tool, tone: ix.tone, size: ix.size, points: ix.points }]);
      }
      interactionRef.current = null;
      setDraftStroke(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [pushUndo]);

  const zoom = useCallback((nz: number, cx?: number, cy?: number) => {
    const board = boardRef.current;
    if (!board) return;
    const r = board.getBoundingClientRect();
    const ax = cx ?? r.left + r.width / 2, ay = cy ?? r.top + r.height / 2;
    const pt = scenePoint(ax, ay, board, vpRef.current);
    const z = clamp(nz, MIN_ZOOM, MAX_ZOOM);
    setViewport({ zoom: z, x: ax - r.left - pt.x * z, y: ay - r.top - pt.y * z });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) { zoom(vpRef.current.zoom + (e.deltaY > 0 ? -0.1 : 0.1), e.clientX, e.clientY); return; }
    setViewport(p => ({ ...p, x: p.x - e.deltaX, y: p.y - e.deltaY }));
  }, [zoom]);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt && ["INPUT", "TEXTAREA"].includes(tgt.tagName)) return;
      if (tgt?.isContentEditable) return;

      // Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+Y redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); toast.success("Sandbox saved"); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSel(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") { e.preventDefault(); groupSelected(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "0") { e.preventDefault(); setViewport(DEFAULT_VIEWPORT); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSel(); }
      if (e.key === "v") setTool("select");
      if (e.key === "h") setTool("pan");
      if (e.key === "p") setTool("pen");
      if (e.key === "e") setTool("eraser");
      if (e.key === "n") setTool("note");
      if (e.key === "t") setTool("text");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, save, deleteSel, duplicateSel, groupSelected]);

  const activeSizes = tool === "eraser" ? ERASER_SIZES : BRUSH_SIZES;

  /* ─── Render ─── */
  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/80 p-2 backdrop-blur-sm">
        {/* Tools */}
        <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-border bg-background/60 p-0.5">
          {TOOL_ITEMS.map(t => (
            <button key={t.id} type="button" title={t.label} onClick={() => setTool(t.id)}
              className={cn("rounded-lg p-1.5 transition-colors", tool === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <t.icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-background/60 p-1">
          {(Object.keys(PALETTE) as PaletteTone[]).map(t => (
            <button key={t} type="button" title={PALETTE[t].label} onClick={() => setTone(t)}
              className={cn("h-6 w-6 rounded-full border-2 transition-transform", tone === t ? "scale-110 border-foreground" : "border-transparent")}
              style={{ backgroundColor: PALETTE[t].stroke }} />
          ))}
        </div>

        {/* Sizes for pen/eraser */}
        {(tool === "pen" || tool === "eraser") && (
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-background/60 px-1.5 py-1 overflow-x-auto max-w-[280px]">
            {activeSizes.map(s => (
              <button key={s} type="button" onClick={() => setBrushSize(s)}
                className={cn("rounded-full shrink-0 transition-transform", brushSize === s ? "scale-110 ring-2 ring-primary bg-primary" : "bg-muted-foreground/40")}
                style={{ width: clamp(s * 1.2, 8, 32), height: clamp(s * 1.2, 8, 32) }} />
            ))}
          </div>
        )}

        {/* Text formatting */}
        {tool === "text" && (
          <div className="flex items-center gap-1 rounded-xl border border-border bg-background/60 px-1.5 py-1">
            <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); if (primaryEl?.kind === "text") updateEl(primaryEl.id, { fontFamily: e.target.value }); }}
              className="h-7 rounded-lg border-0 bg-transparent text-[11px] text-foreground outline-none">
              {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f.split(",")[0]}</option>)}
            </select>
            <select value={fontSize} onChange={e => { const v = Number(e.target.value); setFontSize(v); if (primaryEl?.kind === "text") updateEl(primaryEl.id, { fontSize: v }); }}
              className="h-7 w-14 rounded-lg border-0 bg-transparent text-[11px] text-foreground outline-none">
              {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
            <button type="button" onClick={() => { if (primaryEl?.kind === "text") updateEl(primaryEl.id, { fontWeight: primaryEl.fontWeight === "bold" ? "normal" : "bold" }); }}
              className={cn("rounded-lg p-1 transition-colors", primaryEl?.fontWeight === "bold" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => { if (primaryEl?.kind === "text") updateEl(primaryEl.id, { fontStyle: primaryEl.fontStyle === "italic" ? "normal" : "italic" }); }}
              className={cn("rounded-lg p-1 transition-colors", primaryEl?.fontStyle === "italic" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => { if (primaryEl?.kind === "text") updateEl(primaryEl.id, { textDecoration: primaryEl.textDecoration === "underline" ? "none" : "underline" }); }}
              className={cn("rounded-lg p-1 transition-colors", primaryEl?.textDecoration === "underline" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Underline className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Zoom + actions */}
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => zoom(viewport.zoom - 0.15)} className="h-7 w-7 p-0 text-muted-foreground"><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="min-w-[40px] text-center text-[11px] text-muted-foreground">{Math.round(viewport.zoom * 100)}%</span>
          <Button size="sm" variant="ghost" onClick={() => zoom(viewport.zoom + 0.15)} className="h-7 w-7 p-0 text-muted-foreground"><ZoomIn className="h-3.5 w-3.5" /></Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={undo} title="Undo (Ctrl+Z)" className="h-7 w-7 p-0 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={redo} title="Redo (Ctrl+Shift+Z)" className="h-7 w-7 p-0 text-muted-foreground"><Redo2 className="h-3.5 w-3.5" /></Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={() => save()} title="Save (Ctrl+S)" className="h-7 p-1 text-muted-foreground">
            <Save className="mr-1 h-3.5 w-3.5" /><span className="text-[10px]">Save</span>
          </Button>
          {dirty ? <CloudOff className="h-3.5 w-3.5 text-destructive" /> : <Cloud className="h-3.5 w-3.5 text-accent" />}
          {lastSaved && <span className="text-[10px] text-muted-foreground hidden sm:inline">{lastSaved.toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="h-7 border-primary/20 text-primary text-[11px]"><Download className="mr-1 h-3 w-3" />Import</Button>
        <Button size="sm" variant="outline" onClick={autoArrange} className="h-7 text-[11px]"><Wand2 className="mr-1 h-3 w-3" />Arrange</Button>
        <Button size="sm" variant="outline" onClick={duplicateSel} disabled={!selectedIds.size} className="h-7 text-[11px]"><Copy className="mr-1 h-3 w-3" />Duplicate</Button>
        <Button size="sm" variant="outline" onClick={() => { if (selectedIds.size !== 1) { toast.info("Select one card"); return; } setLinkSourceId(p => p ? null : Array.from(selectedIds)[0]); }} disabled={!selectedIds.size} className="h-7 text-[11px]"><Link2 className="mr-1 h-3 w-3" />{linkSourceId ? "Cancel" : "Link"}</Button>
        <Button size="sm" variant="outline" onClick={() => { const ids = Array.from(selRef.current); if (!ids.length) return; pushUndo(); setElements(p => p.map(e => ({ ...e, links: ids.includes(e.id) ? [] : e.links.filter(l => !ids.includes(l)) }))); }} disabled={!selectedIds.size} className="h-7 text-[11px]"><Unlink className="mr-1 h-3 w-3" />Unlink</Button>
        <Button size="sm" variant="outline" onClick={groupSelected} disabled={selectedIds.size < 2} className="h-7 text-[11px]"><Layers className="mr-1 h-3 w-3" />Group</Button>
        <Button size="sm" variant="outline" onClick={ungroupSelected} disabled={!selectedIds.size} className="h-7 text-[11px]">Ungroup</Button>
        <Button size="sm" variant="outline" onClick={clearInk} className="h-7 text-[11px]"><Eraser className="mr-1 h-3 w-3" />Clear ink</Button>
        <Button size="sm" variant="outline" onClick={deleteSel} disabled={!selectedIds.size} className="h-7 border-destructive/20 text-destructive text-[11px]"><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
        <Button size="sm" variant="outline" onClick={clearBoard} className="h-7 border-destructive/20 text-destructive text-[11px]"><RefreshCw className="mr-1 h-3 w-3" />Clear board</Button>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setShowInspector(p => !p)} className="h-7 text-[11px]"><Layers className="mr-1 h-3 w-3" />{showInspector ? "Hide" : "Inspector"}</Button>
          {selectedIds.size >= 2 && (
            <Button size="sm" onClick={evolve} disabled={evolving} className="h-7 bg-accent text-accent-foreground text-[11px]">
              {evolving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}Evolve {selectedIds.size}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{elements.filter(e => e.kind === "content").length} cards</span>
          <span>•</span>
          <span>{elements.filter(e => e.kind !== "content").length} elements</span>
          <span>•</span>
          <span>{strokes.length} strokes</span>
          {linkSourceId && <Badge variant="outline" className="border-accent/20 bg-accent/10 text-accent text-[10px]"><Link2 className="mr-1 h-3 w-3" />Click to link</Badge>}
        </div>
      </div>

      {/* Canvas + Inspector */}
      <div className={cn("flex gap-2", showInspector ? "flex-col lg:flex-row" : "")}>
        {/* Board */}
        <div
          ref={boardRef}
          onPointerDown={handleBoardDown}
          onWheel={handleWheel}
          className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-background touch-none"
          style={{
            height: isMobile ? "70vh" : "78vh",
            cursor: tool === "pan" ? "grab" : tool === "pen" ? "crosshair" : tool === "eraser" ? "cell" : tool === "text" ? "text" : "default",
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
            backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
          <div className="absolute inset-0" style={{ transform: `translate3d(${viewport.x}px,${viewport.y}px,0) scale(${viewport.zoom})`, transformOrigin: "0 0" }}>
            {ordered.map(el => (
              <ElementView key={el.id} el={el} selected={selectedIds.has(el.id)} linkSrc={linkSourceId === el.id}
                onDown={handleElDown} onResize={handleResizeDown} onTextChange={(id, v) => updateEl(id, { text: v })} />
            ))}
          </div>
          {!elements.length && !strokes.length && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-sm rounded-2xl border border-border bg-card/80 p-6 text-center shadow-sm backdrop-blur-sm">
                <Layers className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Sandbox</h3>
                <p className="mt-2 text-sm text-muted-foreground">Import content, draw, annotate, connect ideas, evolve with AI.</p>
                <p className="mt-1 text-xs text-muted-foreground">Ctrl+Z undo • Ctrl+Shift+Z redo • Ctrl+S save • Ctrl+G group</p>
              </div>
            </div>
          )}
        </div>

        {/* Inspector panel */}
        {showInspector && (
          <div className="w-full space-y-2 lg:w-[300px] shrink-0">
            <Card className="border-border bg-card/70">
              <CardContent className="space-y-3 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">Inspector</Badge>
                  {primaryEl && <Badge variant="outline" className={cn(PALETTE[primaryEl.tone].softClass, "text-[10px]")}>{primaryEl.kind}</Badge>}
                </div>
                {!primaryEl ? (
                  <p className="text-xs text-muted-foreground">Select an element to inspect</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
                      <div className="rounded-lg border border-border bg-background/60 px-2 py-1">x {Math.round(primaryEl.x)}</div>
                      <div className="rounded-lg border border-border bg-background/60 px-2 py-1">y {Math.round(primaryEl.y)}</div>
                      <div className="rounded-lg border border-border bg-background/60 px-2 py-1">w {Math.round(primaryEl.width)}</div>
                      <div className="rounded-lg border border-border bg-background/60 px-2 py-1">h {Math.round(primaryEl.height)}</div>
                    </div>

                    {primaryEl.kind === "content" && primaryEl.data && (
                      <>
                        <Input value={primaryEl.data.title || ""} onChange={e => updateContentField("title", e.target.value)} className="border-border bg-background/70 text-xs" placeholder="Title" />
                        <Textarea value={primaryEl.data.caption || ""} onChange={e => updateContentField("caption", e.target.value)} className="min-h-[100px] border-border bg-background/70 text-xs" placeholder="Caption" />
                        <Textarea value={primaryEl.annotation || ""} onChange={e => updateEl(primaryEl.id, { annotation: e.target.value })} className="min-h-[60px] border-border bg-background/70 text-xs" placeholder="Annotation..." />
                        <Button size="sm" onClick={saveBack} disabled={savingBack} className="w-full bg-primary text-primary-foreground text-xs h-8">
                          {savingBack ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}Save to Content
                        </Button>
                      </>
                    )}

                    {(primaryEl.kind === "note" || primaryEl.kind === "text") && (
                      <>
                        <Textarea value={primaryEl.text || ""} onChange={e => { pushUndo(); updateEl(primaryEl.id, { text: e.target.value }); }} className="min-h-[100px] border-border bg-background/70 text-xs" />
                        {primaryEl.kind === "text" && (
                          <div className="grid grid-cols-2 gap-1.5">
                            <select value={primaryEl.fontFamily || "Inter, sans-serif"} onChange={e => updateEl(primaryEl.id, { fontFamily: e.target.value })} className="rounded-lg border border-border bg-background/70 px-2 py-1 text-[10px] text-foreground">
                              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(",")[0]}</option>)}
                            </select>
                            <select value={primaryEl.fontSize || 16} onChange={e => updateEl(primaryEl.id, { fontSize: Number(e.target.value) })} className="rounded-lg border border-border bg-background/70 px-2 py-1 text-[10px] text-foreground">
                              {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    {primaryEl.kind === "shape" && (
                      <div className="flex flex-wrap gap-1">
                        {(Object.keys(PALETTE) as PaletteTone[]).map(t => (
                          <button key={t} type="button" onClick={() => updateEl(primaryEl.id, { tone: t })}
                            className={cn("rounded-lg border px-2 py-0.5 text-[10px]", primaryEl.tone === t ? PALETTE[t].softClass : "border-border text-muted-foreground")}>{PALETTE[t].label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evolver panel */}
            <Card className="border-border bg-card/70">
              <CardContent className="space-y-3 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-accent/20 bg-accent/10 text-accent text-[10px]">AI Evolver</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{selectedIds.size >= 2 ? `${selectedIds.size} selected — ready to evolve` : "Select 2+ to evolve"}</p>
                <Textarea value={evolverPrompt} onChange={e => setEvolverPrompt(e.target.value)} className="min-h-[60px] border-border bg-background/70 text-xs" placeholder="Evolution goal..." />
                <Input value={evolverPlatform} onChange={e => setEvolverPlatform(e.target.value)} className="border-border bg-background/70 text-xs" placeholder="Platform" />
                <Button size="sm" onClick={evolve} disabled={selectedIds.size < 2 || evolving} className="w-full bg-accent text-accent-foreground text-xs h-8">
                  {evolving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}Evolve
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Import dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-h-[86vh] max-w-5xl overflow-hidden border-border bg-card text-card-foreground">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-foreground"><Download className="h-4 w-4 text-primary" />Import cards</DialogTitle></DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={importQuery} onChange={e => setImportQuery(e.target.value)} className="border-border bg-background/70 pl-9" placeholder="Search..." />
            </div>
            {(["all", "drafts", "non-drafts", "competitor"] as const).map(m => (
              <Button key={m} size="sm" variant="outline" onClick={() => setImportMode(m)}
                className={cn("h-7 capitalize text-[11px]", importMode === m ? "border-primary/20 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{m.replace("-", " ")}</Button>
            ))}
            <Button size="sm" onClick={() => importItems(importable)} className="h-7 bg-primary text-primary-foreground text-[11px]"><Check className="mr-1 h-3 w-3" />Import ({importable.length})</Button>
          </div>
          <div className="grid gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {importable.map(item => {
              const on = importedSrcIds.has(item.id);
              return (
                <button key={item.id} type="button" onClick={() => importItems([item])}
                  className={cn("rounded-xl border p-3 text-left transition-colors", on ? "border-primary/20 bg-primary/10" : "border-border bg-background/60 hover:border-primary/30")}>
                  <div className="mb-2 flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="border-border text-[9px] capitalize text-muted-foreground">{item.platform}</Badge>
                    <Badge variant="outline" className={cn("text-[9px] capitalize", item.status === "draft" ? "border-primary/20 text-primary" : item.status === "published" ? "border-accent/20 text-accent" : "border-border text-muted-foreground")}>{item.status}</Badge>
                    {on && <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-[9px]">On board</Badge>}
                  </div>
                  <p className="text-xs font-semibold text-foreground line-clamp-2">{item.title}</p>
                  <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">{item.caption || item.description || "—"}</p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentSandbox;
