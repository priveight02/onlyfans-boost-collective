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
    // Delete from storage
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileImage className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white/80">Medias from Uplyze Sandbox</h3>
          <span className="text-[10px] text-white/30 bg-white/5 rounded-full px-2 py-0.5">{exports.length}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchExports} disabled={loading} className="h-7 text-[10px] text-white/40">
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
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
            <Card key={exp.id} className={`bg-white/[0.03] border-white/[0.06] overflow-hidden transition-all ${isExpanded ? "col-span-full" : ""}`}>
              <CardContent className="p-0">
                {/* Preview */}
                <div
                  className="relative bg-black/20 flex items-center justify-center overflow-hidden cursor-pointer group"
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
                      <FileImage className="h-6 w-6 text-white/20" />
                      <span className="text-[9px] text-white/30 uppercase">{exp.file_format}</span>
                    </div>
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    {isExpanded ? <Minimize className="h-5 w-5 text-white/70" /> : <Maximize className="h-5 w-5 text-white/70" />}
                  </div>
                </div>

                {/* Info + Actions */}
                <div className="p-2 space-y-1.5">
                  <p className="text-[10px] text-white/50 truncate" title={exp.file_name}>{exp.file_name}</p>
                  <div className="flex items-center gap-1 text-[9px] text-white/25">
                    {exp.width && exp.height && <span>{exp.width}×{exp.height}</span>}
                    <span className="uppercase">{exp.file_format}</span>
                    {exp.file_size_bytes && <span>{(exp.file_size_bytes / 1024).toFixed(0)}KB</span>}
                  </div>

                  {/* Resize controls when expanded */}
                  {isExpanded && (
                    <div className="flex items-center gap-2 mt-1">
                      <label className="text-[9px] text-white/30">W</label>
                      <input type="number" value={resize?.w || exp.width || 400} min={100} max={4000}
                        onChange={e => setResizing({ id: exp.id, w: Number(e.target.value), h: resize?.h || exp.height || 400 })}
                        className="h-5 w-16 rounded border border-white/10 bg-white/5 text-[10px] text-white/70 px-1 outline-none" />
                      <label className="text-[9px] text-white/30">H</label>
                      <input type="number" value={resize?.h || exp.height || 400} min={100} max={4000}
                        onChange={e => setResizing({ id: exp.id, w: resize?.w || exp.width || 400, h: Number(e.target.value) })}
                        className="h-5 w-16 rounded border border-white/10 bg-white/5 text-[10px] text-white/70 px-1 outline-none" />
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    {onUseMedia && (
                      <Button variant="ghost" size="sm" onClick={() => onUseMedia(exp.file_url, exp.file_name)} className="h-6 text-[9px] text-emerald-400/70 hover:text-emerald-400 px-1.5">
                        <ExternalLink className="h-3 w-3 mr-0.5" />Use
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => downloadExport(exp)} className="h-6 text-[9px] text-blue-400/70 hover:text-blue-400 px-1.5">
                      <Download className="h-3 w-3 mr-0.5" />DL
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteExport(exp.id)} className="h-6 text-[9px] text-red-400/70 hover:text-red-400 px-1.5 ml-auto">
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
