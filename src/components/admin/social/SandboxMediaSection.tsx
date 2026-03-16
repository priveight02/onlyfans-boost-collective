import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Download, Maximize, Minimize, Image as ImageIcon, Film, Music, FileImage, RefreshCw, ExternalLink } from "lucide-react";

interface SandboxExport {
  id: string;
  file_name: string;
  file_url: string;
  file_format: string;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  target_platform: string | null;
  metadata: any;
  created_at: string;
}

interface Props {
  platform?: string;
  onUseMedia?: (url: string, name: string) => void;
}

const SandboxMediaSection = ({ platform, onUseMedia }: Props) => {
  const [exports, setExports] = useState<SandboxExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ id: string; w: number; h: number } | null>(null);

  const fetchExports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("sandbox_exports").select("*").order("created_at", { ascending: false });
      if (platform) {
        query = query.or(`target_platform.eq.${platform},target_platform.eq.all,target_platform.is.null`);
      }
      const { data, error } = await query.limit(50);
      if (error) throw error;
      setExports((data as any[]) || []);
    } catch (err: any) {
      console.error("Failed to load sandbox media:", err);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => { fetchExports(); }, [fetchExports]);

  const deleteExport = async (id: string) => {
    const exp = exports.find(e => e.id === id);
    if (!exp) return;
    try {
      const path = exp.file_url.split("/copilot-media/")[1];
      if (path) await supabase.storage.from("copilot-media").remove([path]);
    } catch {}
    const { error } = await supabase.from("sandbox_exports").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    setExports(p => p.filter(e => e.id !== id));
    toast.success("Deleted");
  };

  const downloadExport = (exp: SandboxExport) => {
    const a = document.createElement("a");
    a.href = exp.file_url;
    a.download = exp.file_name;
    a.click();
  };

  if (!exports.length && !loading) return null;

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/[0.06]">
            <FileImage className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">Medias from Uplyze Sandbox</h3>
            <p className="text-[10px] text-muted-foreground">Exported assets ready to use</p>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted/30 rounded-full px-2 py-0.5 border border-border/30">{exports.length}</span>
        </div>
        <Button variant="outline" size="sm" onClick={fetchExports} disabled={loading} className="h-7 text-[10px] gap-1.5 border-border/40 text-muted-foreground">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {exports.map(exp => {
          const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(exp.file_format);
          const isVideo = ["mp4", "webm", "mov"].includes(exp.file_format);
          const isAudio = ["mp3", "wav", "ogg", "m4a"].includes(exp.file_format);
          const isExpanded = expandedId === exp.id;
          const resize = resizing?.id === exp.id ? resizing : null;

          return (
            <Card key={exp.id} className={`bg-card/50 border-border/30 overflow-hidden transition-all hover:border-border/50 ${isExpanded ? "col-span-full" : ""}`}>
              <CardContent className="p-0">
                {/* Preview */}
                <div
                  className="relative bg-muted/20 flex items-center justify-center overflow-hidden cursor-pointer group"
                  style={{ height: isExpanded ? (resize?.h || 400) : 120, width: isExpanded ? (resize?.w || "100%") : "100%" }}
                  onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                >
                  {isImage && <img src={exp.file_url} alt={exp.file_name} className="h-full w-full object-contain" draggable={false} />}
                  {isVideo && <video src={exp.file_url} className="h-full w-full object-contain" preload="metadata" controls={isExpanded} />}
                  {isAudio && (
                    <div className="flex flex-col items-center gap-1 p-2">
                      <Music className="h-6 w-6 text-emerald-400/50" />
                      {isExpanded && <audio src={exp.file_url} controls className="w-full" />}
                    </div>
                  )}
                  {!isImage && !isVideo && !isAudio && (
                    <div className="flex flex-col items-center gap-1 p-2">
                      <FileImage className="h-6 w-6 text-muted-foreground/40" />
                      <span className="text-[9px] text-muted-foreground uppercase">{exp.file_format}</span>
                    </div>
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    {isExpanded ? <Minimize className="h-5 w-5 text-foreground/70" /> : <Maximize className="h-5 w-5 text-foreground/70" />}
                  </div>
                </div>

                {/* Info + Actions */}
                <div className="p-2 space-y-1.5">
                  <p className="text-[10px] text-foreground/60 truncate" title={exp.file_name}>{exp.file_name}</p>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    {exp.width && exp.height && <span>{exp.width}×{exp.height}</span>}
                    <span className="uppercase">{exp.file_format}</span>
                    {exp.file_size_bytes && <span>{(exp.file_size_bytes / 1024).toFixed(0)}KB</span>}
                  </div>

                  {/* Resize controls when expanded */}
                  {isExpanded && (
                    <div className="flex items-center gap-2 mt-1">
                      <label className="text-[9px] text-muted-foreground">W</label>
                      <input type="number" value={resize?.w || exp.width || 400} min={100} max={4000}
                        onChange={e => setResizing({ id: exp.id, w: Number(e.target.value), h: resize?.h || exp.height || 400 })}
                        className="h-5 w-16 rounded border border-border/40 bg-muted/20 text-[10px] text-foreground/70 px-1 outline-none" />
                      <label className="text-[9px] text-muted-foreground">H</label>
                      <input type="number" value={resize?.h || exp.height || 400} min={100} max={4000}
                        onChange={e => setResizing({ id: exp.id, w: resize?.w || exp.width || 400, h: Number(e.target.value) })}
                        className="h-5 w-16 rounded border border-border/40 bg-muted/20 text-[10px] text-foreground/70 px-1 outline-none" />
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    {onUseMedia && (
                      <Button variant="ghost" size="sm" onClick={() => onUseMedia(exp.file_url, exp.file_name)} className="h-6 text-[9px] text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/10 px-1.5">
                        <ExternalLink className="h-3 w-3 mr-0.5" />Use
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => downloadExport(exp)} className="h-6 text-[9px] text-blue-400/80 hover:text-blue-400 hover:bg-blue-500/10 px-1.5">
                      <Download className="h-3 w-3 mr-0.5" />DL
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteExport(exp.id)} className="h-6 text-[9px] text-destructive/70 hover:text-destructive hover:bg-destructive/10 px-1.5 ml-auto">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SandboxMediaSection;
