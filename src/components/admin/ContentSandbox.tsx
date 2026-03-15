import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  Circle,
  Copy,
  Diamond,
  Download,
  Eraser,
  Grip,
  Layers,
  Link2,
  Loader2,
  MousePointer,
  Move,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Square,
  StickyNote,
  Trash2,
  Triangle,
  Type,
  Unlink,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  tone: PaletteTone;
  links: string[];
  sourceItemId?: string;
  data?: any;
  text?: string;
  annotation?: string;
  shape?: ShapeKind;
  fontSize?: number;
}

type InteractionState =
  | { type: "pan"; originClient: Point; originViewport: Viewport }
  | { type: "draw"; tool: "pen" | "eraser"; tone: PaletteTone; size: number; points: Point[] }
  | { type: "drag"; anchor: Point; originPositions: Record<string, Point> }
  | { type: "resize"; elementId: string; anchor: Point; originRect: Pick<SandboxElement, "x" | "y" | "width" | "height"> };

const STORAGE_KEY = "content_sandbox_state_v4";
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.4;
const DEFAULT_VIEWPORT: Viewport = { x: 32, y: 32, zoom: 1 };

const PALETTE: Record<PaletteTone, { label: string; stroke: string; fill: string; softClass: string }> = {
  primary: {
    label: "Primary",
    stroke: "hsl(var(--primary))",
    fill: "hsl(var(--primary) / 0.14)",
    softClass: "border-primary/20 bg-primary/10 text-primary",
  },
  accent: {
    label: "Accent",
    stroke: "hsl(var(--accent))",
    fill: "hsl(var(--accent) / 0.14)",
    softClass: "border-accent/20 bg-accent/10 text-accent",
  },
  foreground: {
    label: "Ink",
    stroke: "hsl(var(--foreground))",
    fill: "hsl(var(--foreground) / 0.12)",
    softClass: "border-foreground/20 bg-foreground/10 text-foreground",
  },
  muted: {
    label: "Muted",
    stroke: "hsl(var(--muted-foreground))",
    fill: "hsl(var(--muted-foreground) / 0.12)",
    softClass: "border-muted-foreground/20 bg-muted text-muted-foreground",
  },
  destructive: {
    label: "Delete",
    stroke: "hsl(var(--destructive))",
    fill: "hsl(var(--destructive) / 0.14)",
    softClass: "border-destructive/20 bg-destructive/10 text-destructive",
  },
};

const TOOL_ITEMS: { id: Tool; label: string; icon: any }[] = [
  { id: "select", label: "Select", icon: MousePointer },
  { id: "pan", label: "Pan", icon: Move },
  { id: "pen", label: "Brush", icon: Pencil },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "text", label: "Text", icon: Type },
  { id: "note", label: "Sticky", icon: StickyNote },
  { id: "rectangle", label: "Rect", icon: Square },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "triangle", label: "Triangle", icon: Triangle },
  { id: "diamond", label: "Diamond", icon: Diamond },
  { id: "arrow", label: "Arrow", icon: ArrowRight },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const getElementCenter = (element: SandboxElement) => ({ x: element.x + element.width / 2, y: element.y + element.height / 2 });
const nextZ = (elements: SandboxElement[]) => (elements.length ? Math.max(...elements.map(element => element.z)) + 1 : 1);
const getItemSource = (item: any) => (typeof item?.metadata?.source === "string" ? item.metadata.source : "");

const gridPosition = (index: number, columns: number) => ({
  x: 48 + (index % columns) * 312,
  y: 48 + Math.floor(index / columns) * 228,
});

const parseAiPayload = (raw: unknown) => {
  const text = typeof raw === "string"
    ? raw
    : typeof raw === "object" && raw !== null && "choices" in raw
      ? (raw as any)?.choices?.[0]?.message?.content || JSON.stringify(raw)
      : JSON.stringify(raw ?? "");

  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0].replace(/,\s*([}\]])/g, "$1"));
  }

  return {
    title: "Evolved concept",
    caption: cleaned,
    platform: "instagram",
    content_type: "post",
    hashtags: [],
    evolution_notes: "Combined inside Sandbox",
    viral_score: 82,
  };
};

const getScenePoint = (clientX: number, clientY: number, board: HTMLDivElement | null, viewport: Viewport): Point => {
  if (!board) return { x: 0, y: 0 };
  const rect = board.getBoundingClientRect();
  return {
    x: (clientX - rect.left - viewport.x) / viewport.zoom,
    y: (clientY - rect.top - viewport.y) / viewport.zoom,
  };
};

const createImportedElement = (item: any, index: number, columns: number, z: number): SandboxElement => {
  const point = gridPosition(index, columns);
  return {
    id: `sandbox-${crypto.randomUUID()}`,
    kind: "content",
    x: point.x,
    y: point.y,
    width: 284,
    height: 192,
    z,
    tone: "primary",
    links: [],
    sourceItemId: item.id,
    data: clone(item),
    annotation: item.description || "",
    fontSize: 14,
  };
};

const shapeFillStyle = (shape: ShapeKind, tone: PaletteTone) => {
  const palette = PALETTE[tone];
  switch (shape) {
    case "rectangle":
      return <div className="h-full w-full rounded-xl border-2" style={{ borderColor: palette.stroke, backgroundColor: palette.fill }} />;
    case "ellipse":
      return <div className="h-full w-full rounded-full border-2" style={{ borderColor: palette.stroke, backgroundColor: palette.fill }} />;
    case "triangle":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <polygon points="50,6 94,94 6,94" fill={palette.fill} stroke={palette.stroke} strokeWidth="2" />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <polygon points="50,5 95,50 50,95 5,50" fill={palette.fill} stroke={palette.stroke} strokeWidth="2" />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path d="M8 50h68" stroke={palette.stroke} strokeWidth="8" strokeLinecap="round" />
          <path d="M56 20l30 30-30 30" fill="none" stroke={palette.stroke} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
};

type ElementViewProps = {
  element: SandboxElement;
  isSelected: boolean;
  isLinkSource: boolean;
  onElementPointerDown: (event: React.PointerEvent<HTMLDivElement>, element: SandboxElement) => void;
  onResizePointerDown: (event: React.PointerEvent<HTMLButtonElement>, element: SandboxElement) => void;
  onInlineTextChange: (elementId: string, value: string) => void;
};

const ElementView = memo(function ElementView({
  element,
  isSelected,
  isLinkSource,
  onElementPointerDown,
  onResizePointerDown,
  onInlineTextChange,
}: ElementViewProps) {
  const palette = PALETTE[element.tone];
  const source = element.data ? getItemSource(element.data) : "";

  return (
    <div
      className={cn(
        "absolute will-change-transform",
        isSelected && "ring-2 ring-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]",
        isLinkSource && "ring-2 ring-accent"
      )}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.z,
      }}
      onPointerDown={(event) => onElementPointerDown(event, element)}
    >
      {element.kind === "content" && element.data && (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Grip className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="border-border text-[10px] capitalize text-muted-foreground">{element.data.platform}</Badge>
            <Badge variant="outline" className={cn(
              "text-[10px] capitalize",
              element.data.status === "published" ? "border-accent/20 text-accent" : element.data.status === "draft" ? "border-primary/20 text-primary" : "border-border text-muted-foreground"
            )}>{element.data.status}</Badge>
            {source && <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">{source.replace(/_/g, " ")}</Badge>}
          </div>
          <div className="flex-1 space-y-2 overflow-hidden px-3 py-3">
            <p className="line-clamp-2 text-sm font-semibold text-foreground">{element.data.title}</p>
            <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">{element.data.caption || "No caption yet"}</p>
            {element.annotation && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-2 py-1.5 text-[11px] text-primary line-clamp-2">
                {element.annotation}
              </div>
            )}
          </div>
          <div className="border-t border-border px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>{element.data.hashtags?.length || 0} hashtags</span>
              <span>{element.links.length} links</span>
            </div>
            {Number(element.data.viral_score || 0) > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clamp(Number(element.data.viral_score || 0), 0, 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {element.kind === "note" && (
        <div className="flex h-full flex-col rounded-2xl border p-3 shadow-sm backdrop-blur-sm" style={{ borderColor: palette.stroke, backgroundColor: palette.fill }}>
          <div className="mb-2 flex items-center gap-2">
            <Grip className="h-3.5 w-3.5" style={{ color: palette.stroke }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: palette.stroke }}>Note</span>
          </div>
          <textarea
            value={element.text || ""}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => onInlineTextChange(element.id, event.target.value)}
            className="h-full w-full resize-none border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Sketch an idea, paste raw copy, write markup notes..."
          />
        </div>
      )}

      {element.kind === "text" && (
        <div className="flex h-full items-start rounded-xl border border-dashed border-border bg-background/70 p-3 shadow-sm">
          <div
            contentEditable
            suppressContentEditableWarning
            onPointerDown={(event) => event.stopPropagation()}
            onBlur={(event) => onInlineTextChange(element.id, event.currentTarget.textContent || "")}
            className="w-full whitespace-pre-wrap break-words text-foreground outline-none"
            style={{ color: palette.stroke, fontSize: element.fontSize || 16 }}
          >
            {element.text || "New text"}
          </div>
        </div>
      )}

      {element.kind === "shape" && element.shape && (
        <div className="h-full rounded-2xl border border-border bg-background/60 p-2 backdrop-blur-sm">
          {shapeFillStyle(element.shape, element.tone)}
        </div>
      )}

      <button
        type="button"
        aria-label="Resize element"
        className="absolute bottom-1 right-1 h-4 w-4 rounded-full border border-border bg-background shadow-sm"
        onPointerDown={(event) => onResizePointerDown(event, element)}
      />
    </div>
  );
});

const ContentSandbox = ({ items, onRefresh }: { items: any[]; onRefresh: () => void }) => {
  const isMobile = useIsMobile();
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const elementsRef = useRef<SandboxElement[]>([]);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const viewportRef = useRef<Viewport>(DEFAULT_VIEWPORT);

  const [elements, setElements] = useState<SandboxElement[]>([]);
  const [strokes, setStrokes] = useState<SandboxStroke[]>([]);
  const [draftStroke, setDraftStroke] = useState<SandboxStroke | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeTone, setActiveTone] = useState<PaletteTone>("primary");
  const [brushSize, setBrushSize] = useState(4);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importMode, setImportMode] = useState<"all" | "drafts" | "non-drafts" | "competitor">("all");
  const [showInspector, setShowInspector] = useState(!isMobile);
  const [evolverPrompt, setEvolverPrompt] = useState("");
  const [evolverPlatform, setEvolverPlatform] = useState("instagram");
  const [evolving, setEvolving] = useState(false);
  const [savingBack, setSavingBack] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setElements(Array.isArray(parsed?.elements) ? parsed.elements : []);
      setStrokes(Array.isArray(parsed?.strokes) ? parsed.strokes : []);
    } catch {
      // ignore invalid sandbox state
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, elements, strokes }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [elements, strokes]);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const orderedElements = useMemo(() => [...elements].sort((left, right) => left.z - right.z), [elements]);
  const primarySelectedId = useMemo(() => Array.from(selectedIds)[0] || null, [selectedIds]);
  const selectedElements = useMemo(() => orderedElements.filter(element => selectedIds.has(element.id)), [orderedElements, selectedIds]);
  const primaryElement = useMemo(() => orderedElements.find(element => element.id === primarySelectedId) || null, [orderedElements, primarySelectedId]);
  const importedSourceIds = useMemo(() => new Set(elements.map(element => element.sourceItemId).filter(Boolean)), [elements]);

  const importableItems = useMemo(() => {
    const query = importQuery.trim().toLowerCase();
    return items.filter(item => {
      const matchesMode = importMode === "all"
        || (importMode === "drafts" && item.status === "draft")
        || (importMode === "non-drafts" && item.status !== "draft")
        || (importMode === "competitor" && ["competitor_intel", "swot_analysis", "gap_analysis"].includes(getItemSource(item)));

      if (!matchesMode) return false;
      if (!query) return true;
      return [item.title, item.caption, item.platform, item.content_type, getItemSource(item)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [importMode, importQuery, items]);

  const drawScene = useCallback(() => {
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return;

    const rect = board.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== rect.width * ratio || canvas.height !== rect.height * ratio) {
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
    }

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.save();
    context.translate(viewport.x, viewport.y);
    context.scale(viewport.zoom, viewport.zoom);

    const lookup = new Map(elements.map(element => [element.id, element]));

    orderedElements.forEach(element => {
      element.links.forEach(targetId => {
        const target = lookup.get(targetId);
        if (!target) return;

        const from = getElementCenter(element);
        const to = getElementCenter(target);
        context.beginPath();
        context.strokeStyle = "hsl(var(--primary) / 0.4)";
        context.lineWidth = 2;
        context.setLineDash([8, 6]);
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        context.setLineDash([]);

        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const head = 10;
        context.beginPath();
        context.fillStyle = "hsl(var(--primary) / 0.8)";
        context.moveTo(to.x, to.y);
        context.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
        context.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
        context.closePath();
        context.fill();
      });
    });

    [...strokes, ...(draftStroke ? [draftStroke] : [])].forEach(stroke => {
      if (stroke.points.length < 2) return;
      context.beginPath();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = stroke.size;
      context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
      context.strokeStyle = PALETTE[stroke.tone].stroke;
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach(point => context.lineTo(point.x, point.y));
      context.stroke();
      context.globalCompositeOperation = "source-over";
    });

    context.restore();
  }, [draftStroke, elements, orderedElements, strokes, viewport]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver(() => drawScene());
    observer.observe(board);
    return () => observer.disconnect();
  }, [drawScene]);

  const linkElements = useCallback((fromId: string, toId: string) => {
    setElements(prev => prev.map(element => {
      if (element.id !== fromId) return element;
      const nextLinks = element.links.includes(toId)
        ? element.links.filter(id => id !== toId)
        : [...element.links, toId];
      return { ...element, links: nextLinks };
    }));
  }, []);

  const addElementFromTool = useCallback((tool: Tool, point: Point) => {
    const z = nextZ(elementsRef.current);
    const base = {
      id: `sandbox-${crypto.randomUUID()}`,
      x: point.x,
      y: point.y,
      z,
      tone: activeTone,
      links: [],
      annotation: "",
      fontSize: 16,
    } satisfies Partial<SandboxElement>;

    let element: SandboxElement | null = null;

    if (tool === "note") {
      element = { ...base, kind: "note", width: 240, height: 180, text: "", } as SandboxElement;
    }

    if (tool === "text") {
      element = { ...base, kind: "text", width: 260, height: 96, text: "Type freely here", } as SandboxElement;
    }

    if (["rectangle", "ellipse", "triangle", "diamond", "arrow"].includes(tool)) {
      element = {
        ...base,
        kind: "shape",
        width: tool === "arrow" ? 220 : 180,
        height: tool === "arrow" ? 80 : 160,
        shape: tool as ShapeKind,
      } as SandboxElement;
    }

    if (!element) return;

    setElements(prev => [...prev, element!]);
    setSelectedIds(new Set([element.id]));
  }, [activeTone]);

  const updateElement = useCallback((elementId: string, patch: Partial<SandboxElement>) => {
    setElements(prev => prev.map(element => element.id === elementId ? { ...element, ...patch } : element));
  }, []);

  const updatePrimaryContentField = useCallback((field: string, value: any) => {
    if (!primaryElement || primaryElement.kind !== "content") return;
    setElements(prev => prev.map(element => {
      if (element.id !== primaryElement.id) return element;
      return {
        ...element,
        data: {
          ...element.data,
          [field]: value,
        },
      };
    }));
  }, [primaryElement]);

  const updatePrimaryText = useCallback((value: string) => {
    if (!primaryElement) return;
    updateElement(primaryElement.id, { text: value });
  }, [primaryElement, updateElement]);

  const bringSelectionForward = useCallback(() => {
    const ids = Array.from(selectedIdsRef.current);
    if (ids.length === 0) return;

    setElements(prev => {
      let z = nextZ(prev);
      return prev.map(element => ids.includes(element.id) ? { ...element, z: z++ } : element);
    });
  }, []);

  const duplicateSelection = useCallback(() => {
    const ids = Array.from(selectedIdsRef.current);
    if (ids.length === 0) return;

    const source = elementsRef.current.filter(element => ids.includes(element.id));
    let z = nextZ(elementsRef.current);
    const duplicates = source.map(element => ({
      ...clone(element),
      id: `sandbox-${crypto.randomUUID()}`,
      x: element.x + 28,
      y: element.y + 28,
      z: z++,
      links: [],
    }));

    setElements(prev => [...prev, ...duplicates]);
    setSelectedIds(new Set(duplicates.map(element => element.id)));
  }, []);

  const deleteSelection = useCallback(() => {
    const ids = new Set(selectedIdsRef.current);
    if (ids.size === 0) return;

    setElements(prev => prev
      .filter(element => !ids.has(element.id))
      .map(element => ({ ...element, links: element.links.filter(linkId => !ids.has(linkId)) }))
    );
    setSelectedIds(new Set());
    setLinkSourceId(null);
  }, []);

  const clearSandbox = useCallback(() => {
    if (!confirm("Reset the entire Sandbox canvas?")) return;
    setElements([]);
    setStrokes([]);
    setSelectedIds(new Set());
    setLinkSourceId(null);
  }, []);

  const clearInk = useCallback(() => setStrokes([]), []);

  const autoArrange = useCallback(() => {
    const ids = Array.from(selectedIdsRef.current);
    const targets = ids.length > 0 ? ids : elementsRef.current.map(element => element.id);
    const columns = isMobile ? 1 : 3;
    let index = 0;

    setElements(prev => prev.map(element => {
      if (!targets.includes(element.id)) return element;
      const point = gridPosition(index++, columns);
      return { ...element, x: point.x, y: point.y };
    }));
  }, [isMobile]);

  const importItemsToBoard = useCallback((rows: any[]) => {
    const columns = isMobile ? 1 : 3;
    const existingIds = new Set(elementsRef.current.map(element => element.sourceItemId).filter(Boolean));
    const nextItems = rows.filter(item => !existingIds.has(item.id));
    if (nextItems.length === 0) {
      toast.info("Those cards are already on the Sandbox");
      return;
    }

    let z = nextZ(elementsRef.current);
    const imported = nextItems.map((item, index) => createImportedElement(item, index, columns, z++));
    setElements(prev => [...prev, ...imported]);
    setSelectedIds(new Set(imported.map(element => element.id)));
    toast.success(`${imported.length} cards imported into Sandbox`);
  }, [isMobile]);

  const saveSelectedBackToContent = useCallback(async () => {
    if (!primaryElement || primaryElement.kind !== "content" || !primaryElement.data?.id) return;
    setSavingBack(true);
    try {
      const metadata = {
        ...(primaryElement.data.metadata || {}),
        sandbox_annotation: primaryElement.annotation || null,
      };
      const { data, error } = await supabase
        .from("content_calendar")
        .update({
          title: primaryElement.data.title,
          caption: primaryElement.data.caption,
          description: primaryElement.annotation || primaryElement.data.description || null,
          metadata,
        })
        .eq("id", primaryElement.data.id)
        .select()
        .single();

      if (error) throw error;

      setElements(prev => prev.map(element => element.id === primaryElement.id
        ? { ...element, data, annotation: data.description || primaryElement.annotation }
        : element
      ));
      onRefresh();
      toast.success("Sandbox edits saved back to Content");
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes back to Content");
    } finally {
      setSavingBack(false);
    }
  }, [onRefresh, primaryElement]);

  const evolveSelection = useCallback(async () => {
    const selected = elementsRef.current.filter(element => selectedIdsRef.current.has(element.id));
    if (selected.length < 2) {
      toast.error("Select 2 or more cards to evolve");
      return;
    }

    setEvolving(true);
    try {
      const prompt = selected.map(element => {
        if (element.kind === "content" && element.data) {
          return `CONTENT\nTitle: ${element.data.title}\nPlatform: ${element.data.platform}\nType: ${element.data.content_type}\nCaption: ${element.data.caption || ""}\nNotes: ${element.annotation || "none"}`;
        }
        if (element.kind === "note") return `NOTE\n${element.text || ""}`;
        if (element.kind === "text") return `TEXT\n${element.text || ""}`;
        return `SHAPE\n${element.shape}`;
      }).join("\n\n---\n\n");

      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `You are an elite creative director working inside a visual idea sandbox. Combine the following selected cards into one stronger concept.\n\n${prompt}\n\nGoal: ${evolverPrompt || "Make the concept more strategic, original, and publishable."}\nTarget platform: ${evolverPlatform}\n\nReturn ONLY valid JSON:\n{"title":"...","caption":"...","platform":"instagram/tiktok/facebook/threads/twitter/onlyfans","content_type":"post/reel/story/tweet/promo","hashtags":["tag"],"evolution_notes":"...","viral_score":85}`,
          }],
        },
      });

      if (error) throw error;
      const evolved = parseAiPayload(data);

      const { data: newItem, error: insertError } = await supabase
        .from("content_calendar")
        .insert({
          title: evolved.title || "Evolved concept",
          caption: evolved.caption || "",
          platform: (evolved.platform || evolverPlatform || "instagram").toLowerCase(),
          content_type: evolved.content_type || "post",
          hashtags: Array.isArray(evolved.hashtags) ? evolved.hashtags.map((tag: string) => tag.replace(/^#/, "")) : [],
          status: "draft",
          viral_score: Number(evolved.viral_score || 82),
          description: evolved.evolution_notes || "Created inside Sandbox Evolver",
          metadata: {
            source: "sandbox_evolver",
            evolved_from: selected.map(element => element.sourceItemId || element.id),
            sandbox_prompt: evolverPrompt || null,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const center = selected.reduce((acc, element) => {
        acc.x += element.x;
        acc.y += element.y;
        return acc;
      }, { x: 0, y: 0 });

      const evolvedElement: SandboxElement = {
        id: `sandbox-${crypto.randomUUID()}`,
        kind: "content",
        x: center.x / selected.length + 48,
        y: center.y / selected.length - 120,
        width: 304,
        height: 208,
        z: nextZ(elementsRef.current),
        tone: "accent",
        links: selected.map(element => element.id),
        sourceItemId: newItem.id,
        data: newItem,
        annotation: evolved.evolution_notes || "",
        fontSize: 14,
      };

      setElements(prev => [...prev, evolvedElement]);
      setSelectedIds(new Set([evolvedElement.id]));
      setEvolverPrompt("");
      onRefresh();
      toast.success(`Evolved ${selected.length} cards into a stronger draft`);
    } catch (error: any) {
      toast.error(error.message || "Sandbox Evolver failed");
    } finally {
      setEvolving(false);
    }
  }, [evolverPlatform, evolverPrompt, onRefresh]);

  const startDrag = useCallback((element: SandboxElement, clientX: number, clientY: number) => {
    const scenePoint = getScenePoint(clientX, clientY, boardRef.current, viewportRef.current);
    const selected = selectedIdsRef.current.has(element.id) ? Array.from(selectedIdsRef.current) : [element.id];
    const originPositions = Object.fromEntries(
      elementsRef.current
        .filter(entry => selected.includes(entry.id))
        .map(entry => [entry.id, { x: entry.x, y: entry.y }])
    );
    interactionRef.current = { type: "drag", anchor: scenePoint, originPositions };
  }, []);

  const handleElementPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>, element: SandboxElement) => {
    event.stopPropagation();

    if (linkSourceId && linkSourceId !== element.id) {
      linkElements(linkSourceId, element.id);
      setLinkSourceId(null);
      toast.success("Cards linked");
      return;
    }

    const nextSelected = new Set(selectedIdsRef.current);
    if (event.shiftKey) {
      if (nextSelected.has(element.id)) nextSelected.delete(element.id);
      else nextSelected.add(element.id);
    } else {
      nextSelected.clear();
      nextSelected.add(element.id);
    }

    setSelectedIds(new Set(nextSelected));
    bringSelectionForward();

    if (activeTool === "select") {
      startDrag(element, event.clientX, event.clientY);
    }
  }, [activeTool, bringSelectionForward, linkElements, linkSourceId, startDrag]);

  const handleResizePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>, element: SandboxElement) => {
    event.stopPropagation();
    const anchor = getScenePoint(event.clientX, event.clientY, boardRef.current, viewportRef.current);
    interactionRef.current = {
      type: "resize",
      elementId: element.id,
      anchor,
      originRect: {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      },
    };
    setSelectedIds(new Set([element.id]));
  }, []);

  const handleBoardPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;

    if (event.button === 1 || activeTool === "pan") {
      interactionRef.current = {
        type: "pan",
        originClient: { x: event.clientX, y: event.clientY },
        originViewport: viewportRef.current,
      };
      return;
    }

    const scenePoint = getScenePoint(event.clientX, event.clientY, boardRef.current, viewportRef.current);

    if (activeTool === "pen" || activeTool === "eraser") {
      interactionRef.current = {
        type: "draw",
        tool: activeTool,
        tone: activeTone,
        size: brushSize,
        points: [scenePoint],
      };
      setDraftStroke({ id: "draft", tool: activeTool, tone: activeTone, size: brushSize, points: [scenePoint] });
      return;
    }

    if (["note", "text", "rectangle", "ellipse", "triangle", "diamond", "arrow"].includes(activeTool)) {
      addElementFromTool(activeTool, scenePoint);
      return;
    }

    setSelectedIds(new Set());
    setLinkSourceId(null);
  }, [activeTool, activeTone, addElementFromTool, brushSize]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      if (interaction.type === "pan") {
        setViewport({
          ...interaction.originViewport,
          x: interaction.originViewport.x + (event.clientX - interaction.originClient.x),
          y: interaction.originViewport.y + (event.clientY - interaction.originClient.y),
        });
        return;
      }

      const point = getScenePoint(event.clientX, event.clientY, boardRef.current, viewportRef.current);

      if (interaction.type === "draw") {
        const nextPoints = [...interaction.points, point];
        interaction.points = nextPoints;
        setDraftStroke({ id: "draft", tool: interaction.tool, tone: interaction.tone, size: interaction.size, points: nextPoints });
        return;
      }

      if (interaction.type === "drag") {
        const dx = point.x - interaction.anchor.x;
        const dy = point.y - interaction.anchor.y;
        setElements(prev => prev.map(element => {
          const origin = interaction.originPositions[element.id];
          return origin ? { ...element, x: origin.x + dx, y: origin.y + dy } : element;
        }));
        return;
      }

      if (interaction.type === "resize") {
        const dx = point.x - interaction.anchor.x;
        const dy = point.y - interaction.anchor.y;
        setElements(prev => prev.map(element => element.id === interaction.elementId
          ? {
            ...element,
            width: clamp(interaction.originRect.width + dx, 120, 920),
            height: clamp(interaction.originRect.height + dy, 70, 720),
          }
          : element
        ));
      }
    };

    const handlePointerUp = () => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      if (interaction.type === "draw" && interaction.points.length > 1) {
        setStrokes(prev => [...prev, {
          id: crypto.randomUUID(),
          tool: interaction.tool,
          tone: interaction.tone,
          size: interaction.size,
          points: interaction.points,
        }]);
      }

      interactionRef.current = null;
      setDraftStroke(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const zoomAroundPoint = useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const anchorX = clientX ?? rect.left + rect.width / 2;
    const anchorY = clientY ?? rect.top + rect.height / 2;
    const point = getScenePoint(anchorX, anchorY, board, viewportRef.current);
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

    setViewport({
      zoom: clampedZoom,
      x: anchorX - rect.left - point.x * clampedZoom,
      y: anchorY - rect.top - point.y * clampedZoom,
    });
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const direction = event.deltaY > 0 ? -0.1 : 0.1;
      zoomAroundPoint(viewportRef.current.zoom + direction, event.clientX, event.clientY);
      return;
    }

    setViewport(prev => ({
      ...prev,
      x: prev.x - event.deltaX,
      y: prev.y - event.deltaY,
    }));
  }, [zoomAroundPoint]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "0") {
        event.preventDefault();
        setViewport(DEFAULT_VIEWPORT);
      }
      if (event.key.toLowerCase() === "v") setActiveTool("select");
      if (event.key.toLowerCase() === "h") setActiveTool("pan");
      if (event.key.toLowerCase() === "p") setActiveTool("pen");
      if (event.key.toLowerCase() === "n") setActiveTool("note");
      if (event.key.toLowerCase() === "t") setActiveTool("text");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelection, duplicateSelection]);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <Card className="border-border bg-card/70">
          <CardContent className="space-y-3 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">Sandbox</Badge>
                  <span className="text-sm font-semibold text-foreground">Real idea canvas for drafts, live content, notes, and linked experiments</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Import any content card, drag it smoothly, annotate it, connect it, draw over it, and evolve multiple ideas into stronger drafts.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="h-8 border-primary/20 text-primary hover:bg-primary/10">
                  <Download className="mr-1 h-3.5 w-3.5" /> Import
                </Button>
                <Button size="sm" variant="outline" onClick={autoArrange} className="h-8 border-border text-muted-foreground hover:text-foreground">
                  <Wand2 className="mr-1 h-3.5 w-3.5" /> Arrange
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowInspector(prev => !prev)} className="h-8 border-border text-muted-foreground hover:text-foreground lg:hidden">
                  <Layers className="mr-1 h-3.5 w-3.5" /> {showInspector ? "Hide" : "Show"} panel
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/60 p-2">
              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/70 p-1">
                {TOOL_ITEMS.map(tool => (
                  <button
                    key={tool.id}
                    type="button"
                    title={tool.label}
                    onClick={() => setActiveTool(tool.id)}
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors",
                      activeTool === tool.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <tool.icon className="mx-auto h-3.5 w-3.5" />
                    <span className="mt-1 hidden sm:block">{tool.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/70 p-1">
                {(Object.keys(PALETTE) as PaletteTone[]).map(tone => (
                  <button
                    key={tone}
                    type="button"
                    title={PALETTE[tone].label}
                    onClick={() => setActiveTone(tone)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      activeTone === tone ? "scale-110 border-foreground" : "border-transparent"
                    )}
                    style={{ backgroundColor: PALETTE[tone].stroke }}
                  />
                ))}
              </div>

              {(activeTool === "pen" || activeTool === "eraser") && (
                <div className="flex items-center gap-1 rounded-xl border border-border bg-card/70 px-2 py-1">
                  {[2, 4, 8, 14].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setBrushSize(size)}
                      className={cn("rounded-full transition-transform", brushSize === size ? "scale-110 bg-primary" : "bg-muted-foreground/40")}
                      style={{ width: Math.max(size * 1.4, 10), height: Math.max(size * 1.4, 10) }}
                    />
                  ))}
                </div>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => zoomAroundPoint(viewport.zoom - 0.15)} className="h-8 border-border text-muted-foreground hover:text-foreground">
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <div className="rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground">{Math.round(viewport.zoom * 100)}%</div>
                <Button size="sm" variant="outline" onClick={() => zoomAroundPoint(viewport.zoom + 0.15)} className="h-8 border-border text-muted-foreground hover:text-foreground">
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewport(DEFAULT_VIEWPORT)} className="h-8 border-border text-muted-foreground hover:text-foreground">
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset view
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>{elements.filter(element => element.kind === "content").length} content cards</span>
              <span>•</span>
              <span>{elements.filter(element => element.kind !== "content").length} sandbox elements</span>
              <span>•</span>
              <span>{strokes.length} ink layers</span>
              <span>•</span>
              <span>{selectedIds.size} selected</span>
              {linkSourceId && (
                <Badge variant="outline" className="border-accent/20 bg-accent/10 text-accent">
                  <Link2 className="mr-1 h-3 w-3" /> Click another card to link
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <div
          ref={boardRef}
          onPointerDown={handleBoardPointerDown}
          onWheel={handleWheel}
          className="relative overflow-hidden rounded-[1.5rem] border border-border bg-background touch-none"
          style={{
            height: isMobile ? "68vh" : "74vh",
            cursor: activeTool === "pan" ? "grab" : activeTool === "pen" ? "crosshair" : activeTool === "eraser" ? "cell" : activeTool === "text" ? "text" : "default",
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
            backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />

          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {orderedElements.map(element => (
              <ElementView
                key={element.id}
                element={element}
                isSelected={selectedIds.has(element.id)}
                isLinkSource={linkSourceId === element.id}
                onElementPointerDown={handleElementPointerDown}
                onResizePointerDown={handleResizePointerDown}
                onInlineTextChange={(elementId, value) => updateElement(elementId, { text: value })}
              />
            ))}
          </div>

          {elements.length === 0 && strokes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-sm rounded-[1.5rem] border border-border bg-card/80 p-6 text-center shadow-sm backdrop-blur-sm">
                <Layers className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Build the perfect idea sandbox</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Import drafts or live cards, sketch over them, create sticky notes, add shapes, connect thoughts, then evolve several ideas into something stronger.
                </p>
              </div>
            </div>
          )}

          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={clearInk} className="h-8 border-border bg-background/80 text-muted-foreground backdrop-blur-sm hover:text-foreground">
              <Eraser className="mr-1 h-3.5 w-3.5" /> Clear ink
            </Button>
            <Button size="sm" variant="outline" onClick={duplicateSelection} disabled={selectedIds.size === 0} className="h-8 border-border bg-background/80 text-muted-foreground backdrop-blur-sm hover:text-foreground">
              <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (selectedIds.size !== 1) {
                toast.info("Select exactly one card to start linking");
                return;
              }
              setLinkSourceId(prev => prev ? null : Array.from(selectedIds)[0]);
            }} disabled={selectedIds.size === 0} className="h-8 border-border bg-background/80 text-muted-foreground backdrop-blur-sm hover:text-foreground">
              <Link2 className="mr-1 h-3.5 w-3.5" /> {linkSourceId ? "Cancel link" : "Link"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const ids = Array.from(selectedIdsRef.current);
              if (ids.length === 0) return;
              setElements(prev => prev.map(element => ({
                ...element,
                links: ids.includes(element.id) ? [] : element.links.filter(linkId => !ids.includes(linkId)),
              })));
            }} disabled={selectedIds.size === 0} className="h-8 border-border bg-background/80 text-muted-foreground backdrop-blur-sm hover:text-foreground">
              <Unlink className="mr-1 h-3.5 w-3.5" /> Unlink
            </Button>
            <Button size="sm" variant="outline" onClick={deleteSelection} disabled={selectedIds.size === 0} className="h-8 border-destructive/20 bg-background/80 text-destructive backdrop-blur-sm hover:bg-destructive/10">
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
            </Button>
            <Button size="sm" variant="outline" onClick={clearSandbox} className="h-8 border-destructive/20 bg-background/80 text-destructive backdrop-blur-sm hover:bg-destructive/10">
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reset sandbox
            </Button>
          </div>
        </div>
      </div>

      {showInspector && (
        <div className="space-y-3">
          <Card className="border-border bg-card/70">
            <CardContent className="space-y-4 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border text-muted-foreground">Inspector</Badge>
                  {primaryElement && (
                    <Badge variant="outline" className={PALETTE[primaryElement.tone].softClass}>{primaryElement.kind}</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Edit the selected item, write directly on ideas, or push refined content back into Content.</p>
              </div>

              {!primaryElement ? (
                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Select a card or element to edit it here.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div className="rounded-xl border border-border bg-background/60 px-3 py-2">x {Math.round(primaryElement.x)}</div>
                    <div className="rounded-xl border border-border bg-background/60 px-3 py-2">y {Math.round(primaryElement.y)}</div>
                    <div className="rounded-xl border border-border bg-background/60 px-3 py-2">w {Math.round(primaryElement.width)}</div>
                    <div className="rounded-xl border border-border bg-background/60 px-3 py-2">h {Math.round(primaryElement.height)}</div>
                  </div>

                  {primaryElement.kind === "content" && primaryElement.data && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-foreground">Title</label>
                        <Input
                          value={primaryElement.data.title || ""}
                          onChange={(event) => updatePrimaryContentField("title", event.target.value)}
                          className="border-border bg-background/70"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-foreground">Caption / PDF-style markup layer</label>
                        <Textarea
                          value={primaryElement.data.caption || ""}
                          onChange={(event) => updatePrimaryContentField("caption", event.target.value)}
                          className="min-h-[140px] border-border bg-background/70"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-foreground">Creative annotation</label>
                        <Textarea
                          value={primaryElement.annotation || ""}
                          onChange={(event) => updateElement(primaryElement.id, { annotation: event.target.value })}
                          className="min-h-[96px] border-border bg-background/70"
                          placeholder="Mark up the idea, add edits, callouts, hooks, CTA changes..."
                        />
                      </div>
                      <Button onClick={saveSelectedBackToContent} disabled={savingBack} className="w-full bg-primary text-primary-foreground">
                        {savingBack ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                        Save back to Content
                      </Button>
                    </>
                  )}

                  {(primaryElement.kind === "note" || primaryElement.kind === "text") && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-foreground">Text</label>
                        <Textarea
                          value={primaryElement.text || ""}
                          onChange={(event) => updatePrimaryText(event.target.value)}
                          className="min-h-[140px] border-border bg-background/70"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-foreground">Font size</label>
                        <Input
                          type="number"
                          min={12}
                          max={40}
                          value={primaryElement.fontSize || 16}
                          onChange={(event) => updateElement(primaryElement.id, { fontSize: clamp(Number(event.target.value || 16), 12, 40) })}
                          className="border-border bg-background/70"
                        />
                      </div>
                    </>
                  )}

                  {primaryElement.kind === "shape" && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-foreground">Shape tone</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(PALETTE) as PaletteTone[]).map(tone => (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => updateElement(primaryElement.id, { tone })}
                            className={cn("rounded-xl border px-2.5 py-1 text-[11px]", primaryElement.tone === tone ? PALETTE[tone].softClass : "border-border text-muted-foreground")}
                          >
                            {PALETTE[tone].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/70">
            <CardContent className="space-y-4 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-accent/20 bg-accent/10 text-accent">AI Evolver</Badge>
                  <span className="text-sm font-semibold text-foreground">Blend 2+ cards into a stronger draft</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">The Evolver reads your selected cards, notes, and links, then writes a better draft back into Content.</p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                {selectedIds.size >= 2 ? `${selectedIds.size} cards selected and ready to evolve.` : "Select at least two cards to activate the Evolver."}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-foreground">Evolution goal</label>
                <Textarea
                  value={evolverPrompt}
                  onChange={(event) => setEvolverPrompt(event.target.value)}
                  className="min-h-[96px] border-border bg-background/70"
                  placeholder="Example: Merge these into a sharper teaser campaign with a stronger CTA, clearer visual hook, and one premium reel angle."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-foreground">Target platform</label>
                <Input value={evolverPlatform} onChange={(event) => setEvolverPlatform(event.target.value)} className="border-border bg-background/70" />
              </div>

              <Button onClick={evolveSelection} disabled={selectedIds.size < 2 || evolving} className="w-full bg-accent text-accent-foreground">
                {evolving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                Evolve selected cards
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-h-[86vh] max-w-5xl overflow-hidden border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Download className="h-4 w-4 text-primary" /> Import cards into Sandbox
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={importQuery}
                onChange={(event) => setImportQuery(event.target.value)}
                className="border-border bg-background/70 pl-9"
                placeholder="Search drafts, live posts, competitor syncs..."
              />
            </div>
            {(["all", "drafts", "non-drafts", "competitor"] as const).map(mode => (
              <Button
                key={mode}
                size="sm"
                variant="outline"
                onClick={() => setImportMode(mode)}
                className={cn(
                  "h-8 capitalize",
                  importMode === mode ? "border-primary/20 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                )}
              >
                {mode.replace("-", " ")}
              </Button>
            ))}
            <Button
              size="sm"
              onClick={() => importItemsToBoard(importableItems)}
              className="h-8 bg-primary text-primary-foreground"
            >
              <Check className="mr-1 h-3.5 w-3.5" /> Import visible ({importableItems.length})
            </Button>
          </div>

          <div className="grid gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {importableItems.map(item => {
              const alreadyImported = importedSourceIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => importItemsToBoard([item])}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    alreadyImported ? "border-primary/20 bg-primary/10" : "border-border bg-background/60 hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="border-border text-[10px] capitalize text-muted-foreground">{item.platform}</Badge>
                    <Badge variant="outline" className={cn(
                      "text-[10px] capitalize",
                      item.status === "draft" ? "border-primary/20 text-primary" : item.status === "published" ? "border-accent/20 text-accent" : "border-border text-muted-foreground"
                    )}>{item.status}</Badge>
                    {getItemSource(item) && (
                      <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">{getItemSource(item).replace(/_/g, " ")}</Badge>
                    )}
                    {alreadyImported && <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-[10px]">On board</Badge>}
                  </div>
                  <p className="text-sm font-semibold text-foreground line-clamp-2">{item.title}</p>
                  <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{item.caption || item.description || "No copy yet"}</p>
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
