import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, Instagram, Music2, Twitter, Globe, Star } from "lucide-react";

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biolink-track`;

interface BioLinkData {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  avatar_url: string | null;
  theme: string;
  background_color: string | null;
  links: Array<{ title: string; url: string; icon?: string; enabled?: boolean }>;
  of_link: string | null;
  social_links: { instagram?: string; tiktok?: string; twitter?: string } | null;
}

const BioLink = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<BioLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(FUNC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ action: "get_link", slug, referrer: document.referrer, user_agent: navigator.userAgent }),
    })
      .then(r => r.json())
      .then(d => { if (d.data) setData(d.data); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const trackClick = (index: number, url: string) => {
    fetch(FUNC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ action: "track_click", slug, link_index: index, link_url: url, referrer: document.referrer, user_agent: navigator.userAgent }),
    }).catch(() => {});
    window.open(url, "_blank");
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
    </div>
  );

  if (notFound || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">🔗 Link Not Found</h1>
        <p className="text-white/50">This link doesn't exist or has been deactivated.</p>
      </div>
    </div>
  );

  const bgStyle = data.theme === "gradient"
    ? { background: data.background_color || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }
    : data.theme === "light"
    ? { background: "#f8f9fa" }
    : data.theme === "neon"
    ? { background: data.background_color || "#000000" }
    : data.theme === "sunset"
    ? { background: data.background_color || "linear-gradient(135deg, #f97316 0%, #dc2626 100%)" }
    : data.theme === "ocean"
    ? { background: data.background_color || "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)" }
    : { background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)" };

  const textColor = data.theme === "light" ? "text-gray-900" : data.theme === "neon" ? "text-green-400" : "text-white";
  const cardBg = data.theme === "light" ? "bg-white/80 hover:bg-white" : data.theme === "neon" ? "bg-green-500/10 hover:bg-green-500/20 border-green-500/30" : "bg-white/10 hover:bg-white/20";
  const subtextColor = data.theme === "light" ? "text-gray-500" : data.theme === "neon" ? "text-green-300/60" : "text-white/60";

  const enabledLinks = (data.links || []).filter((l: any) => l.enabled !== false);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12" style={bgStyle}>
      <div className="w-full max-w-md space-y-6">
        {/* Avatar & Name */}
        <div className="text-center space-y-3">
          {data.avatar_url ? (
            <img src={data.avatar_url} alt={data.title} className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-pink-500/50 shadow-lg shadow-pink-500/20" />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {data.title.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className={`text-2xl font-bold ${textColor}`}>{data.title}</h1>
          {data.bio && <p className={`text-sm ${subtextColor}`}>{data.bio}</p>}
        </div>

        {/* OF CTA Button */}
        {data.of_link && (
          <button
            onClick={() => trackClick(-1, data.of_link!)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 text-white font-bold text-lg shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Star className="h-5 w-5" />
            Subscribe on OnlyFans
            <ExternalLink className="h-4 w-4" />
          </button>
        )}

        {/* Links */}
        <div className="space-y-3">
          {enabledLinks.map((link: any, i: number) => (
            <button
              key={i}
              onClick={() => trackClick(i, link.url)}
              className={`w-full py-3.5 px-5 rounded-xl ${cardBg} backdrop-blur-sm border border-white/10 ${textColor} font-medium transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between`}
            >
              <span>{link.title}</span>
              <ExternalLink className="h-4 w-4 opacity-50" />
            </button>
          ))}
        </div>

        {/* Social Icons */}
        {data.social_links && (
          <div className="flex justify-center gap-4 pt-4">
            {data.social_links.instagram && (
              <a href={`https://instagram.com/${data.social_links.instagram}`} target="_blank" rel="noopener" className={`p-3 rounded-full ${cardBg} backdrop-blur-sm border border-white/10 ${textColor} transition-all hover:scale-110`}>
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {data.social_links.tiktok && (
              <a href={`https://tiktok.com/@${data.social_links.tiktok}`} target="_blank" rel="noopener" className={`p-3 rounded-full ${cardBg} backdrop-blur-sm border border-white/10 ${textColor} transition-all hover:scale-110`}>
                <Music2 className="h-5 w-5" />
              </a>
            )}
            {data.social_links.twitter && (
              <a href={`https://x.com/${data.social_links.twitter}`} target="_blank" rel="noopener" className={`p-3 rounded-full ${cardBg} backdrop-blur-sm border border-white/10 ${textColor} transition-all hover:scale-110`}>
                <Twitter className="h-5 w-5" />
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8">
          <p className={`text-xs ${subtextColor}`}>Powered by OZC Agency</p>
        </div>
      </div>
    </div>
  );
};

export default BioLink;