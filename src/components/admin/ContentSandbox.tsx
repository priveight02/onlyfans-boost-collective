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
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignLeft, AlignRight, AlignStartHorizontal, AlignStartVertical, ArrowRight, Bold, Check, Circle,
  Copy, Diamond, Download, Eraser, Eye, EyeOff, Frame, Grip, Hash, Italic, Layers, Link2, Loader2,
  Lock, Map as MapIcon, Maximize, MousePointer, Move, Paperclip, Pencil, Pipette,
  Redo2, RotateCcw, RotateCw, Save, Search, Smile, Sparkles, Square, StickyNote, Strikethrough,
  Trash2, Triangle, Type, Underline, Unlink, Unlock, ZoomIn, ZoomOut, RefreshCw, Palette,
  Send, FileDown, Grid3X3, Magnet, FileJson, FileSpreadsheet, FileImage, Image as ImageIcon,
  CaseSensitive, ALargeSmall, Minus, LetterText, Upload, Film, Music, ImagePlus, HelpCircle, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportSandboxToDrafts, pushSandboxDirectToPlatforms, getConnectedAccounts, DEFAULT_BEST_TIMES, type ExecutionMode } from "@/lib/contentSync";

/* ─── Types ─── */
type Tool = "select" | "pan" | "pen" | "eraser" | "text" | "note" | "rectangle" | "ellipse" | "triangle" | "diamond" | "arrow" | "connector" | "frame" | "stamp" | "media";
type ShapeKind = "rectangle" | "ellipse" | "triangle" | "diamond" | "arrow";
type ElementKind = "content" | "note" | "text" | "shape" | "frame" | "stamp" | "media";
type Point = { x: number; y: number };
type Viewport = { x: number; y: number; zoom: number };

interface SandboxStroke {
  id: string;
  tool: "pen" | "eraser";
  color: string;
  size: number;
  points: Point[];
  rotation?: number;
}

interface SandboxElement {
  id: string;
  kind: ElementKind;
  x: number; y: number; width: number; height: number; z: number;
  color: string;
  links: string[];
  groupId?: string;
  meshId?: string;
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
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: string;
  textTransform?: string;
  opacity?: number;
  emoji?: string;
  rotation?: number;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "gif";
  mediaName?: string;
}

type InteractionState =
  | { type: "pan"; originClient: Point; originViewport: Viewport }
  | { type: "draw"; tool: "pen" | "eraser"; color: string; size: number; points: Point[] }
  | { type: "drag"; anchor: Point; originPositions: Record<string, Point> }
  | { type: "resize"; elementId: string; anchor: Point; originRect: Pick<SandboxElement, "x" | "y" | "width" | "height"> }
  | { type: "marquee"; origin: Point; current: Point }
  | { type: "resize-stroke"; strokeId: string; anchor: Point; originBounds: { x: number; y: number; w: number; h: number }; originPoints: Point[] }
  | { type: "connector-draw"; from: Point; current: Point }
  | { type: "rotate"; elementId: string; center: Point; startAngle: number; startRotation: number }
  | { type: "rotate-stroke"; strokeId: string; center: Point; startAngle: number; startRotation: number };

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
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 144];
const FONT_FAMILIES = [
  "Inter, sans-serif", "Georgia, serif", "Courier New, monospace",
  "Comic Sans MS, cursive", "Impact, sans-serif", "Arial Black, sans-serif",
  "Trebuchet MS, sans-serif", "Verdana, sans-serif", "Times New Roman, serif",
  "Palatino, serif", "Garamond, serif", "Lucida Console, monospace",
];
const LETTER_SPACINGS = [-2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 10];
const LINE_HEIGHTS = [0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3];
const EMOJI_STAMPS = ["⭐", "🔥", "💡", "❤️", "✅", "⚡", "🎯", "🚀", "💰", "📌", "🏆", "💬", "📊", "🎨", "🔔", "⚠️"];

const ROTATION_SNAPS = [0, 45, 90, 135, 180, 225, 270, 315];

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
  { id: "connector", label: "Con", icon: Minus },
  { id: "frame", label: "F", icon: Frame },
  { id: "stamp", label: "S", icon: Smile },
  { id: "media", label: "M", icon: Film },
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

/* HSV ↔ RGB conversions for fast color picker */
const hsvToRgb = (h: number, s: number, v: number) => {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
};
const hsvToHex = (h: number, s: number, v: number) => { const { r, g, b } = hsvToRgb(h, s, v); return rgbToHex(r, g, b); };
const rgbToHsv = (r: number, g: number, b: number) => {
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1), d = max - min;
  let h = 0;
  if (d) {
    if (max === r1) h = 60 * (((g1 - b1) / d + 6) % 6);
    else if (max === g1) h = 60 * ((b1 - r1) / d + 2);
    else h = 60 * ((r1 - g1) / d + 4);
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
};
const hexToHsv = (hex: string) => { const { r, g, b } = hexToRgb(hex); return rgbToHsv(r, g, b); };

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

/* ─── Color Picker (Canvas-based, zero-lag) ─── */
const ColorPicker = memo(function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const svCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const hsvRef = useRef(hexToHsv(color));
  const draggingRef = useRef<"sv" | "hue" | null>(null);
  const lastEmitRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [localColor, setLocalColor] = useState(color);
  const [hexInput, setHexInput] = useState(color);

  // Sync external color changes
  useEffect(() => { setLocalColor(color); setHexInput(color); hsvRef.current = hexToHsv(color); }, [color]);

  // Draw SV canvas
  const drawSV = useCallback(() => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const hueColor = `hsl(${hsvRef.current.h}, 100%, 50%)`;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    const gradH = ctx.createLinearGradient(0, 0, w, 0);
    gradH.addColorStop(0, "#fff");
    gradH.addColorStop(1, hueColor);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, w, h);
    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "#000");
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);
  }, []);

  // Draw hue bar
  const drawHue = useCallback(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;
    const w = canvas.width;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) grad.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, canvas.height);
  }, []);

  useEffect(() => { if (open) { requestAnimationFrame(() => { drawSV(); drawHue(); }); } }, [open, drawSV, drawHue]);

  const emitColor = useCallback((h: number, s: number, v: number) => {
    const now = performance.now();
    if (now - lastEmitRef.current < 16) return;
    lastEmitRef.current = now;
    const hex = hsvToHex(h, s, v);
    setLocalColor(hex);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const handleSV = useCallback((e: MouseEvent | React.MouseEvent) => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const s = clamp((e.clientX - r.left) / r.width, 0, 1);
    const v = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    hsvRef.current = { ...hsvRef.current, s, v };
    emitColor(hsvRef.current.h, s, v);
  }, [emitColor]);

  const handleHue = useCallback((e: MouseEvent | React.MouseEvent) => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const h = clamp((e.clientX - r.left) / r.width, 0, 1) * 360;
    hsvRef.current = { ...hsvRef.current, h };
    drawSV();
    emitColor(h, hsvRef.current.s, hsvRef.current.v);
  }, [emitColor, drawSV]);

  useEffect(() => {
    if (!open) return;
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current === "sv") handleSV(e);
      else if (draggingRef.current === "hue") handleHue(e);
    };
    const onUp = () => { draggingRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [open, handleSV, handleHue]);

  const hsv = hsvRef.current;
  const rgb = hexToRgb(localColor);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="h-7 w-7 rounded-lg border border-white/10 transition-transform hover:scale-105 shadow-md shadow-black/20" style={{ backgroundColor: localColor }} />
      </PopoverTrigger>
      <PopoverContent className="w-[260px] border-white/10 bg-[hsl(222,35%,10%)] p-3 space-y-2.5" side="bottom" align="start">
        {/* SV Canvas */}
        <div className="relative">
          <canvas ref={svCanvasRef} width={234} height={140} className="w-full rounded-lg cursor-crosshair"
            style={{ height: 140 }}
            onMouseDown={e => { draggingRef.current = "sv"; handleSV(e); }} />
          <div className="pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 border-white shadow-md shadow-black/50"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, transform: "translate(-50%,-50%)" }} />
        </div>
        {/* Hue bar */}
        <div className="relative">
          <canvas ref={hueCanvasRef} width={234} height={14} className="w-full rounded-md cursor-pointer"
            style={{ height: 14 }}
            onMouseDown={e => { draggingRef.current = "hue"; handleHue(e); }} />
          <div className="pointer-events-none absolute top-0 h-full w-2.5 rounded-sm border-2 border-white shadow-md shadow-black/50"
            style={{ left: `${(hsv.h / 360) * 100}%`, transform: "translateX(-50%)" }} />
        </div>
        {/* Presets */}
        <div className="grid grid-cols-10 gap-1">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => { const nv = hexToHsv(c); hsvRef.current = nv; onChange(c); setLocalColor(c); setHexInput(c); drawSV(); }}
              className={cn("h-4.5 w-4.5 rounded-md border transition-transform hover:scale-110", localColor === c ? "border-white scale-110" : "border-transparent")}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        {/* Hex + RGB inputs */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg border border-white/10 shrink-0" style={{ backgroundColor: localColor }} />
          <div className="flex-1">
            <label className="text-[8px] uppercase tracking-wider text-white/30">HEX</label>
            <input value={hexInput} onChange={e => { setHexInput(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { const nv = hexToHsv(e.target.value); hsvRef.current = nv; onChange(e.target.value); setLocalColor(e.target.value); drawSV(); } }}
              className="h-5 w-full rounded border border-white/10 bg-white/5 px-1.5 text-[10px] text-white outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(["r", "g", "b"] as const).map(ch => (
            <div key={ch}>
              <label className="text-[8px] uppercase tracking-wider text-white/30">{ch}</label>
              <input type="number" min={0} max={255} value={rgb[ch]}
                onChange={e => { const hex = rgbToHex(ch === "r" ? Number(e.target.value) : rgb.r, ch === "g" ? Number(e.target.value) : rgb.g, ch === "b" ? Number(e.target.value) : rgb.b); const nv = hexToHsv(hex); hsvRef.current = nv; onChange(hex); setLocalColor(hex); setHexInput(hex); drawSV(); }}
                className="h-5 w-full rounded border border-white/10 bg-white/5 px-1.5 text-[10px] text-white outline-none" />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});

/* ─── ElementView ─── */
const ElementView = memo(function ElementView({ el, selected, linkSrc, onDown, onResize, onTextChange, onRotate }: {
  el: SandboxElement; selected: boolean; linkSrc: boolean;
  onDown: (e: React.PointerEvent, el: SandboxElement) => void;
  onResize: (e: React.PointerEvent, el: SandboxElement) => void;
  onTextChange: (id: string, v: string) => void;
  onRotate: (e: React.PointerEvent, el: SandboxElement) => void;
}) {
  const src = el.data ? getSource(el.data) : "";
  const rot = el.rotation || 0;

  return (
    <div
      className={cn("absolute", selected && "ring-2 ring-blue-400/80", linkSrc && "ring-2 ring-emerald-400")}
      style={{ left: el.x, top: el.y, width: el.width, height: el.height, zIndex: el.z, willChange: "transform", opacity: el.opacity ?? 1, transform: rot ? `rotate(${rot}deg)` : undefined, transformOrigin: "center center" }}
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
        <div className="flex h-full items-start rounded-xl border border-dashed border-white/10 bg-white/3 p-2 shadow-sm overflow-hidden">
          <div contentEditable suppressContentEditableWarning onPointerDown={e => e.stopPropagation()}
            onBlur={e => onTextChange(el.id, e.currentTarget.textContent || "")}
            className="w-full whitespace-pre-wrap break-words outline-none"
            style={{
              color: el.color,
              fontSize: el.fontSize || 16,
              fontFamily: el.fontFamily || "Inter, sans-serif",
              fontWeight: el.fontWeight || "normal",
              fontStyle: el.fontStyle || "normal",
              textDecoration: el.textDecoration || "none",
              letterSpacing: el.letterSpacing != null ? `${el.letterSpacing}px` : undefined,
              lineHeight: el.lineHeight || undefined,
              textAlign: (el.textAlign || "left") as any,
              textTransform: (el.textTransform || "none") as any,
            }}
          >{el.text || "Type here"}</div>
        </div>
      )}

      {el.kind === "shape" && el.shape && (
        <div className="h-full rounded-xl border border-white/6 bg-white/3 p-2">{shapeSvg(el.shape, el.color)}</div>
      )}

      {el.kind === "frame" && (
        <div className="h-full rounded-xl border-2 border-dashed p-2" style={{ borderColor: el.color + "50", backgroundColor: el.color + "08" }}>
          <span className="text-[9px] uppercase tracking-widest" style={{ color: el.color + "70" }}>{el.text || "Frame"}</span>
        </div>
      )}

      {el.kind === "stamp" && (
        <div className="flex h-full w-full items-center justify-center select-none" style={{ fontSize: Math.min(el.width, el.height) * 0.7 }}>
          {el.emoji || "⭐"}
        </div>
      )}

      {el.kind === "media" && el.mediaUrl && (
        <div className="h-full w-full rounded-xl border border-white/8 bg-[hsl(222,30%,10%)] overflow-hidden flex flex-col">
          <div className="flex items-center gap-1.5 border-b border-white/6 px-2 py-1">
            {el.mediaType === "video" && <Film className="h-3 w-3 text-purple-400/70" />}
            {el.mediaType === "audio" && <Music className="h-3 w-3 text-emerald-400/70" />}
            {(el.mediaType === "image" || el.mediaType === "gif") && <ImageIcon className="h-3 w-3 text-blue-400/70" />}
            <span className="text-[9px] text-white/40 truncate">{el.mediaName || "Media"}</span>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden" onPointerDown={e => e.stopPropagation()}>
            {(el.mediaType === "image" || el.mediaType === "gif") && (
              <img src={el.mediaUrl} alt={el.mediaName || "media"} className="max-h-full max-w-full object-contain" draggable={false} />
            )}
            {el.mediaType === "video" && (
              <video src={el.mediaUrl} controls playsInline preload="metadata" className="max-h-full max-w-full object-contain" />
            )}
            {el.mediaType === "audio" && (
              <div className="flex flex-col items-center gap-2 p-3 w-full">
                <Music className="h-8 w-8 text-emerald-400/40" />
                <audio src={el.mediaUrl} controls preload="metadata" className="w-full" style={{ maxWidth: "100%" }} />
                <span className="text-[10px] text-white/30 truncate max-w-full">{el.mediaName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {(el.groupId || el.meshId) && (
        <div className={cn("absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full border", el.meshId ? "bg-amber-400 border-amber-900" : "bg-emerald-400 border-emerald-900")}
          title={el.meshId ? "Meshed" : "Grouped"} />
      )}
      {/* Resize handle */}
      <button type="button" aria-label="Resize" className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border border-white/15 bg-white/10 cursor-se-resize" onPointerDown={e => onResize(e as any, el)} />
      {/* Rotate handle - shown when selected */}
      {selected && (
        <button type="button" aria-label="Rotate" className="absolute -top-5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full border border-blue-400/40 bg-blue-500/20 cursor-grab flex items-center justify-center hover:bg-blue-500/40 transition-colors"
          onPointerDown={e => { e.stopPropagation(); onRotate(e as any, el); }}>
          <RotateCw className="h-2.5 w-2.5 text-blue-300" />
        </button>
      )}
      {rot !== 0 && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-blue-400/50 whitespace-nowrap">{Math.round(rot)}°</div>
      )}
    </div>
  );
});

/* ─── Export helpers ─── */
const exportToPNG = (canvas: HTMLCanvasElement | null, elements: SandboxElement[], strokes: SandboxStroke[], vp: Viewport, board: HTMLDivElement | null, bgColor: string, scale: number) => {
  if (!board) return;
  // Calculate bounds of all content
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) { minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.width); maxY = Math.max(maxY, el.y + el.height); }
  for (const s of strokes) { const b = strokeBounds(s); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
  if (!isFinite(minX)) { toast.info("Nothing to export"); return; }
  const pad = 40;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const w = (maxX - minX) * scale, h = (maxY - minY) * scale;
  const offscreen = document.createElement("canvas");
  offscreen.width = w; offscreen.height = h;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-minX, -minY);
  // Draw strokes
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    ctx.beginPath(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = s.size;
    ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }
  // Draw elements as colored rects with text
  for (const el of elements) {
    ctx.globalAlpha = el.opacity ?? 1;
    ctx.fillStyle = el.color + "18";
    ctx.strokeStyle = el.color + "60";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if ((el.kind === "shape" && el.shape === "ellipse")) {
      ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
    } else {
      ctx.rect(el.x, el.y, el.width, el.height);
    }
    ctx.fill(); ctx.stroke();
    // Text content
    const label = el.text || el.data?.title || el.emoji || "";
    if (label) {
      ctx.fillStyle = el.kind === "stamp" ? "#000" : el.color;
      ctx.font = `${el.fontWeight || "normal"} ${el.fontSize || 14}px ${(el.fontFamily || "Inter").split(",")[0]}`;
      ctx.textBaseline = "top";
      ctx.fillText(label.substring(0, 100), el.x + 8, el.y + 8, el.width - 16);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  offscreen.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sandbox-export-${Date.now()}.png`; a.click();
    URL.revokeObjectURL(url);
    toast.success("PNG exported");
  }, "image/png");
};

const exportToJSON = (elements: SandboxElement[], strokes: SandboxStroke[]) => {
  const data = JSON.stringify({ version: 7, exportedAt: new Date().toISOString(), elements, strokes }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `sandbox-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
  toast.success("JSON exported");
};

const exportToCSV = (elements: SandboxElement[]) => {
  const content = elements.filter(e => e.kind === "content" && e.data);
  if (!content.length) { toast.info("No content cards to export as CSV"); return; }
  const headers = ["Title", "Caption", "Platform", "Type", "Status", "Hashtags", "Viral Score", "Annotation"];
  const rows = content.map(e => [
    `"${(e.data?.title || "").replace(/"/g, '""')}"`,
    `"${(e.data?.caption || "").replace(/"/g, '""')}"`,
    e.data?.platform || "", e.data?.content_type || "", e.data?.status || "",
    `"${(e.data?.hashtags || []).join(", ")}"`,
    String(e.data?.viral_score || ""),
    `"${(e.annotation || "").replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `sandbox-content-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exported (compatible with Excel, Google Sheets, LibreOffice)");
};

const exportToSVG = (elements: SandboxElement[], strokes: SandboxStroke[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) { minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.width); maxY = Math.max(maxY, el.y + el.height); }
  for (const s of strokes) { const b = strokeBounds(s); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
  if (!isFinite(minX)) { toast.info("Nothing to export"); return; }
  const pad = 40; minX -= pad; minY -= pad;
  const w = maxX - minX + pad * 2, h = maxY - minY + pad * 2;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`;
  svg += `<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="#1a1f2e"/>`;
  for (const s of strokes) {
    if (s.points.length < 2 || s.tool === "eraser") continue;
    const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    svg += `<path d="${d}" stroke="${s.color}" stroke-width="${s.size}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  for (const el of elements) {
    svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${el.color}18" stroke="${el.color}60" stroke-width="2" rx="8"/>`;
    const label = el.text || el.data?.title || "";
    if (label) svg += `<text x="${el.x + 8}" y="${el.y + 20}" fill="${el.color}" font-size="${el.fontSize || 14}" font-family="${(el.fontFamily || "Inter").split(",")[0]}">${label.substring(0, 80).replace(/[<>&]/g, "")}</text>`;
  }
  svg += "</svg>";
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `sandbox-${Date.now()}.svg`; a.click();
  URL.revokeObjectURL(url);
  toast.success("SVG exported (vector format, no pixel loss)");
};

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
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "json" | "csv">("png");
  const [exportScale, setExportScale] = useState(2);
  const [exportBg, setExportBg] = useState("#1a1f2e");
  const [exportScope, setExportScope] = useState<"all" | "selected">("all");
  const [activeStamp, setActiveStamp] = useState("⭐");
  const [canvasBgImage, setCanvasBgImage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showElementCount, setShowElementCount] = useState(true);
  const [proportionalResize, setProportionalResize] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showCoords, setShowCoords] = useState(true);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
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
      if (payload.length < 4_000_000) {
        localStorage.setItem(HISTORY_KEY, payload);
      } else {
        const trimmed = { undo: undoStack.current.slice(-40), redo: redoStack.current.slice(-20) };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      }
    } catch { /* storage full */ }
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
  useEffect(() => { selStrokesRef.current = selectedStrokeIds; }, [selectedStrokeIds]);
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
  const hasTextSelection = useMemo(() => primaryEl?.kind === "text" || tool === "text", [primaryEl, tool]);

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
      if (selStrokesRef.current.has(s.id)) {
        const b = strokeBounds(s);
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "rgba(96,165,250,0.7)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        // Draw resize handle (bottom-right)
        ctx.fillStyle = "rgba(96,165,250,0.9)";
        ctx.fillRect(b.x + b.w - 5, b.y + b.h - 5, 10, 10);
        // Draw rotate handle (top-center circle)
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y - 16, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(96,165,250,0.3)";
        ctx.fill();
        ctx.strokeStyle = "rgba(96,165,250,0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Draw rotate icon (circular arrow hint)
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y - 16, 3.5, -Math.PI * 0.8, Math.PI * 0.5);
        ctx.strokeStyle = "rgba(147,197,253,0.9)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Line from top-center to rotate handle
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = "rgba(96,165,250,0.4)";
        ctx.lineWidth = 1;
        ctx.moveTo(b.x + b.w / 2, b.y);
        ctx.lineTo(b.x + b.w / 2, b.y - 10);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }, [draftStroke]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawScene);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawScene, elements, strokes, viewport, selectedStrokeIds]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const obs = new ResizeObserver(() => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(drawScene); });
    obs.observe(board);
    return () => obs.disconnect();
  }, [drawScene]);

  /* ─── Snap helper ─── */
  const snap = useCallback((v: number) => snapToGrid ? Math.round(v / GRID_SIZE) * GRID_SIZE : v, [snapToGrid]);

  /* ─── Element ops ─── */
  const linkEls = useCallback((from: string, to: string) => {
    pushUndo();
    setElements(p => p.map(e => e.id !== from ? e : { ...e, links: e.links.includes(to) ? e.links.filter(i => i !== to) : [...e.links, to] }));
  }, [pushUndo]);

  const addEl = useCallback((t: Tool, pt: Point) => {
    pushUndo();
    const z = nextZ(elsRef.current);
    const base: Partial<SandboxElement> = {
      id: `sb-${crypto.randomUUID()}`, x: snap(pt.x), y: snap(pt.y), z, color: activeColor, links: [],
      annotation: "", fontSize, fontFamily, fontWeight: "normal", fontStyle: "normal", textDecoration: "none",
      letterSpacing: 0, lineHeight: 1.3, textAlign: "left", textTransform: "none", opacity: 1,
    };
    let el: SandboxElement | null = null;
    if (t === "note") el = { ...base, kind: "note", width: 240, height: 180, text: "" } as SandboxElement;
    if (t === "text") el = { ...base, kind: "text", width: 280, height: 80, text: "Type here" } as SandboxElement;
    if (t === "frame") el = { ...base, kind: "frame", width: 400, height: 300, text: "Frame" } as SandboxElement;
    if (t === "stamp") el = { ...base, kind: "stamp", width: 64, height: 64, emoji: activeStamp } as SandboxElement;
    if (["rectangle", "ellipse", "triangle", "diamond", "arrow"].includes(t))
      el = { ...base, kind: "shape", width: t === "arrow" ? 220 : 180, height: t === "arrow" ? 80 : 160, shape: t as ShapeKind } as SandboxElement;
    if (!el) return;
    setElements(p => [...p, el!]);
    setSelectedIds(new Set([el.id]));
  }, [activeColor, pushUndo, fontSize, fontFamily, snap, activeStamp]);

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
    if (!ids.length && !selStrokesRef.current.size) return;
    pushUndo();
    if (ids.length) {
      const src = elsRef.current.filter(e => ids.includes(e.id));
      let z = nextZ(elsRef.current);
      const dups = src.map(e => ({ ...clone(e), id: `sb-${crypto.randomUUID()}`, x: e.x + 28, y: e.y + 28, z: z++, links: [] }));
      setElements(p => [...p, ...dups]);
      setSelectedIds(new Set(dups.map(e => e.id)));
    }
    if (selStrokesRef.current.size) {
      const selS = strokesRef.current.filter(s => selStrokesRef.current.has(s.id));
      const dupStrokes = selS.map(s => ({ ...clone(s), id: crypto.randomUUID(), points: s.points.map(p => ({ x: p.x + 28, y: p.y + 28 })) }));
      setStrokes(p => [...p, ...dupStrokes]);
      setSelectedStrokeIds(new Set(dupStrokes.map(s => s.id)));
    }
  }, [pushUndo]);

  const deleteSel = useCallback(() => {
    const ids = new Set(selRef.current);
    const sIds = new Set(selStrokesRef.current);
    if (!ids.size && !sIds.size) return;
    pushUndo();
    if (ids.size) setElements(p => p.filter(e => !ids.has(e.id)).map(e => ({ ...e, links: e.links.filter(l => !ids.has(l)) })));
    if (sIds.size) setStrokes(p => p.filter(s => !sIds.has(s.id)));
    setSelectedIds(new Set()); setSelectedStrokeIds(new Set()); setLinkSourceId(null);
  }, [pushUndo]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(elsRef.current.map(e => e.id)));
    setSelectedStrokeIds(new Set(strokesRef.current.map(s => s.id)));
  }, []);

  const fitToView = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const r = board.getBoundingClientRect();
    const allEls = elsRef.current;
    const allStrokes = strokesRef.current;
    if (!allEls.length && !allStrokes.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of allEls) { minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.width); maxY = Math.max(maxY, el.y + el.height); }
    for (const s of allStrokes) { const b = strokeBounds(s); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
    const cw = maxX - minX + 80, ch = maxY - minY + 80;
    const z = clamp(Math.min(r.width / cw, r.height / ch), MIN_ZOOM, MAX_ZOOM);
    setViewport({ zoom: z, x: (r.width - cw * z) / 2 - minX * z + 40, y: (r.height - ch * z) / 2 - minY * z + 40 });
  }, []);

  const alignSelected = useCallback((dir: "left" | "right" | "top" | "bottom" | "center-h" | "center-v") => {
    const ids = Array.from(selRef.current);
    if (ids.length < 2) { toast.info("Select 2+ elements to align"); return; }
    pushUndo();
    const sel = elsRef.current.filter(e => ids.includes(e.id));
    let target: number;
    switch (dir) {
      case "left": target = Math.min(...sel.map(e => e.x)); setElements(p => p.map(e => ids.includes(e.id) ? { ...e, x: target } : e)); break;
      case "right": target = Math.max(...sel.map(e => e.x + e.width)); setElements(p => p.map(e => ids.includes(e.id) ? { ...e, x: target - e.width } : e)); break;
      case "top": target = Math.min(...sel.map(e => e.y)); setElements(p => p.map(e => ids.includes(e.id) ? { ...e, y: target } : e)); break;
      case "bottom": target = Math.max(...sel.map(e => e.y + e.height)); setElements(p => p.map(e => ids.includes(e.id) ? { ...e, y: target - e.height } : e)); break;
      case "center-h": { const cx = sel.reduce((a, e) => a + e.x + e.width / 2, 0) / sel.length; setElements(p => p.map(e => ids.includes(e.id) ? { ...e, x: cx - e.width / 2 } : e)); break; }
      case "center-v": { const cy = sel.reduce((a, e) => a + e.y + e.height / 2, 0) / sel.length; setElements(p => p.map(e => ids.includes(e.id) ? { ...e, y: cy - e.height / 2 } : e)); break; }
    }
  }, [pushUndo]);

  const nudge = useCallback((dx: number, dy: number) => {
    const ids = Array.from(selRef.current);
    const sIds = Array.from(selStrokesRef.current);
    if (!ids.length && !sIds.length) return;
    pushUndo();
    const sdx = snap(dx) || dx, sdy = snap(dy) || dy;
    if (ids.length) setElements(p => p.map(e => ids.includes(e.id) ? { ...e, x: e.x + sdx, y: e.y + sdy } : e));
    if (sIds.length) setStrokes(p => p.map(s => sIds.includes(s.id) ? { ...s, points: s.points.map(pt => ({ x: pt.x + sdx, y: pt.y + sdy })) } : s));
  }, [pushUndo, snap]);

  const clearBoard = useCallback(() => {
    if (!confirm("Clear the entire board?")) return;
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

  /* ─── Mesh attach/detach ─── */
  const meshAttach = useCallback(() => {
    const ids = Array.from(selRef.current);
    if (ids.length < 2) { toast.info("Select 2+ elements to mesh"); return; }
    pushUndo();
    const mid = `mesh-${crypto.randomUUID()}`;
    setElements(p => p.map(e => ids.includes(e.id) ? { ...e, meshId: mid } : e));
    toast.success(`${ids.length} elements attached to mesh`);
  }, [pushUndo]);

  const meshDetach = useCallback(() => {
    const ids = Array.from(selRef.current);
    if (!ids.length) return;
    pushUndo();
    setElements(p => p.map(e => ids.includes(e.id) ? { ...e, meshId: undefined } : e));
    toast.success("Detached from mesh");
  }, [pushUndo]);

  const autoArrange = useCallback(() => {
    pushUndo();
    const ids = Array.from(selRef.current);
    const targets = ids.length ? ids : elsRef.current.map(e => e.id);
    const cols = isMobile ? 1 : 3;
    let i = 0;
    setElements(p => p.map(e => { if (!targets.includes(e.id)) return e; const pt = gridPos(i++, cols); return { ...e, x: pt.x, y: pt.y }; }));
  }, [isMobile, pushUndo]);

  /* ─── Convenience: Send to Back ─── */
  const sendToBack = useCallback(() => {
    const ids = Array.from(selRef.current);
    if (!ids.length) return;
    pushUndo();
    const minZ = Math.min(...elsRef.current.map(e => e.z));
    let z = minZ - ids.length;
    setElements(p => p.map(e => ids.includes(e.id) ? { ...e, z: z++ } : e));
  }, [pushUndo]);

  /* ─── Convenience: Flip horizontal/vertical ─── */
  const flipSelected = useCallback((axis: "h" | "v") => {
    const ids = Array.from(selRef.current);
    if (!ids.length) return;
    pushUndo();
    const sel = elsRef.current.filter(e => ids.includes(e.id));
    if (axis === "h") {
      const cx = sel.reduce((a, e) => a + e.x + e.width / 2, 0) / sel.length;
      setElements(p => p.map(e => ids.includes(e.id) ? { ...e, x: cx * 2 - e.x - e.width } : e));
    } else {
      const cy = sel.reduce((a, e) => a + e.y + e.height / 2, 0) / sel.length;
      setElements(p => p.map(e => ids.includes(e.id) ? { ...e, y: cy * 2 - e.y - e.height } : e));
    }
  }, [pushUndo]);

  /* ─── Convenience: Center on canvas ─── */
  const centerOnCanvas = useCallback(() => {
    const board = boardRef.current;
    const ids = Array.from(selRef.current);
    if (!board || !ids.length) return;
    pushUndo();
    const r = board.getBoundingClientRect();
    const sel = elsRef.current.filter(e => ids.includes(e.id));
    const bounds = { minX: Math.min(...sel.map(e => e.x)), minY: Math.min(...sel.map(e => e.y)), maxX: Math.max(...sel.map(e => e.x + e.width)), maxY: Math.max(...sel.map(e => e.y + e.height)) };
    const cx = (bounds.minX + bounds.maxX) / 2, cy = (bounds.minY + bounds.maxY) / 2;
    const canvasCx = (-vpRef.current.x + r.width / 2) / vpRef.current.zoom;
    const canvasCy = (-vpRef.current.y + r.height / 2) / vpRef.current.zoom;
    const dx = canvasCx - cx, dy = canvasCy - cy;
    setElements(p => p.map(e => ids.includes(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e));
  }, [pushUndo]);

  /* ─── Convenience: Distribute evenly ─── */
  const distributeSelected = useCallback((axis: "h" | "v") => {
    const ids = Array.from(selRef.current);
    if (ids.length < 3) { toast.info("Select 3+ elements to distribute"); return; }
    pushUndo();
    const sel = elsRef.current.filter(e => ids.includes(e.id)).sort((a, b) => axis === "h" ? a.x - b.x : a.y - b.y);
    if (axis === "h") {
      const totalW = sel.reduce((a, e) => a + e.width, 0);
      const span = sel[sel.length - 1].x + sel[sel.length - 1].width - sel[0].x;
      const gap = (span - totalW) / (sel.length - 1);
      let x = sel[0].x;
      const idToX: Record<string, number> = {};
      sel.forEach(e => { idToX[e.id] = x; x += e.width + gap; });
      setElements(p => p.map(e => ids.includes(e.id) ? { ...e, x: idToX[e.id] ?? e.x } : e));
    } else {
      const totalH = sel.reduce((a, e) => a + e.height, 0);
      const span = sel[sel.length - 1].y + sel[sel.length - 1].height - sel[0].y;
      const gap = (span - totalH) / (sel.length - 1);
      let y = sel[0].y;
      const idToY: Record<string, number> = {};
      sel.forEach(e => { idToY[e.id] = y; y += e.height + gap; });
      setElements(p => p.map(e => ids.includes(e.id) ? { ...e, y: idToY[e.id] ?? e.y } : e));
    }
  }, [pushUndo]);

  /* ─── Convenience: Reset rotation ─── */
  const resetRotation = useCallback(() => {
    const ids = Array.from(selRef.current);
    const sIds = Array.from(selStrokesRef.current);
    if (!ids.length && !sIds.length) return;
    pushUndo();
    if (ids.length) setElements(p => p.map(e => ids.includes(e.id) ? { ...e, rotation: 0 } : e));
    if (sIds.length) setStrokes(p => p.map(s => sIds.includes(s.id) ? { ...s, rotation: 0 } : s));
    toast.success("Rotation reset to 0°");
  }, [pushUndo]);

  /* ─── Convenience: Match size (make selected same size as first) ─── */
  const matchSize = useCallback(() => {
    const ids = Array.from(selRef.current);
    if (ids.length < 2) { toast.info("Select 2+ elements to match size"); return; }
    pushUndo();
    const ref = elsRef.current.find(e => e.id === ids[0]);
    if (!ref) return;
    setElements(p => p.map(e => ids.includes(e.id) && e.id !== ids[0] ? { ...e, width: ref.width, height: ref.height } : e));
    toast.success("Sizes matched to first selection");
  }, [pushUndo]);

  /* ─── Convenience: Reset zoom & pan ─── */
  const resetView = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
    toast.success("View reset");
  }, []);

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
  const startDrag = useCallback((el: SandboxElement, cx: number, cy: number, altDup?: boolean) => {
    const pt = scenePoint(cx, cy, boardRef.current, vpRef.current);
    let ids = selRef.current.has(el.id) ? Array.from(selRef.current) : [el.id];
    if (el.groupId) {
      const groupEls = elsRef.current.filter(e => e.groupId === el.groupId).map(e => e.id);
      ids = [...new Set([...ids, ...groupEls])];
    }
    // Mesh: select all meshed elements together
    if (el.meshId) {
      const meshEls = elsRef.current.filter(e => e.meshId === el.meshId).map(e => e.id);
      ids = [...new Set([...ids, ...meshEls])];
    }
    if (altDup) {
      pushUndo();
      const src = elsRef.current.filter(e => ids.includes(e.id));
      let z = nextZ(elsRef.current);
      const dups = src.map(e => ({ ...clone(e), id: `sb-${crypto.randomUUID()}`, z: z++, links: [] }));
      setElements(p => [...p, ...dups]);
      ids = dups.map(e => e.id);
      setSelectedIds(new Set(ids));
    }
    const origins = Object.fromEntries(elsRef.current.filter(e => ids.includes(e.id)).map(e => [e.id, { x: e.x, y: e.y }]));
    const strokeOrigins: Record<string, Point[]> = {};
    for (const s of strokesRef.current) {
      if (selStrokesRef.current.has(s.id)) strokeOrigins[s.id] = s.points.map(p => ({ ...p }));
    }
    interactionRef.current = { type: "drag", anchor: pt, originPositions: { ...origins, __strokeOrigins: strokeOrigins as any } };
  }, [pushUndo]);

  const handleElDown = useCallback((e: React.PointerEvent, el: SandboxElement) => {
    e.stopPropagation();
    if (linkSourceId && linkSourceId !== el.id) { linkEls(linkSourceId, el.id); setLinkSourceId(null); toast.success("Linked"); return; }
    pushUndo();
    const next = new Set(selRef.current);
    if (e.shiftKey) { next.has(el.id) ? next.delete(el.id) : next.add(el.id); }
    else if (!next.has(el.id)) {
      next.clear(); next.add(el.id); setSelectedStrokeIds(new Set());
      if (el.groupId) elsRef.current.filter(g => g.groupId === el.groupId).forEach(g => next.add(g.id));
      if (el.meshId) elsRef.current.filter(g => g.meshId === el.meshId).forEach(g => next.add(g.id));
    }
    setSelectedIds(new Set(next));
    bringForward();
    if (tool === "select") startDrag(el, e.clientX, e.clientY, e.altKey);
  }, [tool, bringForward, linkEls, linkSourceId, startDrag, pushUndo]);

  const handleResizeDown = useCallback((e: React.PointerEvent, el: SandboxElement) => {
    e.stopPropagation();
    pushUndo();
    const anchor = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
    interactionRef.current = { type: "resize", elementId: el.id, anchor, originRect: { x: el.x, y: el.y, width: el.width, height: el.height } };
    setSelectedIds(new Set([el.id]));
  }, [pushUndo]);

  const handleRotateDown = useCallback((e: React.PointerEvent, el: SandboxElement) => {
    e.stopPropagation();
    pushUndo();
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const pt = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
    const startAngle = Math.atan2(pt.y - cy, pt.x - cx) * (180 / Math.PI);
    interactionRef.current = { type: "rotate", elementId: el.id, center: { x: cx, y: cy }, startAngle, startRotation: el.rotation || 0 };
    setSelectedIds(new Set([el.id]));
  }, [pushUndo]);

  /* ─── R key snap rotation ─── */
  const rotateSnap = useCallback(() => {
    const ids = Array.from(selRef.current);
    const sIds = Array.from(selStrokesRef.current);
    if (!ids.length && !sIds.length) return;
    pushUndo();
    if (ids.length) {
      setElements(p => p.map(e => {
        if (!ids.includes(e.id)) return e;
        const cur = e.rotation || 0;
        const nextSnap = ROTATION_SNAPS.find(s => s > cur) ?? 0;
        return { ...e, rotation: nextSnap };
      }));
    }
    if (sIds.length) {
      setStrokes(p => p.map(s => {
        if (!sIds.includes(s.id)) return s;
        const cur = s.rotation || 0;
        const nextSnap = ROTATION_SNAPS.find(sn => sn > cur) ?? 0;
        // Rotate stroke points around center
        const b = strokeBounds(s);
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        const angleDiff = (nextSnap - cur) * Math.PI / 180;
        const newPoints = s.points.map(p => {
          const dx = p.x - cx, dy = p.y - cy;
          return { x: cx + dx * Math.cos(angleDiff) - dy * Math.sin(angleDiff), y: cy + dx * Math.sin(angleDiff) + dy * Math.cos(angleDiff) };
        });
        return { ...s, points: newPoints, rotation: nextSnap };
      }));
    }
  }, [pushUndo]);

  /* ─── Media import ─── */
  const handleMediaImport = useCallback((files: FileList) => {
    pushUndo();
    const z = nextZ(elsRef.current);
    const newEls: SandboxElement[] = [];
    Array.from(files).forEach((file, i) => {
      const url = URL.createObjectURL(file);
      let mediaType: "image" | "video" | "audio" | "gif" = "image";
      if (file.type.startsWith("video/")) mediaType = "video";
      else if (file.type.startsWith("audio/")) mediaType = "audio";
      else if (file.type === "image/gif") mediaType = "gif";
      const el: SandboxElement = {
        id: `sb-${crypto.randomUUID()}`, kind: "media",
        x: 100 + i * 40, y: 100 + i * 40,
        width: mediaType === "audio" ? 300 : 320,
        height: mediaType === "audio" ? 120 : 240,
        z: z + i, color: "#3b82f6", links: [], opacity: 1,
        mediaUrl: url, mediaType, mediaName: file.name, rotation: 0,
      };
      newEls.push(el);
    });
    setElements(p => [...p, ...newEls]);
    setSelectedIds(new Set(newEls.map(e => e.id)));
    toast.success(`${newEls.length} media file(s) imported`);
  }, [pushUndo]);

  /* ─── Custom background ─── */
  const handleBgImport = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setCanvasBgImage(url);
    toast.success("Background set");
  }, []);

  const handleBoardDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1 || tool === "pan" || spaceHeldRef.current) {
      interactionRef.current = { type: "pan", originClient: { x: e.clientX, y: e.clientY }, originViewport: vpRef.current };
      return;
    }
    const pt = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
    if (tool === "pen" || tool === "eraser") {
      interactionRef.current = { type: "draw", tool, color: activeColor, size: brushSize, points: [pt] };
      setDraftStroke({ id: "draft", tool, color: activeColor, size: brushSize, points: [pt] });
      return;
    }
    if (["note", "text", "rectangle", "ellipse", "triangle", "diamond", "arrow", "frame", "stamp"].includes(tool)) { addEl(tool, pt); return; }
    if (tool === "media") { mediaInputRef.current?.click(); return; }
    // Connector tool: start drawing a connection line
    if (tool === "connector") {
      interactionRef.current = { type: "draw", tool: "pen", color: activeColor, size: 3, points: [pt] };
      setDraftStroke({ id: "draft", tool: "pen", color: activeColor, size: 3, points: [pt] });
      return;
    }
    // Check if clicking on a selected stroke's resize handle
    if (tool === "select" && selStrokesRef.current.size) {
      for (const s of strokesRef.current) {
        if (!selStrokesRef.current.has(s.id)) continue;
        const b = strokeBounds(s);
        // Resize handle (bottom-right corner)
        const handleX = b.x + b.w, handleY = b.y + b.h;
        if (Math.abs(pt.x - handleX) < 12 && Math.abs(pt.y - handleY) < 12) {
          interactionRef.current = { type: "resize-stroke", strokeId: s.id, anchor: pt, originBounds: b, originPoints: s.points.map(p => ({ ...p })) };
          return;
        }
        // Rotate handle (top-center)
        const rotHandleX = b.x + b.w / 2, rotHandleY = b.y - 16;
        if (Math.abs(pt.x - rotHandleX) < 12 && Math.abs(pt.y - rotHandleY) < 12) {
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          const startAngle = Math.atan2(pt.y - cy, pt.x - cx) * (180 / Math.PI);
          interactionRef.current = { type: "rotate-stroke", strokeId: s.id, center: { x: cx, y: cy }, startAngle, startRotation: s.rotation || 0 };
          return;
        }
      }
    }
    // Check if clicking inside a selected stroke to drag it
    if (tool === "select" && selStrokesRef.current.size) {
      for (const s of strokesRef.current) {
        if (!selStrokesRef.current.has(s.id)) continue;
        const b = strokeBounds(s);
        if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
          pushUndo();
          const origins: Record<string, Point> = {};
          for (const el of elsRef.current) {
            if (selRef.current.has(el.id)) origins[el.id] = { x: el.x, y: el.y };
          }
          const strokeOrigins: Record<string, Point[]> = {};
          for (const ss of strokesRef.current) {
            if (selStrokesRef.current.has(ss.id)) strokeOrigins[ss.id] = ss.points.map(p => ({ ...p }));
          }
          interactionRef.current = { type: "drag", anchor: pt, originPositions: { ...origins, __strokeOrigins: strokeOrigins as any } };
          return;
        }
      }
    }
    if (tool === "select") {
      interactionRef.current = { type: "marquee", origin: pt, current: pt };
      setMarqueeRect(null);
      setSelectedIds(new Set());
      setSelectedStrokeIds(new Set());
      setLinkSourceId(null);
      return;
    }
    setSelectedIds(new Set());
    setSelectedStrokeIds(new Set());
    setLinkSourceId(null);
  }, [tool, activeColor, addEl, brushSize]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pt0 = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
      setMouseScene(pt0);

      const ix = interactionRef.current;
      if (!ix) return;
      if (ix.type === "pan") { setViewport({ ...ix.originViewport, x: ix.originViewport.x + e.clientX - ix.originClient.x, y: ix.originViewport.y + e.clientY - ix.originClient.y }); return; }
      const pt = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
      if (ix.type === "marquee") {
        ix.current = pt;
        const mx = Math.min(ix.origin.x, pt.x), my = Math.min(ix.origin.y, pt.y);
        const mw = Math.abs(pt.x - ix.origin.x), mh = Math.abs(pt.y - ix.origin.y);
        setMarqueeRect({ x: mx, y: my, w: mw, h: mh });
        const hit = new Set<string>();
        for (const el of elsRef.current) {
          if (el.x + el.width > mx && el.x < mx + mw && el.y + el.height > my && el.y < my + mh) {
            hit.add(el.id);
            if (el.groupId) elsRef.current.filter(g => g.groupId === el.groupId).forEach(g => hit.add(g.id));
            if (el.meshId) elsRef.current.filter(g => g.meshId === el.meshId).forEach(g => hit.add(g.id));
          }
        }
        setSelectedIds(hit);
        const hitStrokes = new Set<string>();
        for (const s of strokesRef.current) {
          const b = strokeBounds(s);
          if (b.x + b.w > mx && b.x < mx + mw && b.y + b.h > my && b.y < my + mh) hitStrokes.add(s.id);
        }
        setSelectedStrokeIds(hitStrokes);
        return;
      }
      if (ix.type === "draw") { ix.points.push(pt); setDraftStroke({ id: "draft", tool: ix.tool, color: ix.color, size: ix.size, points: [...ix.points] }); return; }
      if (ix.type === "drag") {
        const dx = pt.x - ix.anchor.x, dy = pt.y - ix.anchor.y;
        setElements(p => p.map(el => { const o = ix.originPositions[el.id]; return o ? { ...el, x: snap(o.x + dx), y: snap(o.y + dy) } : el; }));
        const so = (ix.originPositions as any).__strokeOrigins as Record<string, Point[]> | undefined;
        if (so && Object.keys(so).length) {
          setStrokes(p => p.map(s => {
            const orig = so[s.id];
            if (!orig) return s;
            return { ...s, points: orig.map(op => ({ x: op.x + dx, y: op.y + dy })) };
          }));
        }
        return;
      }
      if (ix.type === "resize") {
        const dx = pt.x - ix.anchor.x, dy = pt.y - ix.anchor.y;
        const newW = Math.max(ix.originRect.width + dx, 10);
        const newH = Math.max(ix.originRect.height + dy, 10);
        setElements(p => p.map(el => {
          if (el.id !== ix.elementId) return el;
          const patch: Partial<SandboxElement> = { width: newW, height: newH };
          // Scale font size proportionally for text elements
          if (el.kind === "text" && el.fontSize) {
            const scaleRatio = newW / ix.originRect.width;
            patch.fontSize = Math.max(Math.round((el.fontSize || 16) * scaleRatio), 4);
          }
          return { ...el, ...patch };
        }));
        return;
      }
      // Stroke resize: scale all points proportionally
      if (ix.type === "resize-stroke") {
        const dx = pt.x - ix.anchor.x, dy = pt.y - ix.anchor.y;
        const ob = ix.originBounds;
        const newW = Math.max(ob.w + dx, 5);
        const newH = Math.max(ob.h + dy, 5);
        const sx = newW / (ob.w || 1), sy = newH / (ob.h || 1);
        setStrokes(p => p.map(s => {
          if (s.id !== ix.strokeId) return s;
          return { ...s, points: ix.originPoints.map(op => ({
            x: ob.x + (op.x - ob.x) * sx,
            y: ob.y + (op.y - ob.y) * sy,
          })) };
        }));
        return;
      }
      // Rotate element
      if (ix.type === "rotate") {
        const pt2 = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
        const angle = Math.atan2(pt2.y - ix.center.y, pt2.x - ix.center.x) * (180 / Math.PI);
        const delta = angle - ix.startAngle;
        let newRot = ix.startRotation + delta;
        // Normalize to 0-360
        newRot = ((newRot % 360) + 360) % 360;
        setElements(p => p.map(el => el.id === ix.elementId ? { ...el, rotation: Math.round(newRot * 10) / 10 } : el));
        return;
      }
      // Rotate stroke
      if (ix.type === "rotate-stroke") {
        const pt2 = scenePoint(e.clientX, e.clientY, boardRef.current, vpRef.current);
        const angle = Math.atan2(pt2.y - ix.center.y, pt2.x - ix.center.x) * (180 / Math.PI);
        const delta = angle - ix.startAngle;
        let newRot = ix.startRotation + delta;
        newRot = ((newRot % 360) + 360) % 360;
        const radDelta = (delta * Math.PI) / 180;
        setStrokes(p => p.map(s => {
          if (s.id !== ix.strokeId) return s;
          const cos = Math.cos(radDelta), sin = Math.sin(radDelta);
          return {
            ...s,
            rotation: Math.round(newRot * 10) / 10,
            points: s.points.map(op => ({
              x: ix.center.x + (op.x - ix.center.x) * cos - (op.y - ix.center.y) * sin,
              y: ix.center.y + (op.x - ix.center.x) * sin + (op.y - ix.center.y) * cos,
            })),
          };
        }));
        // Update center for continuous rotation
        ix.startAngle = angle;
        ix.startRotation = newRot;
        return;
      }
    };

    const onUp = () => {
      const ix = interactionRef.current;
      if (!ix) return;
      if (ix.type === "draw" && ix.points.length > 1) {
        pushUndo();
        setStrokes(p => [...p, { id: crypto.randomUUID(), tool: ix.tool, color: ix.color, size: ix.size, points: ix.points }]);
      }
      if (ix.type === "marquee") setMarqueeRect(null);
      interactionRef.current = null;
      setDraftStroke(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [pushUndo, snap]);

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " && !e.repeat) { spaceHeldRef.current = true; return; }
      const tgt = e.target as HTMLElement;
      if (tgt && ["INPUT", "TEXTAREA", "SELECT"].includes(tgt.tagName)) return;
      if (tgt?.isContentEditable) return;
      const ctrl = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const k = e.key.toLowerCase();
      if (ctrl && k === "z" && !shift) { e.preventDefault(); undo(); return; }
      if (ctrl && k === "z" && shift) { e.preventDefault(); redo(); return; }
      if (ctrl && k === "y") { e.preventDefault(); redo(); return; }
      if (ctrl && k === "s") { e.preventDefault(); save(); toast.success("Saved"); return; }
      if (ctrl && k === "d") { e.preventDefault(); duplicateSel(); return; }
      if (ctrl && k === "g") { e.preventDefault(); groupSelected(); return; }
      if (ctrl && k === "a") { e.preventDefault(); selectAll(); return; }
      if (ctrl && k === "0") { e.preventDefault(); setViewport(DEFAULT_VIEWPORT); return; }
      if (ctrl && k === "1") { e.preventDefault(); fitToView(); return; }
      if (ctrl && k === "e") { e.preventDefault(); setShowExportDialog(true); return; }
      if (e.key === "Escape") { setSelectedIds(new Set()); setSelectedStrokeIds(new Set()); setLinkSourceId(null); return; }
      if (e.key === "Delete" || (e.key === "Backspace" && !tgt?.isContentEditable)) { e.preventDefault(); deleteSel(); return; }
      if (ctrl && shift && k === "f") { e.preventDefault(); flipSelected("h"); return; }
      if (ctrl && shift && k === "b") { e.preventDefault(); sendToBack(); return; }
      if (ctrl && shift && k === "c") { e.preventDefault(); centerOnCanvas(); return; }
      if (ctrl && shift && k === "m") { e.preventDefault(); matchSize(); return; }
      if (ctrl && shift && k === "r") { e.preventDefault(); resetRotation(); return; }
      if (k === "[" && !ctrl) { e.preventDefault(); sendToBack(); return; }
      if (k === "]" && !ctrl) { e.preventDefault(); bringForward(); return; }
      const step = shift ? 10 : 1;
      if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-step, 0); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); nudge(step, 0); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); nudge(0, -step); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); nudge(0, step); return; }
      // R key for snap rotation (only when not in a tool that uses R)
      if (k === "r" && !ctrl && tool === "select" && (selRef.current.size || selStrokesRef.current.size)) { e.preventDefault(); rotateSnap(); return; }
      if (k === "v" && !ctrl) setTool("select");
      if (k === "h" && !ctrl) setTool("pan");
      if (k === "p" && !ctrl) setTool("pen");
      if (k === "e" && !ctrl) setTool("eraser");
      if (k === "n" && !ctrl) setTool("note");
      if (k === "t" && !ctrl) setTool("text");
      if (k === "f" && !ctrl) setTool("frame");
      if (k === "m" && !ctrl) setTool("media");
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [undo, redo, save, deleteSel, duplicateSel, groupSelected, selectAll, fitToView, nudge, rotateSnap, tool, flipSelected, sendToBack, centerOnCanvas, matchSize, resetRotation, bringForward]);

  const activeSizes = tool === "eraser" ? ERASER_SIZES : BRUSH_SIZES;

  /* ─── Text formatting helper ─── */
  const applyTextProp = useCallback((prop: string, value: any) => {
    if (primaryEl?.kind === "text") { pushUndo(); updateEl(primaryEl.id, { [prop]: value }); }
  }, [primaryEl, pushUndo, updateEl]);

  /* ─── Render ─── */
  return (
    <div ref={wrapperRef} data-sandbox-wrapper className="flex flex-col gap-1 w-full overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
      {/* Hidden file inputs */}
      <input ref={mediaInputRef} type="file" accept="image/*,video/*,audio/*,.gif" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) { handleMediaImport(e.target.files); e.target.value = ""; } }} />
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) { handleBgImport(e.target.files[0]); e.target.value = ""; } }} />
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

        {/* Sizes for pen/eraser */}
        {(tool === "pen" || tool === "eraser") && (
          <div className="flex items-center gap-0.5 overflow-x-auto max-w-[260px]">
            {activeSizes.map(s => (
              <button key={s} type="button" onClick={() => setBrushSize(s)}
                className={cn("rounded-full shrink-0 transition-transform", brushSize === s ? "ring-1 ring-white/50" : "")}
                style={{ width: clamp(s * 1.1, 6, 32), height: clamp(s * 1.1, 6, 32), backgroundColor: brushSize === s ? activeColor : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        )}

        {/* Stamp selector */}
        {tool === "stamp" && (
          <div className="flex items-center gap-0.5 overflow-x-auto max-w-[280px]">
            {EMOJI_STAMPS.map(em => (
              <button key={em} type="button" onClick={() => setActiveStamp(em)}
                className={cn("text-lg rounded-md px-0.5 transition-transform", activeStamp === em ? "bg-blue-500/20 scale-110" : "hover:scale-110")}>
                {em}
              </button>
            ))}
          </div>
        )}

        {/* Text formatting — shown when text tool active OR text element selected */}
        {hasTextSelection && (
          <div className="flex items-center gap-1 flex-wrap">
            <select value={primaryEl?.fontFamily || fontFamily} onChange={e => { setFontFamily(e.target.value); applyTextProp("fontFamily", e.target.value); }}
              className="h-6 max-w-[110px] rounded-md border border-white/10 bg-white/5 text-[10px] text-white/80 outline-none px-1">
              {FONT_FAMILIES.map(f => <option key={f} value={f} className="bg-[hsl(222,30%,12%)] text-white">{f.split(",")[0]}</option>)}
            </select>
            <select value={primaryEl?.fontSize || fontSize} onChange={e => { const v = Number(e.target.value); setFontSize(v); applyTextProp("fontSize", v); }}
              className="h-6 w-14 rounded-md border border-white/10 bg-white/5 text-[10px] text-white/80 outline-none px-1">
              {FONT_SIZES.map(s => <option key={s} value={s} className="bg-[hsl(222,30%,12%)] text-white">{s}px</option>)}
            </select>
            <div className="h-4 w-px bg-white/8" />
            <button type="button" onClick={() => applyTextProp("fontWeight", primaryEl?.fontWeight === "bold" ? "normal" : "bold")}
              className={cn("rounded-md px-1.5 py-0.5", primaryEl?.fontWeight === "bold" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <Bold className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => applyTextProp("fontStyle", primaryEl?.fontStyle === "italic" ? "normal" : "italic")}
              className={cn("rounded-md px-1.5 py-0.5", primaryEl?.fontStyle === "italic" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <Italic className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => applyTextProp("textDecoration", primaryEl?.textDecoration === "underline" ? "none" : "underline")}
              className={cn("rounded-md px-1.5 py-0.5", primaryEl?.textDecoration === "underline" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <Underline className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => applyTextProp("textDecoration", primaryEl?.textDecoration === "line-through" ? "none" : "line-through")}
              className={cn("rounded-md px-1.5 py-0.5", primaryEl?.textDecoration === "line-through" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <Strikethrough className="h-3 w-3" />
            </button>
            <div className="h-4 w-px bg-white/8" />
            {/* Text align */}
            <button type="button" onClick={() => applyTextProp("textAlign", "left")}
              className={cn("rounded-md px-1 py-0.5", (primaryEl?.textAlign || "left") === "left" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <AlignLeft className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => applyTextProp("textAlign", "center")}
              className={cn("rounded-md px-1 py-0.5", primaryEl?.textAlign === "center" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <AlignCenter className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => applyTextProp("textAlign", "right")}
              className={cn("rounded-md px-1 py-0.5", primaryEl?.textAlign === "right" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70")}>
              <AlignRight className="h-3 w-3" />
            </button>
            <div className="h-4 w-px bg-white/8" />
            {/* Text transform */}
            <select value={primaryEl?.textTransform || "none"} onChange={e => applyTextProp("textTransform", e.target.value)}
              className="h-6 rounded-md border border-white/10 bg-white/5 text-[9px] text-white/70 outline-none px-1">
              <option value="none" className="bg-[hsl(222,30%,12%)]">Aa</option>
              <option value="uppercase" className="bg-[hsl(222,30%,12%)]">AA</option>
              <option value="lowercase" className="bg-[hsl(222,30%,12%)]">aa</option>
              <option value="capitalize" className="bg-[hsl(222,30%,12%)]">Ab</option>
            </select>
            {/* Letter spacing */}
            <div className="flex items-center gap-0.5">
              <span className="text-[8px] text-white/30">LS</span>
              <select value={primaryEl?.letterSpacing ?? 0} onChange={e => applyTextProp("letterSpacing", Number(e.target.value))}
                className="h-6 w-12 rounded-md border border-white/10 bg-white/5 text-[9px] text-white/70 outline-none px-0.5">
                {LETTER_SPACINGS.map(v => <option key={v} value={v} className="bg-[hsl(222,30%,12%)]">{v}px</option>)}
              </select>
            </div>
            {/* Line height */}
            <div className="flex items-center gap-0.5">
              <span className="text-[8px] text-white/30">LH</span>
              <select value={primaryEl?.lineHeight ?? 1.3} onChange={e => applyTextProp("lineHeight", Number(e.target.value))}
                className="h-6 w-12 rounded-md border border-white/10 bg-white/5 text-[9px] text-white/70 outline-none px-0.5">
                {LINE_HEIGHTS.map(v => <option key={v} value={v} className="bg-[hsl(222,30%,12%)]">{v}</option>)}
              </select>
            </div>
            {/* Opacity */}
            <div className="flex items-center gap-0.5">
              <Eye className="h-3 w-3 text-white/30" />
              <input type="range" min={0} max={1} step={0.05} value={primaryEl?.opacity ?? 1}
                onChange={e => applyTextProp("opacity", Number(e.target.value))}
                className="h-1 w-14 accent-blue-500 cursor-pointer" />
              <span className="text-[8px] text-white/40 w-6">{Math.round((primaryEl?.opacity ?? 1) * 100)}%</span>
            </div>
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
        <button type="button" onClick={duplicateSel} disabled={!selectedIds.size && !selectedStrokeIds.size} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">Duplicate</button>
        <button type="button" onClick={() => { if (selectedIds.size !== 1) { toast.info("Select one card"); return; } setLinkSourceId(p => p ? null : Array.from(selectedIds)[0]); }} disabled={!selectedIds.size} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">{linkSourceId ? "Cancel link" : "Link"}</button>
        <button type="button" onClick={() => { const ids = Array.from(selRef.current); if (!ids.length) return; pushUndo(); setElements(p => p.map(e => ({ ...e, links: ids.includes(e.id) ? [] : e.links.filter(l => !ids.includes(l)) }))); }} disabled={!selectedIds.size} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">Unlink</button>
        <button type="button" onClick={groupSelected} disabled={selectedIds.size < 2} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">Group</button>
        <button type="button" onClick={ungroupSelected} disabled={!selectedIds.size} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">Ungroup</button>

        {/* Mesh attach/detach */}
        <button type="button" onClick={meshAttach} disabled={selectedIds.size < 2} className="rounded-md border border-amber-500/15 bg-amber-500/5 px-2.5 py-1 text-[10px] text-amber-400/70 hover:bg-amber-500/10 disabled:opacity-30" title="Attach elements into a rigid mesh">
          <Paperclip className="inline h-3 w-3 mr-0.5" />Mesh
        </button>
        <button type="button" onClick={meshDetach} disabled={!selectedIds.size} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">Detach</button>

        <button type="button" onClick={clearInk} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8">Clear ink</button>

        <div className="h-4 w-px bg-white/8" />

        {/* Convenience features */}
        <button type="button" onClick={bringForward} disabled={!selectedIds.size} title="Bring Forward ( ] )" className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">↑ Front</button>
        <button type="button" onClick={sendToBack} disabled={!selectedIds.size} title="Send to Back ( [ )" className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">↓ Back</button>
        <button type="button" onClick={() => flipSelected("h")} disabled={!selectedIds.size} title="Flip Horizontal (Ctrl+Shift+F)" className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">⇔ Flip H</button>
        <button type="button" onClick={() => flipSelected("v")} disabled={!selectedIds.size} title="Flip Vertical" className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">⇕ Flip V</button>
        <button type="button" onClick={centerOnCanvas} disabled={!selectedIds.size} title="Center on Canvas (Ctrl+Shift+C)" className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">⊙ Center</button>
        <button type="button" onClick={resetRotation} disabled={!selectedIds.size && !selectedStrokeIds.size} title="Reset Rotation (Ctrl+Shift+R)" className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">↺ 0°</button>
        <button type="button" onClick={matchSize} disabled={selectedIds.size < 2} title="Match Size (Ctrl+Shift+M)" className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/60 hover:bg-white/8 disabled:opacity-30">⊞ Match</button>
        {selectedIds.size >= 3 && (
          <>
            <button type="button" onClick={() => distributeSelected("h")} title="Distribute Horizontally" className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/60 hover:bg-white/8">⋯ Dist H</button>
            <button type="button" onClick={() => distributeSelected("v")} title="Distribute Vertically" className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/60 hover:bg-white/8">⋮ Dist V</button>
          </>
        )}

        <div className="h-4 w-px bg-white/8" />

        <button type="button" onClick={selectAll} title="Ctrl+A" className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8">Select All</button>
        <button type="button" onClick={fitToView} title="Ctrl+1" className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8"><Maximize className="inline h-3 w-3 mr-0.5" />Fit</button>
        <button type="button" onClick={resetView} title="Ctrl+0" className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8">Reset View</button>
        <button type="button" onClick={() => setSnapToGrid(p => !p)} className={cn("rounded-md border px-2.5 py-1 text-[10px] flex items-center gap-1", snapToGrid ? "border-blue-500/25 bg-blue-500/10 text-blue-400" : "border-white/8 bg-white/4 text-white/60 hover:bg-white/8")}>
          <Grid3X3 className="h-3 w-3" />Snap
        </button>
        <button type="button" onClick={() => setShowMinimap(p => !p)} className={cn("rounded-md border px-2.5 py-1 text-[10px] flex items-center gap-1", showMinimap ? "border-blue-500/25 bg-blue-500/10 text-blue-400" : "border-white/8 bg-white/4 text-white/60 hover:bg-white/8")}>
          <MapIcon className="h-3 w-3" />Map
        </button>
        {/* Media import button */}
        <button type="button" onClick={() => mediaInputRef.current?.click()} className="rounded-md border border-purple-500/15 bg-purple-500/5 px-2.5 py-1 text-[10px] text-purple-400/70 hover:bg-purple-500/10" title="Import media files (images, videos, audio, GIFs)">
          <Upload className="inline h-3 w-3 mr-0.5" />Media
        </button>
        {/* Background */}
        <button type="button" onClick={() => bgInputRef.current?.click()} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8" title="Set custom background">
          <Palette className="inline h-3 w-3 mr-0.5" />BG
        </button>
        {canvasBgImage && (
          <button type="button" onClick={() => setCanvasBgImage(null)} className="rounded-md border border-red-500/15 bg-red-500/5 px-2 py-1 text-[10px] text-red-400/70 hover:bg-red-500/10">✕ BG</button>
        )}

        {/* Align tools */}
        {selectedIds.size >= 2 && (
          <>
            <div className="h-4 w-px bg-white/8" />
            <span className="text-[9px] text-white/30">Align:</span>
            <button type="button" onClick={() => alignSelected("left")} title="Align Left" className="rounded-md border border-white/8 bg-white/4 p-1 text-white/50 hover:bg-white/8"><AlignStartHorizontal className="h-3 w-3" /></button>
            <button type="button" onClick={() => alignSelected("center-h")} title="Align Center H" className="rounded-md border border-white/8 bg-white/4 p-1 text-white/50 hover:bg-white/8"><AlignCenterHorizontal className="h-3 w-3" /></button>
            <button type="button" onClick={() => alignSelected("right")} title="Align Right" className="rounded-md border border-white/8 bg-white/4 p-1 text-white/50 hover:bg-white/8"><AlignEndHorizontal className="h-3 w-3" /></button>
            <button type="button" onClick={() => alignSelected("top")} title="Align Top" className="rounded-md border border-white/8 bg-white/4 p-1 text-white/50 hover:bg-white/8"><AlignStartVertical className="h-3 w-3" /></button>
            <button type="button" onClick={() => alignSelected("center-v")} title="Align Center V" className="rounded-md border border-white/8 bg-white/4 p-1 text-white/50 hover:bg-white/8"><AlignCenterVertical className="h-3 w-3" /></button>
            <button type="button" onClick={() => alignSelected("bottom")} title="Align Bottom" className="rounded-md border border-white/8 bg-white/4 p-1 text-white/50 hover:bg-white/8"><AlignEndVertical className="h-3 w-3" /></button>
          </>
        )}

        <div className="h-4 w-px bg-white/8" />

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




        {/* Advanced Export */}
        <button type="button" onClick={() => setShowExportDialog(true)} className="rounded-md border border-purple-500/15 bg-purple-500/5 px-2.5 py-1 text-[10px] text-purple-400/70 hover:bg-purple-500/10" title="Ctrl+E">
          <Download className="inline h-3 w-3 mr-0.5" />Export Board
        </button>

        {/* Push to Platform */}
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

        <button type="button" onClick={deleteSel} disabled={!selectedIds.size && !selectedStrokeIds.size} className="rounded-md border border-red-500/15 bg-red-500/5 px-2.5 py-1 text-[10px] text-red-400/70 hover:bg-red-500/10 disabled:opacity-30">Delete</button>
        <button type="button" onClick={clearBoard} className="rounded-md border border-red-500/15 bg-red-500/5 px-2.5 py-1 text-[10px] text-red-400/70 hover:bg-red-500/10">Clear board</button>
        <button type="button" onClick={() => setShowInspector(p => !p)} className="rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/8">{showInspector ? "Hide panel" : "Inspector"}</button>
        <button type="button" onClick={() => setShowHelp(true)} className="rounded-md border border-white/8 bg-white/4 p-1 text-white/50 hover:bg-white/8 hover:text-white/80" title="Help & Shortcuts">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
        {selectedIds.size >= 2 && (
          <button type="button" onClick={evolve} disabled={evolving} className="ml-auto rounded-md bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50">
            {evolving ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}Evolve {selectedIds.size}
          </button>
        )}
      </div>


      {/* Board + Inspector */}
      <div className={cn("flex gap-2 flex-1 min-h-0", showInspector ? "flex-col lg:flex-row" : "")}>
        <div
          ref={boardRef}
          data-sandbox-board
          onPointerDown={handleBoardDown}
          className="relative flex-1 overflow-hidden rounded-xl border border-white/6 bg-[hsl(222,32%,8%)] touch-none min-h-0"
          style={{
            cursor: tool === "pan" ? "grab" : tool === "pen" ? "crosshair" : tool === "eraser" ? "cell" : tool === "text" ? "text" : tool === "stamp" ? "copy" : tool === "media" ? "cell" : "default",
            backgroundImage: canvasBgImage
              ? `url(${canvasBgImage})`
              : "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
            backgroundSize: canvasBgImage ? "cover" : `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
            backgroundPosition: canvasBgImage ? "center" : `${viewport.x}px ${viewport.y}px`,
            backgroundRepeat: canvasBgImage ? "no-repeat" : undefined,
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
                onDown={handleElDown} onResize={handleResizeDown} onTextChange={(id, v) => updateEl(id, { text: v })} onRotate={handleRotateDown} />
            ))}
          </div>
          {!elements.length && !strokes.length && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-xs rounded-xl border border-white/6 bg-white/3 p-5 text-center backdrop-blur-sm">
                <h3 className="text-base font-medium text-white/80">Sandbox</h3>
                <p className="mt-1.5 text-[12px] text-white/35">Import content, draw, link ideas, evolve with AI</p>
                <p className="mt-1 text-[10px] text-white/20">Ctrl+A select all · Ctrl+1 fit · Space+drag pan · Ctrl+E export</p>
              </div>
            </div>
          )}
          {/* Minimap */}
          {showMinimap && (elements.length > 0 || strokes.length > 0) && (() => {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const el of elements) { minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.width); maxY = Math.max(maxY, el.y + el.height); }
            for (const s of strokes) { const b = strokeBounds(s); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
            const pad = 40; minX -= pad; minY -= pad; maxX += pad; maxY += pad;
            const cw = maxX - minX || 1, ch = maxY - minY || 1;
            const mmW = 160, mmH = 120;
            const sc = Math.min(mmW / cw, mmH / ch);
            const board = boardRef.current;
            const bw = board ? board.clientWidth : 800, bh = board ? board.clientHeight : 600;
            const vpLeft = (-viewport.x / viewport.zoom - minX) * sc, vpTop = (-viewport.y / viewport.zoom - minY) * sc;
            const vpW = (bw / viewport.zoom) * sc, vpH = (bh / viewport.zoom) * sc;
            return (
              <div className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-[hsl(222,30%,8%)]/90 backdrop-blur-sm overflow-hidden pointer-events-auto" style={{ width: mmW, height: mmH }}
                onClick={(ev) => {
                  const r = ev.currentTarget.getBoundingClientRect();
                  const mx = (ev.clientX - r.left) / sc + minX, my = (ev.clientY - r.top) / sc + minY;
                  setViewport(v => ({ ...v, x: -mx * v.zoom + bw / 2, y: -my * v.zoom + bh / 2 }));
                }}>
                {elements.map(el => (
                  <div key={el.id} className={cn("absolute rounded-sm", selectedIds.has(el.id) ? "bg-blue-400/60" : el.kind === "content" ? "bg-white/20" : "bg-white/10")}
                    style={{ left: (el.x - minX) * sc, top: (el.y - minY) * sc, width: Math.max(el.width * sc, 2), height: Math.max(el.height * sc, 2) }} />
                ))}
                {strokes.map(s => {
                  const b = strokeBounds(s);
                  return <div key={s.id} className={cn("absolute rounded-sm", selectedStrokeIds.has(s.id) ? "bg-blue-400/40" : "bg-white/8")}
                    style={{ left: (b.x - minX) * sc, top: (b.y - minY) * sc, width: Math.max(b.w * sc, 1), height: Math.max(b.h * sc, 1) }} />;
                })}
                <div className="absolute border border-blue-400/50 rounded-sm" style={{ left: clamp(vpLeft, 0, mmW), top: clamp(vpTop, 0, mmH), width: clamp(vpW, 4, mmW), height: clamp(vpH, 4, mmH) }} />
              </div>
            );
          })()}
          {/* Status bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-1 bg-[hsl(222,30%,6%)]/80 backdrop-blur-sm border-t border-white/5 text-[9px] text-white/35 pointer-events-none z-[999]">
            <div className="flex items-center gap-3">
              <span>{elements.length} elements · {strokes.length} strokes</span>
              {selectedIds.size > 0 && <span className="text-blue-400/70">{selectedIds.size} selected</span>}
              {selectedStrokeIds.size > 0 && <span className="text-blue-400/70">{selectedStrokeIds.size} strokes selected</span>}
              {primaryEl && <span className="text-white/25">x:{Math.round(primaryEl.x)} y:{Math.round(primaryEl.y)} w:{Math.round(primaryEl.width)} h:{Math.round(primaryEl.height)}{primaryEl.rotation ? ` ${Math.round(primaryEl.rotation)}°` : ""}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span>cursor: {Math.round(mouseScene.x)}, {Math.round(mouseScene.y)}</span>
              <span>{Math.round(viewport.zoom * 100)}%</span>
              <span>{snapToGrid ? "⊞ Snap ON" : ""}</span>
            </div>
          </div>
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
                  {/* Opacity slider in inspector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/35">Opacity</span>
                    <input type="range" min={0} max={1} step={0.05} value={primaryEl.opacity ?? 1}
                      onChange={e => updateEl(primaryEl.id, { opacity: Number(e.target.value) })}
                      className="flex-1 h-1 accent-blue-500" />
                    <span className="text-[9px] text-white/40 w-7">{Math.round((primaryEl.opacity ?? 1) * 100)}%</span>
                  </div>
                  {/* Rotation */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/35">Rotation</span>
                    <input type="range" min={0} max={360} step={1} value={primaryEl.rotation || 0}
                      onChange={e => { pushUndo(); updateEl(primaryEl.id, { rotation: Number(e.target.value) }); }}
                      className="flex-1 h-1 accent-blue-500" />
                    <span className="text-[9px] text-white/40 w-8">{Math.round(primaryEl.rotation || 0)}°</span>
                    <button type="button" onClick={() => { pushUndo(); updateEl(primaryEl.id, { rotation: 0 }); }} className="text-[8px] text-white/30 hover:text-white/60">Reset</button>
                  </div>
                  {/* Color */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/35">Color</span>
                    <ColorPicker color={primaryEl.color} onChange={c => { pushUndo(); updateEl(primaryEl.id, { color: c }); }} />
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
                  {primaryEl.kind === "stamp" && (
                    <div className="flex flex-wrap gap-1">
                      {EMOJI_STAMPS.map(em => (
                        <button key={em} type="button" onClick={() => updateEl(primaryEl.id, { emoji: em })}
                          className={cn("text-lg rounded-md px-0.5", primaryEl.emoji === em ? "bg-blue-500/20" : "")}>
                          {em}
                        </button>
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

      {/* Import Dialog */}
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

      {/* Export Board Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md border-white/8 bg-[hsl(222,30%,10%)] text-white">
          <DialogHeader><DialogTitle className="text-white/90 flex items-center gap-2"><Download className="h-4 w-4 text-purple-400" />Export Board</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Format */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Format</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { id: "png" as const, label: "PNG", desc: "High-res image", icon: FileImage },
                  { id: "svg" as const, label: "SVG", desc: "Vector, no pixel loss", icon: FileImage },
                  { id: "json" as const, label: "JSON", desc: "Full data backup", icon: FileJson },
                  { id: "csv" as const, label: "CSV", desc: "Excel / Sheets", icon: FileSpreadsheet },
                ]).map(f => (
                  <button key={f.id} type="button" onClick={() => setExportFormat(f.id)}
                    className={cn("p-2.5 rounded-lg border text-center transition-all",
                      exportFormat === f.id ? "border-purple-500/30 bg-purple-500/10" : "border-white/6 hover:border-white/12")}>
                    <f.icon className={cn("h-5 w-5 mx-auto mb-1", exportFormat === f.id ? "text-purple-400" : "text-white/40")} />
                    <p className={cn("text-[11px] font-semibold", exportFormat === f.id ? "text-purple-400" : "text-white/50")}>{f.label}</p>
                    <p className="text-[8px] text-white/25 mt-0.5">{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Scope */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Scope</label>
              <div className="flex gap-2">
                <button onClick={() => setExportScope("all")} className={cn("rounded-md px-3 py-1.5 text-[10px] border flex-1", exportScope === "all" ? "border-purple-500/30 bg-purple-500/10 text-purple-400" : "border-white/8 text-white/40")}>
                  Entire Board
                </button>
                <button onClick={() => setExportScope("selected")} disabled={!selectedIds.size && !selectedStrokeIds.size}
                  className={cn("rounded-md px-3 py-1.5 text-[10px] border flex-1 disabled:opacity-30", exportScope === "selected" ? "border-purple-500/30 bg-purple-500/10 text-purple-400" : "border-white/8 text-white/40")}>
                  Selected Only ({selectedIds.size + selectedStrokeIds.size})
                </button>
              </div>
            </div>

            {/* PNG settings */}
            {exportFormat === "png" && (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Resolution Scale</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(s => (
                      <button key={s} onClick={() => setExportScale(s)}
                        className={cn("rounded-md px-3 py-1.5 text-[10px] border flex-1", exportScale === s ? "border-purple-500/30 bg-purple-500/10 text-purple-400" : "border-white/8 text-white/40")}>
                        {s}x {s === 1 ? "(1:1)" : s === 2 ? "(Retina)" : s === 3 ? "(HiDPI)" : "(Ultra)"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Background</label>
                  <div className="flex items-center gap-2">
                    {["#1a1f2e", "#ffffff", "#000000", "transparent"].map(bg => (
                      <button key={bg} onClick={() => setExportBg(bg)}
                        className={cn("h-7 w-7 rounded-lg border-2 transition-transform", exportBg === bg ? "border-purple-400 scale-110" : "border-white/10")}
                        style={{ backgroundColor: bg === "transparent" ? "transparent" : bg, backgroundImage: bg === "transparent" ? "linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)" : undefined, backgroundSize: bg === "transparent" ? "8px 8px" : undefined }} />
                    ))}
                    <ColorPicker color={exportBg === "transparent" ? "#1a1f2e" : exportBg} onChange={setExportBg} />
                  </div>
                </div>
              </div>
            )}

            {/* Export button */}
            <button type="button" onClick={() => {
              const scopeEls = exportScope === "selected" ? elements.filter(e => selectedIds.has(e.id)) : elements;
              const scopeStrokes = exportScope === "selected" ? strokes.filter(s => selectedStrokeIds.has(s.id)) : strokes;
              switch (exportFormat) {
                case "png": exportToPNG(canvasRef.current, scopeEls, scopeStrokes, viewport, boardRef.current, exportBg, exportScale); break;
                case "svg": exportToSVG(scopeEls, scopeStrokes); break;
                case "json": exportToJSON(scopeEls, scopeStrokes); break;
                case "csv": exportToCSV(scopeEls); break;
              }
              setShowExportDialog(false);
            }} className="w-full rounded-md bg-purple-500/15 border border-purple-500/20 py-2.5 text-[12px] font-medium text-purple-400 hover:bg-purple-500/25">
              <Download className="inline h-4 w-4 mr-1.5" />
              Export as {exportFormat.toUpperCase()}
            </button>
            <p className="text-[9px] text-white/20 text-center">PNG & SVG = full visual quality · JSON = complete backup · CSV = Excel/Sheets/LibreOffice compatible</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-[75vw] max-h-[75vh] overflow-y-auto bg-[hsl(222,35%,7%)] border-white/[0.06] text-white p-0 backdrop-blur-xl [&>button]:text-white/50 [&>button]:hover:text-white">
          <div className="sticky top-0 z-10 bg-[hsl(222,35%,7%)]/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-2.5 ring-1 ring-purple-500/20"><HelpCircle className="h-5 w-5 text-purple-400" /></div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Sandbox Help & Shortcuts</h2>
                <p className="text-[10px] sm:text-xs text-white/35">Everything you need to master the creative canvas</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">

            {/* Keyboard Shortcuts */}
            <div className="rounded-xl bg-white/[0.03] p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-blue-400 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-blue-500/10 p-1"><Hash className="h-3.5 w-3.5 text-blue-400" /></span>
                Keyboard Shortcuts
              </h3>
              <div className="space-y-1 text-[10px] sm:text-[11px]">
                {[
                  ["Ctrl+Z", "Undo"], ["Ctrl+Shift+Z", "Redo"], ["Ctrl+S", "Save"],
                  ["Ctrl+A", "Select all"], ["Ctrl+E", "Export dialog"], ["Ctrl+1", "Fit to view"],
                  ["Del / Bksp", "Delete selected"], ["Esc", "Deselect / cancel"],
                  ["Arrows", "Nudge 1px"], ["Shift+Arrows", "Nudge 10px"],
                  ["R", "Rotate 45° snap"], ["M", "Media tool"], ["Space", "Pan mode"],
                ].map(([k, d]) => (
                  <div key={k} className="flex items-center justify-between gap-1.5">
                    <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] sm:text-[10px] text-white/60 font-mono shrink-0">{k}</kbd>
                    <span className="text-white/40 text-right">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Drawing Tools */}
            <div className="rounded-xl bg-white/[0.03] p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-emerald-400 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-emerald-500/10 p-1"><Pencil className="h-3.5 w-3.5 text-emerald-400" /></span>
                Drawing Tools
              </h3>
              <div className="space-y-1.5 text-[10px] sm:text-[11px] text-white/45">
                <p><span className="text-white/75 font-medium">Cursor (V)</span> — Select, move, resize, rotate</p>
                <p><span className="text-white/75 font-medium">Move</span> — Pan canvas freely</p>
                <p><span className="text-white/75 font-medium">Pen (P)</span> — Freehand draw with brush sizes</p>
                <p><span className="text-white/75 font-medium">Eraser (E)</span> — Erase strokes</p>
                <p><span className="text-white/75 font-medium">Text (T)</span> — Place text with typography controls</p>
                <p><span className="text-white/75 font-medium">Sticky Note</span> — Drop colored note cards</p>
                <p><span className="text-white/75 font-medium">Shapes</span> — Rect, Ellipse, Triangle, Diamond, Arrow</p>
                <p><span className="text-white/75 font-medium">Connector</span> — Lines between points</p>
                <p><span className="text-white/75 font-medium">Frame</span> — Container frames</p>
                <p><span className="text-white/75 font-medium">Stamp</span> — Emoji stamps</p>
                <p><span className="text-white/75 font-medium">Media</span> — Images, videos, audio, GIFs</p>
              </div>
            </div>

            {/* Selection & Transform */}
            <div className="rounded-xl bg-white/[0.03] p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-amber-400 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-amber-500/10 p-1"><MousePointer className="h-3.5 w-3.5 text-amber-400" /></span>
                Selection & Transform
              </h3>
              <div className="space-y-1.5 text-[10px] sm:text-[11px] text-white/45">
                <p><span className="text-white/75 font-medium">Click</span> — Select element or stroke</p>
                <p><span className="text-white/75 font-medium">Marquee drag</span> — Multi-select rectangle</p>
                <p><span className="text-white/75 font-medium">Resize handles</span> — Scale proportionally</p>
                <p><span className="text-white/75 font-medium">Rotation handle</span> — Smooth 360° rotation</p>
                <p><span className="text-white/75 font-medium">R key</span> — 8-direction snap (45° steps)</p>
                <p><span className="text-white/75 font-medium">Alt+Drag</span> — Duplicate on the fly</p>
                <p><span className="text-white/75 font-medium">Group / Ungroup</span> — Move as one unit</p>
                <p><span className="text-white/75 font-medium">Mesh</span> — Rigid attach (amber indicator)</p>
                <p><span className="text-white/75 font-medium">Link / Unlink</span> — Visual card connections</p>
              </div>
            </div>

            {/* Text Editing */}
            <div className="rounded-xl bg-white/[0.03] p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-pink-400 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-pink-500/10 p-1"><Type className="h-3.5 w-3.5 text-pink-400" /></span>
                Text Editing
              </h3>
              <div className="space-y-1.5 text-[10px] sm:text-[11px] text-white/45">
                <p><span className="text-white/75 font-medium">Font Family</span> — 9 families (Inter, Playfair, JetBrains...)</p>
                <p><span className="text-white/75 font-medium">Font Size</span> — 15 presets (10px–72px)</p>
                <p><span className="text-white/75 font-medium">B / I / U / S</span> — Bold, italic, underline, strikethrough</p>
                <p><span className="text-white/75 font-medium">Align</span> — Left, center, right</p>
                <p><span className="text-white/75 font-medium">Transform</span> — Aa, AA, aa, Ab modes</p>
                <p><span className="text-white/75 font-medium">Letter Spacing</span> — -2px to 10px</p>
                <p><span className="text-white/75 font-medium">Line Height</span> — 0.8 to 3.0</p>
                <p><span className="text-white/75 font-medium">Opacity</span> — 0% to 100%</p>
              </div>
            </div>

            {/* Canvas & Navigation */}
            <div className="rounded-xl bg-white/[0.03] p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-cyan-400 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-cyan-500/10 p-1"><MapIcon className="h-3.5 w-3.5 text-cyan-400" /></span>
                Canvas & Navigation
              </h3>
              <div className="space-y-1.5 text-[10px] sm:text-[11px] text-white/45">
                <p><span className="text-white/75 font-medium">Zoom</span> — Mouse wheel, configurable speed</p>
                <p><span className="text-white/75 font-medium">Pan</span> — Space+drag, Pan tool, middle-click</p>
                <p><span className="text-white/75 font-medium">Snap to Grid</span> — 20px precision snapping</p>
                <p><span className="text-white/75 font-medium">Minimap</span> — Interactive overview navigation</p>
                <p><span className="text-white/75 font-medium">Fit to View</span> — Auto-zoom all content (Ctrl+1)</p>
                <p><span className="text-white/75 font-medium">Scroll Lock</span> — Lock/unlock page scrolling</p>
                <p><span className="text-white/75 font-medium">Custom BG</span> — Upload background image</p>
                <p><span className="text-white/75 font-medium">Color Picker</span> — HSV picker with HEX input</p>
              </div>
            </div>

            {/* Export & Sharing */}
            <div className="rounded-xl bg-white/[0.03] p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-purple-400 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-purple-500/10 p-1"><Download className="h-3.5 w-3.5 text-purple-400" /></span>
                Export & Sharing
              </h3>
              <div className="space-y-1.5 text-[10px] sm:text-[11px] text-white/45">
                <p><span className="text-white/75 font-medium">Export Board</span> — Format, resolution, scope, background</p>
                <p><span className="text-white/75 font-medium">PNG</span> — 1x–4x resolution (Retina/Ultra)</p>
                <p><span className="text-white/75 font-medium">SVG</span> — Lossless vector export</p>
                <p><span className="text-white/75 font-medium">JSON</span> — Full backup of everything</p>
                <p><span className="text-white/75 font-medium">CSV</span> — Sheets, Excel, LibreOffice</p>
                <p><span className="text-white/75 font-medium">Push to Platforms</span> — Direct social publish</p>
                <p><span className="text-white/75 font-medium">AI Evolve</span> — Synthesize 2+ cards with AI</p>
              </div>
            </div>

            {/* Media Support */}
            <div className="rounded-xl bg-white/[0.03] p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-orange-400 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-orange-500/10 p-1"><Film className="h-3.5 w-3.5 text-orange-400" /></span>
                Media Support
              </h3>
              <div className="space-y-1.5 text-[10px] sm:text-[11px] text-white/45">
                <p><span className="text-white/75 font-medium">Images</span> — PNG, JPG, WebP, SVG with preview</p>
                <p><span className="text-white/75 font-medium">Videos</span> — MP4, WebM with playback</p>
                <p><span className="text-white/75 font-medium">Audio</span> — MP3, WAV, OGG inline player</p>
                <p><span className="text-white/75 font-medium">GIFs</span> — Animated live preview</p>
                <p><span className="text-white/75 font-medium">All media</span> — Move, resize, rotate, group, export</p>
              </div>
            </div>

            {/* Saving & History */}
            <div className="rounded-xl bg-white/[0.03] p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-green-400 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-green-500/10 p-1"><Save className="h-3.5 w-3.5 text-green-400" /></span>
                Saving & History
              </h3>
              <div className="space-y-1.5 text-[10px] sm:text-[11px] text-white/45">
                <p><span className="text-white/75 font-medium">Auto-save</span> — Every 2.5s on changes</p>
                <p><span className="text-white/75 font-medium">Manual Save</span> — Ctrl+S (green/amber dot)</p>
                <p><span className="text-white/75 font-medium">Undo/Redo</span> — 80-step history</p>
                <p><span className="text-white/75 font-medium">Clear Board</span> — Remove everything</p>
                <p><span className="text-white/75 font-medium">Clear Ink</span> — Strokes only</p>
              </div>
            </div>

            {/* Alignment & Layout */}
            <div className="rounded-xl bg-white/[0.03] p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-indigo-400 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-indigo-500/10 p-1"><AlignCenterHorizontal className="h-3.5 w-3.5 text-indigo-400" /></span>
                Alignment & Layout
              </h3>
              <div className="space-y-1.5 text-[10px] sm:text-[11px] text-white/45">
                <p><span className="text-white/75 font-medium">Align tools</span> — Left, Right, Top, Bottom, Center</p>
                <p><span className="text-white/75 font-medium">Auto Arrange</span> — Grid layout all elements</p>
                <p><span className="text-white/75 font-medium">Inspector</span> — Edit position, size, rotation</p>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentSandbox;
