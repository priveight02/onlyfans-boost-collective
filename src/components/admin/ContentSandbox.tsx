import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Trash2, Move, Type, Pencil, Eraser, Square, Circle,
  ArrowRight, Sparkles, Download, ZoomIn, ZoomOut, RotateCcw,
  Loader2, Link2, Unlink, MousePointer, Grip, Layers,
  PaintBucket, StickyNote, X, Check, Copy, Maximize2,
  Triangle, Star, Hexagon, Diamond,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tool = "select" | "move" | "pen" | "text" | "eraser" | "rect" | "circle" | "arrow" | "triangle" | "star" | "diamond" | "note";

interface CanvasCard {
  id: string;
  type: "content" | "note" | "shape" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  data?: any; // content_calendar item
  text?: string;
  color?: string;
  shape?: string;
  linkedTo?: string[];
  fontSize?: number;
}

interface DrawStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: "pen" | "eraser";
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#ffffff", "#6b7280"];
const SANDBOX_KEY = "content_sandbox_state";

const ContentSandbox = ({ items, onRefresh }: { items: any[]; onRefresh: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas state
  const [cards, setCards] = useState<CanvasCard[]>([]);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [evolving, setEvolving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  // Load/save
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SANDBOX_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCards(parsed.cards || []);
        setStrokes(parsed.strokes || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(SANDBOX_KEY, JSON.stringify({ cards, strokes }));
    }, 500);
    return () => clearTimeout(timeout);
  }, [cards, strokes]);

  // Draw canvas strokes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw strokes
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === "eraser" ? "rgba(10,12,20,1)" : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }

    // Draw current stroke
    if (currentStroke.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = activeTool === "eraser" ? "rgba(200,200,200,0.5)" : activeColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }

    // Draw links between cards
    for (const card of cards) {
      if (!card.linkedTo?.length) continue;
      for (const targetId of card.linkedTo) {
        const target = cards.find(c => c.id === targetId);
        if (!target) continue;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(139,92,246,0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        const fromX = card.x + card.width / 2;
        const fromY = card.y + card.height / 2;
        const toX = target.x + target.width / 2;
        const toY = target.y + target.height / 2;
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        ctx.setLineDash([]);
        // Arrow head
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const headLen = 10;
        ctx.beginPath();
        ctx.fillStyle = "rgba(139,92,246,0.6)";
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }, [strokes, currentStroke, cards, zoom, pan, activeColor, brushSize, activeTool]);

  // Mouse helpers
  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  const findCardAt = useCallback((x: number, y: number) => {
    for (let i = cards.length - 1; i >= 0; i--) {
      const c = cards[i];
      if (x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height) return c;
    }
    return null;
  }, [cards]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);

    // Middle mouse or space+click = pan
    if (e.button === 1 || (e.button === 0 && activeTool === "move")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (activeTool === "select") {
      const card = findCardAt(pos.x, pos.y);
      if (card) {
        if (linkingFrom) {
          // Linking mode
          if (linkingFrom !== card.id) {
            setCards(prev => prev.map(c => c.id === linkingFrom ? { ...c, linkedTo: [...(c.linkedTo || []).filter(id => id !== card.id), card.id] } : c));
            toast.success("Cards linked");
          }
          setLinkingFrom(null);
          return;
        }
        if (e.shiftKey) {
          setSelectedCards(prev => {
            const next = new Set(prev);
            if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
            return next;
          });
        } else {
          setSelectedCard(card.id);
          setSelectedCards(new Set([card.id]));
        }
        setDraggingCard(card.id);
        setDragOffset({ x: pos.x - card.x, y: pos.y - card.y });
      } else {
        setSelectedCard(null);
        setSelectedCards(new Set());
        setLinkingFrom(null);
      }
      return;
    }

    if (activeTool === "text") {
      setTextPos(pos);
      setTextInput("");
      return;
    }

    if (activeTool === "note") {
      addNote(pos.x, pos.y);
      return;
    }

    if (["rect", "circle", "triangle", "star", "diamond"].includes(activeTool)) {
      addShape(activeTool, pos.x, pos.y);
      return;
    }

    if (activeTool === "pen" || activeTool === "eraser") {
      setIsDrawing(true);
      setCurrentStroke([pos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    const pos = getCanvasPos(e);
    if (draggingCard) {
      const dx = pos.x - dragOffset.x;
      const dy = pos.y - dragOffset.y;
      if (selectedCards.size > 1 && selectedCards.has(draggingCard)) {
        const draggedCard = cards.find(c => c.id === draggingCard);
        if (draggedCard) {
          const moveX = dx - draggedCard.x;
          const moveY = dy - draggedCard.y;
          setCards(prev => prev.map(c => selectedCards.has(c.id) ? { ...c, x: c.x + moveX, y: c.y + moveY } : c));
        }
      } else {
        setCards(prev => prev.map(c => c.id === draggingCard ? { ...c, x: dx, y: dy } : c));
      }
      return;
    }
    if (isDrawing) {
      setCurrentStroke(prev => [...prev, pos]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) { setIsPanning(false); return; }
    if (draggingCard) { setDraggingCard(null); return; }
    if (isDrawing && currentStroke.length > 1) {
      setStrokes(prev => [...prev, {
        id: crypto.randomUUID(),
        points: currentStroke,
        color: activeColor,
        width: brushSize,
        tool: activeTool === "eraser" ? "eraser" : "pen",
      }]);
    }
    setIsDrawing(false);
    setCurrentStroke([]);
  };

  // Add items
  const importContentCard = (item: any, x: number, y: number) => {
    const card: CanvasCard = {
      id: `card-${item.id}`,
      type: "content",
      x, y,
      width: 240, height: 160,
      data: item,
      linkedTo: [],
    };
    setCards(prev => [...prev, card]);
  };

  const addNote = (x: number, y: number) => {
    setCards(prev => [...prev, {
      id: `note-${crypto.randomUUID()}`,
      type: "note",
      x, y,
      width: 200, height: 120,
      text: "",
      color: activeColor,
      linkedTo: [],
    }]);
    setActiveTool("select");
  };

  const addShape = (shape: string, x: number, y: number) => {
    setCards(prev => [...prev, {
      id: `shape-${crypto.randomUUID()}`,
      type: "shape",
      x, y,
      width: 100, height: 100,
      shape, color: activeColor,
      linkedTo: [],
    }]);
    setActiveTool("select");
  };

  const addTextBlock = () => {
    if (!textPos || !textInput.trim()) { setTextPos(null); return; }
    setCards(prev => [...prev, {
      id: `text-${crypto.randomUUID()}`,
      type: "text",
      x: textPos.x, y: textPos.y,
      width: 200, height: 40,
      text: textInput,
      color: activeColor,
      fontSize: 14,
      linkedTo: [],
    }]);
    setTextPos(null);
    setTextInput("");
    setActiveTool("select");
  };

  const deleteSelected = () => {
    if (selectedCards.size === 0) return;
    setCards(prev => prev.filter(c => !selectedCards.has(c.id)).map(c => ({
      ...c,
      linkedTo: c.linkedTo?.filter(id => !selectedCards.has(id)),
    })));
    setSelectedCards(new Set());
    setSelectedCard(null);
  };

  const duplicateSelected = () => {
    const newCards = cards.filter(c => selectedCards.has(c.id)).map(c => ({
      ...c,
      id: `dup-${crypto.randomUUID()}`,
      x: c.x + 30,
      y: c.y + 30,
      linkedTo: [],
    }));
    setCards(prev => [...prev, ...newCards]);
  };

  // AI Evolver
  const evolveCards = async () => {
    const selected = cards.filter(c => selectedCards.has(c.id));
    if (selected.length < 2) { toast.error("Select 2+ cards to evolve"); return; }
    setEvolving(true);
    try {
      const cardDescriptions = selected.map(c => {
        if (c.type === "content" && c.data) return `Content: "${c.data.title}" - ${c.data.caption || ""} [${c.data.platform}/${c.data.content_type}] hashtags: ${(c.data.hashtags || []).join(", ")}`;
        if (c.type === "note") return `Note: "${c.text}"`;
        if (c.type === "text") return `Text: "${c.text}"`;
        return `Shape: ${c.shape}`;
      }).join("\n");

      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `You are a creative content strategist. I have these ${selected.length} content cards on my sandbox:\n\n${cardDescriptions}\n\nCOMBINE and EVOLVE them into something greater. Create a new evolved concept that merges the best of all cards into a superior piece of content.\n\nReturn ONLY a JSON object:\n{"title":"evolved title","caption":"full evolved caption with emojis","platform":"best platform","content_type":"post/reel/story","hashtags":["tag1","tag2"],"evolution_notes":"explain how you combined and elevated the ideas","viral_score":70-95}`
          }]
        }
      });

      if (error) throw error;
      const text = typeof data === "string" ? data : data?.choices?.[0]?.message?.content || JSON.stringify(data);
      
      // Parse response
      let evolved: any;
      try {
        const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        evolved = JSON.parse(match ? match[0].replace(/,\s*([\]}])/g, "$1") : cleaned);
      } catch { evolved = { title: "Evolved Concept", caption: text, platform: "instagram", content_type: "post", hashtags: [], evolution_notes: "AI combined your ideas", viral_score: 80 }; }

      // Create new content item in DB
      const { data: newItem, error: insertError } = await supabase.from("content_calendar").insert({
        title: evolved.title || "Evolved Content",
        caption: evolved.caption || "",
        platform: evolved.platform || "instagram",
        content_type: evolved.content_type || "post",
        hashtags: evolved.hashtags || [],
        status: "draft",
        viral_score: evolved.viral_score || 80,
        description: evolved.evolution_notes || "Evolved from sandbox cards",
        metadata: { source: "sandbox_evolver", evolved_from: selected.map(c => c.id) },
      }).select().single();

      if (insertError) throw insertError;

      // Place evolved card in center of selected cards
      const avgX = selected.reduce((s, c) => s + c.x, 0) / selected.length;
      const avgY = selected.reduce((s, c) => s + c.y, 0) / selected.length - 200;

      if (newItem) {
        const evolvedCard: CanvasCard = {
          id: `card-${newItem.id}`,
          type: "content",
          x: avgX, y: avgY,
          width: 280, height: 180,
          data: newItem,
          linkedTo: selected.map(c => c.id),
        };
        setCards(prev => [...prev, evolvedCard]);
      }

      onRefresh();
      toast.success(`🧬 Evolved ${selected.length} cards into "${evolved.title}"`);
    } catch (e: any) {
      toast.error(e.message || "Evolution failed");
    }
    setEvolving(false);
  };

  const clearAll = () => {
    if (!confirm("Clear entire sandbox?")) return;
    setCards([]);
    setStrokes([]);
    setSelectedCards(new Set());
    setSelectedCard(null);
  };

  // Tool config
  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "move", icon: Move, label: "Pan" },
    { id: "pen", icon: Pencil, label: "Draw" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "text", icon: Type, label: "Text" },
    { id: "note", icon: StickyNote, label: "Sticky Note" },
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "triangle", icon: Triangle, label: "Triangle" },
    { id: "star", icon: Star, label: "Star" },
    { id: "diamond", icon: Diamond, label: "Diamond" },
    { id: "arrow", icon: ArrowRight, label: "Arrow" },
  ];

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tool palette */}
        <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {tools.map(t => (
            <button key={t.id} onClick={() => setActiveTool(t.id)} title={t.label}
              className={`p-1.5 rounded-lg transition-all ${activeTool === t.id ? "bg-primary/20 text-primary" : "text-white/30 hover:text-white/60 hover:bg-white/[0.05]"}`}>
              <t.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {COLORS.map(c => (
            <button key={c} onClick={() => setActiveColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${activeColor === c ? "border-white scale-110" : "border-transparent hover:border-white/30"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>

        {/* Brush size */}
        {(activeTool === "pen" || activeTool === "eraser") && (
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-1">
            {[2, 4, 8, 16].map(s => (
              <button key={s} onClick={() => setBrushSize(s)}
                className={`rounded-full transition-all ${brushSize === s ? "bg-primary" : "bg-white/20 hover:bg-white/40"}`}
                style={{ width: Math.max(s * 1.5, 8), height: Math.max(s * 1.5, 8) }} />
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)}
            className="text-xs h-7 border-primary/20 text-primary hover:bg-primary/10">
            <Download className="h-3 w-3 mr-1" /> Import Cards
          </Button>

          {selectedCards.size >= 2 && (
            <Button size="sm" onClick={evolveCards} disabled={evolving}
              className="text-xs h-7 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              {evolving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Evolve ({selectedCards.size})
            </Button>
          )}

          {selectedCards.size > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => {
                if (!linkingFrom) {
                  if (selectedCards.size === 1) {
                    setLinkingFrom(Array.from(selectedCards)[0]);
                    toast.info("Click another card to link");
                  }
                } else {
                  setLinkingFrom(null);
                }
              }} className={`text-xs h-7 ${linkingFrom ? "border-purple-500/40 text-purple-400 bg-purple-500/10" : "border-white/[0.06] text-white/50"}`}>
                <Link2 className="h-3 w-3 mr-1" /> {linkingFrom ? "Linking..." : "Link"}
              </Button>
              <Button size="sm" variant="outline" onClick={duplicateSelected}
                className="text-xs h-7 border-white/[0.06] text-white/50">
                <Copy className="h-3 w-3 mr-1" /> Dup
              </Button>
              <Button size="sm" variant="outline" onClick={deleteSelected}
                className="text-xs h-7 border-red-500/20 text-red-400">
                <Trash2 className="h-3 w-3 mr-1" /> Del
              </Button>
            </>
          )}

          {/* Zoom */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.15))} className="p-1 text-white/30 hover:text-white/60"><ZoomOut className="h-3 w-3" /></button>
            <span className="text-[9px] text-white/40 w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.15))} className="p-1 text-white/30 hover:text-white/60"><ZoomIn className="h-3 w-3" /></button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1 text-white/30 hover:text-white/60"><RotateCcw className="h-3 w-3" /></button>
          </div>

          <Button size="sm" variant="outline" onClick={() => setStrokes([])} className="text-xs h-7 border-white/[0.06] text-white/30">
            Clear Strokes
          </Button>
          <Button size="sm" variant="outline" onClick={clearAll} className="text-xs h-7 border-red-500/20 text-red-400/50">
            Reset All
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="relative bg-[hsl(222,47%,3%)] border border-white/[0.06] rounded-xl overflow-hidden"
        style={{ height: "calc(100vh - 280px)", cursor: activeTool === "move" ? "grab" : activeTool === "pen" ? "crosshair" : activeTool === "eraser" ? "cell" : activeTool === "text" ? "text" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]">
          <defs>
            <pattern id="sandboxGrid" width={40 * zoom} height={40 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (40 * zoom)} y={pan.y % (40 * zoom)}>
              <path d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`} fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sandboxGrid)" />
        </svg>

        {/* Drawing canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Cards Layer */}
        <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          {cards.map(card => (
            <div
              key={card.id}
              className={`absolute group transition-shadow ${selectedCards.has(card.id) ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""} ${linkingFrom === card.id ? "ring-2 ring-purple-500 animate-pulse" : ""}`}
              style={{ left: card.x, top: card.y, width: card.width, height: card.height, zIndex: selectedCard === card.id ? 50 : 10 }}
              onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e); }}
            >
              {/* Content card */}
              {card.type === "content" && card.data && (
                <div className="w-full h-full bg-[hsl(222,35%,8%)] border border-white/[0.08] rounded-lg overflow-hidden flex flex-col hover:border-primary/30">
                  <div className="px-2 py-1.5 border-b border-white/[0.06] flex items-center gap-1.5">
                    <Grip className="h-2.5 w-2.5 text-white/15 cursor-grab" />
                    <Badge variant="outline" className="text-[7px] border-white/[0.08] text-white/40 capitalize">{card.data.platform}</Badge>
                    <Badge variant="outline" className={`text-[7px] capitalize ${card.data.status === "draft" ? "border-amber-500/20 text-amber-400" : card.data.status === "published" ? "border-emerald-500/20 text-emerald-400" : "border-blue-500/20 text-blue-400"}`}>{card.data.status}</Badge>
                  </div>
                  <div className="px-2 py-1.5 flex-1 overflow-hidden">
                    <p className="text-[10px] font-semibold text-white line-clamp-2 mb-1">{card.data.title}</p>
                    {card.data.caption && <p className="text-[8px] text-white/30 line-clamp-3">{card.data.caption}</p>}
                    {card.data.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {(card.data.hashtags as string[]).slice(0, 4).map((h: string, i: number) => (
                          <span key={i} className="text-[7px] text-blue-400/50">#{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {card.data.viral_score > 0 && (
                    <div className="px-2 py-1 border-t border-white/[0.04]">
                      <div className="w-full h-1 bg-white/[0.05] rounded-full">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary" style={{ width: `${card.data.viral_score}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sticky Note */}
              {card.type === "note" && (
                <div className="w-full h-full rounded-lg border p-2 flex flex-col" style={{ backgroundColor: card.color + "15", borderColor: card.color + "30" }}>
                  <Grip className="h-2.5 w-2.5 mb-1 cursor-grab" style={{ color: card.color + "60" }} />
                  <textarea
                    value={card.text || ""}
                    onChange={e => setCards(prev => prev.map(c => c.id === card.id ? { ...c, text: e.target.value } : c))}
                    onClick={e => e.stopPropagation()}
                    placeholder="Write here..."
                    className="flex-1 bg-transparent border-none text-[10px] text-white/70 resize-none outline-none placeholder:text-white/20"
                  />
                </div>
              )}

              {/* Text Block */}
              {card.type === "text" && (
                <div className="w-full h-full flex items-center cursor-move">
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onClick={e => e.stopPropagation()}
                    onBlur={e => setCards(prev => prev.map(c => c.id === card.id ? { ...c, text: e.currentTarget.textContent || "" } : c))}
                    className="outline-none text-white/80 w-full"
                    style={{ fontSize: card.fontSize || 14, color: card.color || "#fff" }}
                  >{card.text}</span>
                </div>
              )}

              {/* Shape */}
              {card.type === "shape" && (
                <div className="w-full h-full flex items-center justify-center">
                  {card.shape === "rect" && <div className="w-full h-full rounded-md border-2" style={{ borderColor: card.color, backgroundColor: card.color + "15" }} />}
                  {card.shape === "circle" && <div className="w-full h-full rounded-full border-2" style={{ borderColor: card.color, backgroundColor: card.color + "15" }} />}
                  {card.shape === "triangle" && (
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <polygon points="50,5 95,95 5,95" fill={card.color + "15"} stroke={card.color} strokeWidth="2" />
                    </svg>
                  )}
                  {card.shape === "star" && (
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill={card.color + "15"} stroke={card.color} strokeWidth="2" />
                    </svg>
                  )}
                  {card.shape === "diamond" && (
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <polygon points="50,5 95,50 50,95 5,50" fill={card.color + "15"} stroke={card.color} strokeWidth="2" />
                    </svg>
                  )}
                </div>
              )}

              {/* Resize handle */}
              <div
                className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-0 group-hover:opacity-100"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startW = card.width;
                  const startH = card.height;
                  const onMove = (ev: MouseEvent) => {
                    setCards(prev => prev.map(c => c.id === card.id ? {
                      ...c,
                      width: Math.max(80, startW + (ev.clientX - startX) / zoom),
                      height: Math.max(60, startH + (ev.clientY - startY) / zoom),
                    } : c));
                  };
                  const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
              >
                <svg viewBox="0 0 10 10" className="w-full h-full text-white/20"><path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1" /></svg>
              </div>
            </div>
          ))}
        </div>

        {/* Text input overlay */}
        {textPos && (
          <div className="absolute z-50 bg-[hsl(222,35%,9%)] border border-primary/30 rounded-lg p-2 shadow-xl"
            style={{ left: textPos.x * zoom + pan.x, top: textPos.y * zoom + pan.y }}>
            <Input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addTextBlock(); if (e.key === "Escape") setTextPos(null); }}
              placeholder="Type text..."
              className="bg-transparent border-white/[0.06] text-white text-xs h-7 w-48 placeholder:text-white/20" />
            <div className="flex gap-1 mt-1">
              <Button size="sm" onClick={addTextBlock} className="text-[9px] h-5 bg-primary text-primary-foreground"><Check className="h-2.5 w-2.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => setTextPos(null)} className="text-[9px] h-5 border-white/[0.06] text-white/40"><X className="h-2.5 w-2.5" /></Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {cards.length === 0 && strokes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Layers className="h-12 w-12 text-white/[0.05] mx-auto mb-3" />
              <p className="text-white/20 text-sm font-medium">Your creative sandbox</p>
              <p className="text-white/10 text-xs mt-1">Import cards, draw, add notes, and evolve ideas</p>
            </div>
          </div>
        )}

        {/* Linking cursor indicator */}
        {linkingFrom && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-1.5 pointer-events-none">
            <span className="text-xs text-purple-300 flex items-center gap-1.5">
              <Link2 className="h-3 w-3 animate-pulse" /> Click a card to link
            </span>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" /> Import Content Cards
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">Click cards to add them to your sandbox canvas</p>
          <div className="flex gap-1.5 mb-2">
            <Button size="sm" variant="outline" onClick={() => {
              let x = 50, y = 50;
              items.forEach((item, i) => {
                importContentCard(item, x + (i % 4) * 260, y + Math.floor(i / 4) * 180);
              });
              setShowImport(false);
              toast.success(`${items.length} cards imported`);
            }} className="text-xs h-7 border-primary/20 text-primary">
              Import All ({items.length})
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const drafts = items.filter(i => i.status === "draft");
              let x = 50, y = 50;
              drafts.forEach((item, i) => {
                importContentCard(item, x + (i % 4) * 260, y + Math.floor(i / 4) * 180);
              });
              setShowImport(false);
              toast.success(`${drafts.length} drafts imported`);
            }} className="text-xs h-7 border-amber-500/20 text-amber-400">
              Drafts Only ({items.filter(i => i.status === "draft").length})
            </Button>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {items.map(item => {
              const alreadyImported = cards.some(c => c.id === `card-${item.id}`);
              return (
                <div key={item.id}
                  onClick={() => {
                    if (alreadyImported) return;
                    importContentCard(item, 100 + Math.random() * 300, 100 + Math.random() * 200);
                    toast.success(`"${item.title}" added to sandbox`);
                  }}
                  className={`p-2 rounded-lg border transition-all ${alreadyImported
                    ? "bg-white/[0.02] border-white/[0.04] opacity-40 cursor-not-allowed"
                    : "bg-white/[0.03] border-white/[0.06] hover:border-primary/30 cursor-pointer"}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[8px] capitalize ${item.status === "draft" ? "border-amber-500/20 text-amber-400" : item.status === "published" ? "border-emerald-500/20 text-emerald-400" : "border-blue-500/20 text-blue-400"}`}>{item.status}</Badge>
                    <Badge variant="outline" className="text-[8px] border-white/[0.06] text-white/40 capitalize">{item.platform}</Badge>
                    <span className="text-xs text-white flex-1 truncate">{item.title}</span>
                    {alreadyImported && <span className="text-[8px] text-emerald-400">Added</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentSandbox;
