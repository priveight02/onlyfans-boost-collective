import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Twitter, Globe, Phone, Music2, ChevronRight, RefreshCw, Calendar,
  MessageSquare, Send, Search, Users, Heart, Repeat, Bookmark,
  List, Radio, Eye, EyeOff, TrendingUp, Hash, Shield, Bot,
  Megaphone, FileText, Settings, Zap, Brain, Star, Target,
  ArrowUp, ArrowDown, Lock, Unlock, Pin, PinOff, UserPlus, UserMinus,
  Volume2, Image, Video, MapPin, Dice1, Forward, Copy, Trash2,
  Bell, BellOff, Link2, Upload, Play, BarChart3, Activity,
  FolderOpen, Award, Flag, Filter, Layers, Briefcase, Clock,
  Camera, MessageCircle, Smartphone, Youtube, Palette, Gamepad2,
  Instagram, AlertCircle, Mic, Sticker, Contact, ToggleLeft,
} from "lucide-react";

interface Props {
  selectedAccount: string;
  onNavigateToConnect?: (platform: string) => void;
}

const SocialNetworksTab = ({ selectedAccount, onNavigateToConnect }: Props) => {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const setInput = (key: string, val: string) => setInputValues(p => ({ ...p, [key]: val }));
  const getInput = (key: string) => inputValues[key] || "";

  useEffect(() => {
    if (!selectedAccount) return;
    const loadConnections = async () => {
      const { data } = await supabase.from("social_connections").select("platform, is_connected").eq("account_id", selectedAccount);
      setConnectedPlatforms((data || []).filter(c => c.is_connected).map(c => c.platform));
    };
    loadConnections();
    const channel = supabase
      .channel(`networks-conn-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_connections", filter: `account_id=eq.${selectedAccount}` }, () => loadConnections())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  const isConnected = (platform: string) => connectedPlatforms.includes(platform);

  const handlePlatformClick = (platformId: string) => {
    if (!isConnected(platformId)) {
      toast.error(`${platformId} is not connected. Redirecting to Connect tab...`);
      onNavigateToConnect?.(platformId);
      return;
    }
    setExpandedPlatform(expandedPlatform === platformId ? null : platformId);
  };

  const callApi = async (funcName: string, action: string, params: any = {}) => {
    if (!selectedAccount) { toast.error("No account selected"); return null; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(funcName, {
        body: { action, account_id: selectedAccount, params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API call failed");
      setResult(data.data);
      toast.success(`${action} completed`);
      return data.data;
    } catch (e: any) {
      toast.error(e.message || "API error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const iconSize = "h-8 w-8";
  const platformLogos: Record<string, JSX.Element> = {
    instagram: <svg viewBox="0 0 24 24" className={iconSize} fill="none"><defs><linearGradient id="ig" x1="0" y1="24" x2="24" y2="0"><stop offset="0%" stopColor="#feda75"/><stop offset="25%" stopColor="#fa7e1e"/><stop offset="50%" stopColor="#d62976"/><stop offset="75%" stopColor="#962fbf"/><stop offset="100%" stopColor="#4f5bd5"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="url(#ig)" strokeWidth="1.5"/><circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig)"/></svg>,
    twitter: <svg viewBox="0 0 24 24" className={iconSize} fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    reddit: <svg viewBox="0 0 24 24" className={iconSize} fill="#FF4500"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.327.327 0 0 0-.462 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.231-.094z"/></svg>,
    telegram: <svg viewBox="0 0 24 24" className={iconSize} fill="#26A5E4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
    tiktok: <svg viewBox="0 0 24 24" className={iconSize} fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
    snapchat: <svg viewBox="0 0 512 512" className={iconSize} fill="#FFFC00"><path d="M496.926 209.924c-6.678-4.012-13.724-7.322-21.122-9.834-3.86-1.31-7.804-2.388-11.818-3.236-.138-2.238-.244-4.478-.312-6.718-.522-17.396.482-34.994 3.002-52.332 1.756-12.068-2.424-24.336-11.102-32.778C444.706 94.702 430.6 85.49 415.342 79.1 371.652 60.754 324.472 51.5 256.5 51.5c-67.972 0-115.152 9.254-158.842 27.6C82.4 85.49 68.294 94.702 57.426 105.026c-8.678 8.442-12.858 20.71-11.102 32.778 2.52 17.338 3.524 34.936 3.002 52.332-.068 2.24-.174 4.48-.312 6.718-4.014.848-7.958 1.926-11.818 3.236-7.398 2.512-14.444 5.822-21.122 9.834C6.176 215.762 0 226.47 0 238.124c0 11.266 5.706 21.662 15.082 27.77 6.68 4.352 14.054 7.66 21.828 9.79 1.492.41 2.984.78 4.478 1.116.518 2.126 1.124 4.234 1.824 6.316 4.918 14.62 13.632 27.792 25.206 38.074 11.746 10.434 25.924 18.26 41.166 22.622-4.734 6.148-10.4 11.4-16.848 15.492-9.324 5.914-19.85 9.598-30.848 10.804-8.164.894-14.958 6.452-17.404 14.222-2.446 7.77-.224 16.218 5.692 21.618 5.578 5.088 12.122 9.08 19.268 11.758 10.72 4.02 22.148 6.062 33.73 6.062 8.22 0 16.544-.932 24.74-2.768 1.244 7.07 2.922 14.04 5.002 20.88 3.898 12.834 13.692 23.018 27.026 28.096C182.006 481.034 218.226 490.5 256.5 490.5s74.494-9.466 96.048-20.206c13.334-5.078 23.128-15.262 27.026-28.096 2.08-6.84 3.758-13.81 5.002-20.88 8.196 1.836 16.52 2.768 24.74 2.768 11.582 0 23.01-2.042 33.73-6.062 7.146-2.678 13.69-6.67 19.268-11.758 5.916-5.4 8.138-13.848 5.692-21.618-2.446-7.77-9.24-13.328-17.404-14.222-10.998-1.206-21.524-4.89-30.848-10.804-6.448-4.092-12.114-9.344-16.848-15.492 15.242-4.362 29.42-12.188 41.166-22.622 11.574-10.282 20.288-23.454 25.206-38.074.7-2.082 1.306-4.19 1.824-6.316 1.494-.336 2.986-.706 4.478-1.116 7.774-2.13 15.148-5.438 21.828-9.79C506.294 259.786 512 249.39 512 238.124c0-11.654-6.176-22.362-16.074-28.2z"/></svg>,
    threads: <svg viewBox="0 0 192 192" className={iconSize} fill="white"><path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.398c-15.09 0-27.535 6.395-35.182 18.07l13.633 9.358c5.687-8.635 14.52-10.482 21.549-10.482h.266c8.336.048 14.627 2.479 18.697 7.222 2.963 3.449 4.95 8.242 5.95 14.328a93.537 93.537 0 0 0-24.939-2.674c-25.247 0-41.47 13.596-41.47 34.766 0 14.572 8.283 28.07 22.178 36.118 11.79 6.838 26.985 10.045 42.596 9.042 12.758-.82 24.076-4.138 33.617-9.865 7.816-4.69 14.286-11.017 19.231-18.82 6.608-10.43 10.098-23.373 10.098-37.356 0-.633-.016-1.269-.042-1.898 8.247 4.975 13.614 12.318 13.614 21.164 0 26.087-30.292 47.293-67.557 47.293-41.393 0-67.557-24.454-67.557-63.116 0-36.908 27.07-64.95 62.914-65.125h.266c18.705.088 34.473 5.94 45.638 16.925 5.374 5.284 9.552 11.68 12.442 19.036l14.276-5.713c-3.553-9.032-8.786-17.058-15.579-23.743-13.711-13.49-33.002-20.607-55.777-20.71h-.306c-42.34.206-76.85 33.162-76.912 78.87 0 46.217 31.174 77.116 77.557 77.116 43.34 0 81.557-25.676 81.557-61.293 0-18.926-11.368-35.189-29.463-44.862zM97.77 136.054c-15.344-.896-30.893-7.678-30.893-22.672 0-10.312 7.813-21.89 27.47-21.89a80.042 80.042 0 0 1 22.46 3.212c-2.066 24.986-13.705 40.376-19.037 41.35z"/></svg>,
    whatsapp: <svg viewBox="0 0 24 24" className={iconSize} fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
    signal: <svg viewBox="0 0 24 24" className={iconSize} fill="#3A76F0"><path d="M12 1.5C6.202 1.5 1.5 6.202 1.5 12S6.202 22.5 12 22.5 22.5 17.798 22.5 12 17.798 1.5 12 1.5zM.947 15.473l-.72 2.86 2.93-.74A11.946 11.946 0 0 1 0 12C0 5.373 5.373 0 12 0c3.168 0 6.042 1.228 8.19 3.234l-.876.876A10.46 10.46 0 0 0 12 1.5 10.5 10.5 0 0 0 1.5 12c0 2.472.855 4.747 2.286 6.541l-.543 2.156-2.296.776zM12 24c-3.168 0-6.042-1.228-8.19-3.234l.876-.876A10.46 10.46 0 0 0 12 22.5c5.799 0 10.5-4.701 10.5-10.5 0-2.472-.855-4.747-2.286-6.541l.543-2.156 2.296-.776.72-2.86-2.93.74A11.946 11.946 0 0 1 24 12c0 6.627-5.373 12-12 12z"/><path d="M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z"/></svg>,
    youtube: <svg viewBox="0 0 24 24" className={iconSize} fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    pinterest: <svg viewBox="0 0 24 24" className={iconSize} fill="#BD081C"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.174.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026z"/></svg>,
    discord: <svg viewBox="0 0 24 24" className={iconSize} fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>,
    facebook: <svg viewBox="0 0 24 24" className={iconSize} fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    linkedin: <svg viewBox="0 0 24 24" className={iconSize} fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  };

  const platforms = [
    { id: "instagram", name: "Instagram", borderColor: "border-pink-500/30", bgColor: "bg-gradient-to-br from-purple-600/20 to-orange-500/20", funcName: "instagram-api" },
    { id: "twitter", name: "X / Twitter", borderColor: "border-white/20", bgColor: "bg-white/[0.06]", funcName: "twitter-api" },
    { id: "reddit", name: "Reddit", borderColor: "border-orange-500/30", bgColor: "bg-orange-500/10", funcName: "reddit-api" },
    { id: "telegram", name: "Telegram", borderColor: "border-sky-500/30", bgColor: "bg-sky-500/10", funcName: "telegram-api" },
    { id: "tiktok", name: "TikTok", borderColor: "border-white/20", bgColor: "bg-white/[0.06]", funcName: "tiktok-api" },
    { id: "snapchat", name: "Snapchat", borderColor: "border-yellow-500/30", bgColor: "bg-yellow-500/10", funcName: "snapchat-api" },
    { id: "threads", name: "Threads", borderColor: "border-white/20", bgColor: "bg-white/[0.06]", funcName: "threads-api" },
    { id: "whatsapp", name: "WhatsApp", borderColor: "border-green-500/30", bgColor: "bg-green-500/10", funcName: "whatsapp-api" },
    { id: "signal", name: "Signal", borderColor: "border-blue-400/30", bgColor: "bg-blue-400/10", funcName: "signal-api" },
    { id: "youtube", name: "YouTube", borderColor: "border-red-500/30", bgColor: "bg-red-500/10", funcName: "youtube-api" },
    { id: "pinterest", name: "Pinterest", borderColor: "border-red-600/30", bgColor: "bg-red-600/10", funcName: "pinterest-api" },
    { id: "discord", name: "Discord", borderColor: "border-indigo-500/30", bgColor: "bg-indigo-500/10", funcName: "discord-api" },
    { id: "facebook", name: "Facebook", borderColor: "border-blue-500/30", bgColor: "bg-blue-500/10", funcName: "facebook-api" },
    { id: "linkedin", name: "LinkedIn", borderColor: "border-sky-600/30", bgColor: "bg-sky-600/10", funcName: "linkedin-api" },
  ];

  // Visual API response renderer
  const renderVisualResponse = (data: any) => {
    if (!data) return null;
    
    // Handle arrays of items (media, posts, etc.)
    if (Array.isArray(data)) {
      return (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">{data.length} items returned</p>
          {data.slice(0, 20).map((item: any, i: number) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 space-y-1.5">
              {item.caption && <p className="text-xs text-foreground line-clamp-2">{item.caption}</p>}
              {item.text && <p className="text-xs text-foreground line-clamp-2">{item.text}</p>}
              {item.title && <p className="text-xs font-medium text-foreground">{item.title}</p>}
              {item.content && <p className="text-xs text-foreground line-clamp-2">{item.content}</p>}
              {item.message && <p className="text-xs text-foreground">{item.message}</p>}
              {item.name && !item.title && <p className="text-xs font-medium text-foreground">{item.name}</p>}
              {item.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>}
              {item.username && <span className="text-[10px] text-primary">@{item.username}</span>}
              <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                {item.like_count !== undefined && <span>❤ {item.like_count?.toLocaleString()}</span>}
                {item.likes !== undefined && <span>❤ {item.likes?.toLocaleString()}</span>}
                {item.comments_count !== undefined && <span>💬 {item.comments_count?.toLocaleString()}</span>}
                {item.retweet_count !== undefined && <span>🔁 {item.retweet_count?.toLocaleString()}</span>}
                {item.share_count !== undefined && <span>↗ {item.share_count?.toLocaleString()}</span>}
                {item.view_count !== undefined && <span>👁 {item.view_count?.toLocaleString()}</span>}
                {item.follower_count !== undefined && <span>👥 {item.follower_count?.toLocaleString()}</span>}
                {item.followers_count !== undefined && <span>👥 {item.followers_count?.toLocaleString()}</span>}
                {item.subscriber_count !== undefined && <span>👥 {item.subscriber_count?.toLocaleString()}</span>}
                {item.media_count !== undefined && <span>📷 {item.media_count?.toLocaleString()}</span>}
                {item.media_type && <span className="bg-white/[0.06] px-1.5 py-0.5 rounded">{item.media_type}</span>}
                {item.timestamp && <span>{new Date(item.timestamp).toLocaleDateString()}</span>}
                {item.created_at && <span>{new Date(item.created_at).toLocaleDateString()}</span>}
                {item.permalink && <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View ↗</a>}
                {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link ↗</a>}
              </div>
              {item.thumbnail_url && <img src={item.thumbnail_url} alt="" className="h-16 w-16 object-cover rounded mt-1" />}
              {item.media_url && <img src={item.media_url} alt="" className="h-16 w-16 object-cover rounded mt-1" />}
            </div>
          ))}
        </div>
      );
    }
    
    // Handle objects with nested data array
    if (data?.data && Array.isArray(data.data)) {
      return renderVisualResponse(data.data);
    }
    
    // Handle single object (profile, insights, etc.)
    if (typeof data === "object" && data !== null) {
      const entries = Object.entries(data).filter(([_, v]) => v !== null && v !== undefined);
      if (entries.length === 0) return <p className="text-xs text-muted-foreground">Empty response</p>;
      
      return (
        <div className="space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
              <span className="text-[10px] font-mono text-primary min-w-[100px] shrink-0">{key}</span>
              <span className="text-xs text-foreground break-all">
                {typeof value === "object" ? (
                  <span className="text-muted-foreground font-mono text-[10px]">{JSON.stringify(value, null, 1)}</span>
                ) : typeof value === "number" ? (
                  <span className="font-semibold">{value.toLocaleString()}</span>
                ) : typeof value === "boolean" ? (
                  <span className={value ? "text-green-400" : "text-red-400"}>{value ? "Yes" : "No"}</span>
                ) : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    
    // Fallback for primitives
    return <p className="text-xs text-foreground">{String(data)}</p>;
  };

  const renderActionButton = (label: string, funcName: string, action: string, params: any = {}, icon?: any) => {
    const Icon = icon || Zap;
    return (
      <Button size="sm" variant="outline" onClick={() => callApi(funcName, action, params)} disabled={loading} className="text-xs h-8 gap-1 text-foreground border-border hover:bg-muted/50">
        <Icon className="h-3 w-3" />{label}
      </Button>
    );
  };

  const renderInputAction = (label: string, funcName: string, action: string, inputKeys: { key: string; placeholder: string; type?: string }[], buildParams: () => any, icon?: any) => {
    const Icon = icon || Send;
    return (
      <div className="space-y-1.5 p-2.5 bg-muted/20 rounded-lg border border-border">
        <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">{label}</p>
        <div className="flex gap-1.5 flex-wrap">
          {inputKeys.map(ik => (
            <Input key={ik.key} value={getInput(ik.key)} onChange={e => setInput(ik.key, e.target.value)} placeholder={ik.placeholder} type={ik.type || "text"} className="text-xs h-7 flex-1 min-w-[120px] bg-background border-border text-foreground placeholder:text-muted-foreground" />
          ))}
          <Button size="sm" variant="default" onClick={() => callApi(funcName, action, buildParams())} disabled={loading} className="text-xs h-7 gap-1 text-primary-foreground">
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}Go
          </Button>
        </div>
      </div>
    );
  };

  // ===== INSTAGRAM =====
  const renderInstagramContent = () => (
    <Tabs defaultValue="media" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"media",l:"Media",icon:Image},{v:"publish",l:"Publish",icon:Upload},{v:"stories",l:"Stories",icon:Play},{v:"comments",l:"Comments",icon:MessageSquare},{v:"dms",l:"DMs",icon:Send},{v:"insights",l:"Insights",icon:BarChart3},{v:"discovery",l:"Discovery",icon:Search},{v:"hashtags",l:"Hashtags",icon:Hash},{v:"ai",l:"AI Auto",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="media" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Profile","instagram-api","get_profile",{},Users)}
          {renderActionButton("My Media","instagram-api","get_media",{limit:25},Image)}
          {renderActionButton("Stories","instagram-api","get_stories",{},Play)}
        </div>
        {renderInputAction("Get Media","instagram-api","get_media_by_id",[{key:"ig_media_id",placeholder:"Media ID"}],()=>({media_id:getInput("ig_media_id")}),Eye)}
        {renderInputAction("Children (Carousel)","instagram-api","get_media_children",[{key:"ig_carousel_id",placeholder:"Carousel ID"}],()=>({media_id:getInput("ig_carousel_id")}),Layers)}
      </TabsContent>
      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Photo Post","instagram-api","create_photo_post",[{key:"ig_ph_url",placeholder:"Image URL"},{key:"ig_ph_cap",placeholder:"Caption"}],()=>({image_url:getInput("ig_ph_url"),caption:getInput("ig_ph_cap")}),Image)}
        {renderInputAction("Carousel Post","instagram-api","create_carousel_post",[{key:"ig_car_urls",placeholder:"Image URLs (comma sep)"},{key:"ig_car_cap",placeholder:"Caption"}],()=>({image_urls:getInput("ig_car_urls").split(",").map(s=>s.trim()),caption:getInput("ig_car_cap")}),Layers)}
        {renderInputAction("Reel","instagram-api","create_reel",[{key:"ig_reel_url",placeholder:"Video URL"},{key:"ig_reel_cap",placeholder:"Caption"},{key:"ig_reel_cover",placeholder:"Cover URL (optional)"}],()=>({video_url:getInput("ig_reel_url"),caption:getInput("ig_reel_cap"),cover_url:getInput("ig_reel_cover")}),Video)}
        {renderInputAction("Story (Image)","instagram-api","create_story",[{key:"ig_st_url",placeholder:"Image URL"}],()=>({image_url:getInput("ig_st_url")}),Play)}
        {renderInputAction("Story (Video)","instagram-api","create_video_story",[{key:"ig_stv_url",placeholder:"Video URL"}],()=>({video_url:getInput("ig_stv_url")}),Video)}
      </TabsContent>
      <TabsContent value="stories" className="space-y-2 mt-3">
        {renderActionButton("My Stories","instagram-api","get_stories",{},Play)}
        {renderInputAction("Story Insights","instagram-api","get_story_insights",[{key:"ig_si_id",placeholder:"Story ID"}],()=>({story_id:getInput("ig_si_id")}),BarChart3)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments","instagram-api","get_comments",[{key:"ig_cmt_media",placeholder:"Media ID"}],()=>({media_id:getInput("ig_cmt_media"),limit:50}),MessageSquare)}
        {renderInputAction("Reply","instagram-api","reply_to_comment",[{key:"ig_rply_cmt",placeholder:"Comment ID"},{key:"ig_rply_text",placeholder:"Reply..."}],()=>({comment_id:getInput("ig_rply_cmt"),message:getInput("ig_rply_text")}),Send)}
        {renderInputAction("Delete Comment","instagram-api","delete_comment",[{key:"ig_del_cmt",placeholder:"Comment ID"}],()=>({comment_id:getInput("ig_del_cmt")}),Trash2)}
        {renderInputAction("Hide Comment","instagram-api","hide_comment",[{key:"ig_hide_cmt",placeholder:"Comment ID"}],()=>({comment_id:getInput("ig_hide_cmt")}),EyeOff)}
      </TabsContent>
      <TabsContent value="dms" className="space-y-2 mt-3">
        {renderActionButton("Conversations","instagram-api","get_conversations",{limit:20},MessageSquare)}
        {renderInputAction("Get Messages","instagram-api","get_messages",[{key:"ig_conv_id",placeholder:"Conversation ID"}],()=>({conversation_id:getInput("ig_conv_id")}),MessageSquare)}
        {renderInputAction("Send DM","instagram-api","send_dm",[{key:"ig_dm_to",placeholder:"Recipient ID"},{key:"ig_dm_text",placeholder:"Message..."}],()=>({recipient_id:getInput("ig_dm_to"),message:getInput("ig_dm_text")}),Send)}
        {renderInputAction("Send Image DM","instagram-api","send_dm_image",[{key:"ig_dmi_to",placeholder:"Recipient ID"},{key:"ig_dmi_url",placeholder:"Image URL"}],()=>({recipient_id:getInput("ig_dmi_to"),image_url:getInput("ig_dmi_url")}),Image)}
      </TabsContent>
      <TabsContent value="insights" className="space-y-2 mt-3">
        {renderActionButton("Account Insights (Day)","instagram-api","get_account_insights",{period:"day"},BarChart3)}
        {renderActionButton("Account Insights (Week)","instagram-api","get_account_insights",{period:"week"},BarChart3)}
        {renderActionButton("Demographics","instagram-api","get_account_insights_demographics",{},Users)}
        {renderActionButton("Online Followers","instagram-api","get_account_insights_online_followers",{},Clock)}
        {renderInputAction("Media Insights","instagram-api","get_media_insights",[{key:"ig_mi_id",placeholder:"Media ID"}],()=>({media_id:getInput("ig_mi_id")}),BarChart3)}
        {renderInputAction("Reel Insights","instagram-api","get_reel_insights",[{key:"ig_ri_id",placeholder:"Reel ID"}],()=>({media_id:getInput("ig_ri_id")}),Video)}
      </TabsContent>
      <TabsContent value="discovery" className="space-y-2 mt-3">
        {renderInputAction("Discover User","instagram-api","discover_user",[{key:"ig_disc_user",placeholder:"@username"}],()=>({username:getInput("ig_disc_user")}),Search)}
        {renderInputAction("User Media","instagram-api","discover_user_media",[{key:"ig_disc_uid",placeholder:"User ID"}],()=>({user_id:getInput("ig_disc_uid"),limit:12}),Image)}
        {renderInputAction("Hashtag Search","instagram-api","search_hashtag",[{key:"ig_ht_q",placeholder:"Hashtag (no #)"}],()=>({hashtag:getInput("ig_ht_q")}),Hash)}
      </TabsContent>
      <TabsContent value="hashtags" className="space-y-2 mt-3">
        {renderInputAction("Hashtag ID","instagram-api","search_hashtag",[{key:"ig_htid_q",placeholder:"Hashtag"}],()=>({hashtag:getInput("ig_htid_q")}),Hash)}
        {renderInputAction("Top Media","instagram-api","get_hashtag_top_media",[{key:"ig_ht_top_id",placeholder:"Hashtag ID"}],()=>({hashtag_id:getInput("ig_ht_top_id")}),TrendingUp)}
        {renderInputAction("Recent Media","instagram-api","get_hashtag_recent_media",[{key:"ig_ht_rec_id",placeholder:"Hashtag ID"}],()=>({hashtag_id:getInput("ig_ht_rec_id")}),Clock)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Caption","social-ai-responder","generate_caption",[{key:"ai_ig_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_ig_topic"),platform:"instagram",include_cta:true}),Brain)}
        {renderInputAction("AI DM Reply","social-ai-responder","generate_dm_reply",[{key:"ai_ig_dm",placeholder:"Incoming DM text..."}],()=>({message_text:getInput("ai_ig_dm"),sender_name:"fan"}),Zap)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_ig_cmt_text",placeholder:"Comment text..."}],()=>({message_text:getInput("ai_ig_cmt_text"),sender_name:"commenter"}),MessageSquare)}
        {renderInputAction("AI Hashtag Gen","social-ai-responder","generate_caption",[{key:"ai_ig_ht_topic",placeholder:"Niche/Topic for hashtags"}],()=>({topic:`Generate 30 relevant hashtags for: ${getInput("ai_ig_ht_topic")}`,platform:"instagram",include_cta:false}),Hash)}
        {renderInputAction("AI Bio Writer","social-ai-responder","generate_caption",[{key:"ai_ig_bio_topic",placeholder:"Describe your brand/niche"}],()=>({topic:`Write a compelling Instagram bio for: ${getInput("ai_ig_bio_topic")}`,platform:"instagram",include_cta:false}),Users)}
        {renderInputAction("AI Story Ideas","social-ai-responder","generate_caption",[{key:"ai_ig_story_topic",placeholder:"Topic for stories"}],()=>({topic:`Generate 10 Instagram story ideas for: ${getInput("ai_ig_story_topic")}`,platform:"instagram",include_cta:false}),Play)}
        {renderInputAction("AI Reel Script","social-ai-responder","generate_caption",[{key:"ai_ig_reel",placeholder:"Reel topic"}],()=>({topic:`Write a viral Instagram Reel script (15-30 sec) with hook, content, CTA for: ${getInput("ai_ig_reel")}`,platform:"instagram",include_cta:true}),Video)}
        {renderInputAction("AI Content Calendar","social-ai-responder","generate_caption",[{key:"ai_ig_cal",placeholder:"Niche for 7-day plan"}],()=>({topic:`Create a 7-day Instagram content calendar with post types and captions for: ${getInput("ai_ig_cal")}`,platform:"instagram",include_cta:false}),Calendar)}
      </TabsContent>
    </Tabs>
  );

  // ===== TWITTER =====
  const renderTwitterContent = () => (
    <Tabs defaultValue="tweets" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"tweets",l:"Tweets",icon:MessageSquare},{v:"engage",l:"Engage",icon:Heart},{v:"social",l:"Social",icon:Users},{v:"moderate",l:"Moderate",icon:Shield},{v:"dms",l:"DMs",icon:Send},{v:"lists",l:"Lists",icon:List},{v:"search",l:"Search",icon:Search},{v:"spaces",l:"Spaces",icon:Radio},{v:"ai",l:"AI Auto",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="tweets" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Tweets","twitter-api","get_tweets",{limit:20},MessageSquare)}
          {renderActionButton("Timeline","twitter-api","get_home_timeline",{limit:20},Layers)}
          {renderActionButton("Mentions","twitter-api","get_mentions",{limit:20},Bell)}
        </div>
        {renderInputAction("Create Tweet","twitter-api","create_tweet",[{key:"tweet_text",placeholder:"What's happening?"}],()=>({text:getInput("tweet_text")}),Send)}
        {renderInputAction("Reply","twitter-api","create_tweet",[{key:"reply_to_id",placeholder:"Tweet ID"},{key:"reply_text",placeholder:"Reply..."}],()=>({text:getInput("reply_text"),reply_to:getInput("reply_to_id")}),MessageSquare)}
        {renderInputAction("Quote","twitter-api","create_tweet",[{key:"qt_id",placeholder:"Tweet ID"},{key:"qt_text",placeholder:"Comment..."}],()=>({text:getInput("qt_text"),quote_tweet_id:getInput("qt_id")}),Repeat)}
        {renderInputAction("Tweet w/ Poll","twitter-api","create_tweet",[{key:"poll_text",placeholder:"Question"},{key:"poll_opts",placeholder:"Options (comma sep)"},{key:"poll_dur",placeholder:"Duration min (1440)"}],()=>({text:getInput("poll_text"),poll:{options:getInput("poll_opts").split(",").map(s=>s.trim()),duration_minutes:parseInt(getInput("poll_dur")||"1440")}}),BarChart3)}
        {renderInputAction("Get Tweet","twitter-api","get_tweet_by_id",[{key:"view_tweet_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("view_tweet_id")}),Eye)}
        {renderInputAction("Get Multiple Tweets","twitter-api","get_tweets_by_ids",[{key:"multi_tweet_ids",placeholder:"Tweet IDs (comma sep)"}],()=>({tweet_ids:getInput("multi_tweet_ids").split(",").map(s=>s.trim())}),Layers)}
        {renderInputAction("Delete","twitter-api","delete_tweet",[{key:"del_tweet_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("del_tweet_id")}),Trash2)}
        {renderInputAction("Hide Reply","twitter-api","hide_reply",[{key:"hide_tweet_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("hide_tweet_id")}),EyeOff)}
      </TabsContent>
      <TabsContent value="engage" className="space-y-2 mt-3">
        {renderInputAction("Like","twitter-api","like_tweet",[{key:"like_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("like_id")}),Heart)}
        {renderInputAction("Unlike","twitter-api","unlike_tweet",[{key:"unlike_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("unlike_id")}),Heart)}
        {renderInputAction("Retweet","twitter-api","retweet",[{key:"rt_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("rt_id")}),Repeat)}
        {renderInputAction("Unretweet","twitter-api","unretweet",[{key:"urt_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("urt_id")}),Repeat)}
        {renderInputAction("Bookmark","twitter-api","bookmark_tweet",[{key:"bm_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("bm_id")}),Bookmark)}
        {renderInputAction("Remove Bookmark","twitter-api","remove_bookmark",[{key:"rbm_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("rbm_id")}),Bookmark)}
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Likes","twitter-api","get_liked_tweets",{limit:20},Heart)}
          {renderActionButton("Bookmarks","twitter-api","get_bookmarks",{limit:20},Bookmark)}
        </div>
        {renderInputAction("Who Liked","twitter-api","get_liking_users",[{key:"liking_tid",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("liking_tid"),limit:100}),Users)}
        {renderInputAction("Who Retweeted","twitter-api","get_retweeters",[{key:"rt_users_tid",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("rt_users_tid"),limit:100}),Users)}
        {renderInputAction("Quote Tweets","twitter-api","get_quote_tweets",[{key:"qt_users_tid",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("qt_users_tid"),limit:10}),Repeat)}
      </TabsContent>
      <TabsContent value="social" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Profile","twitter-api","get_profile",{},Users)}
          {renderActionButton("Followers","twitter-api","get_followers",{limit:100},Users)}
          {renderActionButton("Following","twitter-api","get_following",{limit:100},UserPlus)}
        </div>
        {renderInputAction("Lookup User","twitter-api","get_user_by_username",[{key:"x_lookup",placeholder:"Username"}],()=>({username:getInput("x_lookup")}),Search)}
        {renderInputAction("User by ID","twitter-api","get_user_by_id",[{key:"x_uid",placeholder:"User ID"}],()=>({user_id:getInput("x_uid")}),Eye)}
        {renderInputAction("Multiple Users","twitter-api","get_users_by_ids",[{key:"x_uids",placeholder:"User IDs (comma sep)"}],()=>({user_ids:getInput("x_uids").split(",").map(s=>s.trim())}),Users)}
        {renderInputAction("Follow","twitter-api","follow_user",[{key:"follow_uid",placeholder:"User ID"}],()=>({target_user_id:getInput("follow_uid")}),UserPlus)}
        {renderInputAction("Unfollow","twitter-api","unfollow_user",[{key:"unfollow_uid",placeholder:"User ID"}],()=>({target_user_id:getInput("unfollow_uid")}),UserMinus)}
      </TabsContent>
      <TabsContent value="moderate" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Blocked","twitter-api","get_blocked_users",{limit:100},Shield)}
          {renderActionButton("Muted","twitter-api","get_muted_users",{limit:100},BellOff)}
        </div>
        {renderInputAction("Block","twitter-api","block_user",[{key:"block_uid",placeholder:"User ID"}],()=>({target_user_id:getInput("block_uid")}),Shield)}
        {renderInputAction("Unblock","twitter-api","unblock_user",[{key:"unblock_uid",placeholder:"User ID"}],()=>({target_user_id:getInput("unblock_uid")}),Shield)}
        {renderInputAction("Mute","twitter-api","mute_user",[{key:"mute_uid",placeholder:"User ID"}],()=>({target_user_id:getInput("mute_uid")}),BellOff)}
        {renderInputAction("Unmute","twitter-api","unmute_user",[{key:"unmute_uid",placeholder:"User ID"}],()=>({target_user_id:getInput("unmute_uid")}),Bell)}
      </TabsContent>
      <TabsContent value="dms" className="space-y-2 mt-3">
        {renderActionButton("DM Events","twitter-api","get_dm_events",{limit:20},MessageSquare)}
        {renderInputAction("DM Conversation","twitter-api","get_dm_conversation",[{key:"dm_conv_id",placeholder:"Conversation ID"}],()=>({conversation_id:getInput("dm_conv_id"),limit:20}),MessageSquare)}
        {renderInputAction("DMs with User","twitter-api","get_dm_conversation_with_user",[{key:"dm_part_id",placeholder:"User ID"}],()=>({participant_id:getInput("dm_part_id"),limit:20}),Users)}
        {renderInputAction("Send DM","twitter-api","send_dm",[{key:"dm_to",placeholder:"User ID"},{key:"dm_text",placeholder:"Message..."}],()=>({recipient_id:getInput("dm_to"),text:getInput("dm_text")}),Send)}
        {renderInputAction("Send to Conversation","twitter-api","send_dm",[{key:"dm_conv_send",placeholder:"Conversation ID"},{key:"dm_conv_text",placeholder:"Message..."}],()=>({conversation_id:getInput("dm_conv_send"),text:getInput("dm_conv_text")}),Send)}
      </TabsContent>
      <TabsContent value="lists" className="space-y-2 mt-3">
        {renderActionButton("My Lists","twitter-api","get_owned_lists",{limit:25},List)}
        {renderInputAction("Create List","twitter-api","create_list",[{key:"list_name",placeholder:"Name"},{key:"list_desc",placeholder:"Description"}],()=>({name:getInput("list_name"),description:getInput("list_desc")}),List)}
        {renderInputAction("Get List","twitter-api","get_list",[{key:"list_id",placeholder:"List ID"}],()=>({list_id:getInput("list_id")}),Eye)}
        {renderInputAction("List Members","twitter-api","get_list_members",[{key:"lm_id",placeholder:"List ID"}],()=>({list_id:getInput("lm_id"),limit:100}),Users)}
        {renderInputAction("Add Member","twitter-api","add_list_member",[{key:"alm_lid",placeholder:"List ID"},{key:"alm_uid",placeholder:"User ID"}],()=>({list_id:getInput("alm_lid"),user_id:getInput("alm_uid")}),UserPlus)}
        {renderInputAction("Remove Member","twitter-api","remove_list_member",[{key:"rlm_lid",placeholder:"List ID"},{key:"rlm_uid",placeholder:"User ID"}],()=>({list_id:getInput("rlm_lid"),user_id:getInput("rlm_uid")}),UserMinus)}
        {renderInputAction("Delete List","twitter-api","delete_list",[{key:"dl_id",placeholder:"List ID"}],()=>({list_id:getInput("dl_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search Recent","twitter-api","search",[{key:"x_search_q",placeholder:"Query..."}],()=>({query:getInput("x_search_q"),limit:20}),Search)}
        {renderInputAction("Search All (Academic)","twitter-api","search_all",[{key:"x_search_all",placeholder:"Query..."}],()=>({query:getInput("x_search_all"),limit:10}),Search)}
      </TabsContent>
      <TabsContent value="spaces" className="space-y-2 mt-3">
        {renderInputAction("Get Space","twitter-api","get_space",[{key:"space_id",placeholder:"Space ID"}],()=>({space_id:getInput("space_id")}),Radio)}
        {renderInputAction("Search Spaces","twitter-api","search_spaces",[{key:"space_query",placeholder:"Query"}],()=>({query:getInput("space_query"),state:"live"}),Search)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Tweet","social-ai-responder","generate_caption",[{key:"ai_x_topic",placeholder:"Topic/niche"}],()=>({topic:getInput("ai_x_topic"),platform:"twitter",include_cta:true}),Brain)}
        {renderInputAction("AI Reply","social-ai-responder","generate_dm_reply",[{key:"ai_x_mention",placeholder:"Mention text..."}],()=>({message_text:getInput("ai_x_mention"),sender_name:"mention"}),Zap)}
        {renderInputAction("AI DM Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_x_dm",placeholder:"Incoming DM text..."}],()=>({message_text:getInput("ai_x_dm"),sender_name:"follower"}),Send)}
        {renderInputAction("AI Thread Writer","social-ai-responder","generate_caption",[{key:"ai_x_thread",placeholder:"Topic for thread (10 tweets)"}],()=>({topic:`Write a viral Twitter/X thread (10 tweets) about: ${getInput("ai_x_thread")}`,platform:"twitter",include_cta:true}),Layers)}
        {renderInputAction("AI Hashtag Gen","social-ai-responder","generate_caption",[{key:"ai_x_ht",placeholder:"Niche/topic"}],()=>({topic:`Generate 15 trending Twitter hashtags for: ${getInput("ai_x_ht")}`,platform:"twitter",include_cta:false}),Hash)}
        {renderInputAction("AI Bio Writer","social-ai-responder","generate_caption",[{key:"ai_x_bio",placeholder:"Describe your brand"}],()=>({topic:`Write a compelling X/Twitter bio (160 chars) for: ${getInput("ai_x_bio")}`,platform:"twitter",include_cta:false}),Users)}
        {renderInputAction("AI Engagement Bait","social-ai-responder","generate_caption",[{key:"ai_x_engage",placeholder:"Niche"}],()=>({topic:`Write 5 high-engagement tweet ideas (polls, questions, hot takes) for: ${getInput("ai_x_engage")}`,platform:"twitter",include_cta:false}),TrendingUp)}
        {renderInputAction("AI Content Calendar","social-ai-responder","generate_caption",[{key:"ai_x_cal",placeholder:"Niche for 7-day plan"}],()=>({topic:`Create a 7-day Twitter content calendar with tweet ideas for: ${getInput("ai_x_cal")}`,platform:"twitter",include_cta:false}),Calendar)}
      </TabsContent>
    </Tabs>
  );

  // ===== REDDIT =====
  const renderRedditContent = () => (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"posts",l:"Posts",icon:FileText},{v:"comments",l:"Comments",icon:MessageSquare},{v:"subs",l:"Subreddits",icon:Hash},{v:"browse",l:"Browse",icon:TrendingUp},{v:"messages",l:"Messages",icon:Send},{v:"mod",l:"Mod",icon:Shield},{v:"profile",l:"Profile",icon:Users},{v:"search",l:"Search",icon:Search},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="posts" className="space-y-2 mt-3">
        {renderActionButton("My Posts","reddit-api","get_posts",{limit:25},FileText)}
        {renderInputAction("Submit Text","reddit-api","submit_post",[{key:"r_sub",placeholder:"Subreddit"},{key:"r_title",placeholder:"Title"},{key:"r_text",placeholder:"Body"}],()=>({subreddit:getInput("r_sub"),title:getInput("r_title"),text:getInput("r_text"),kind:"self"}),Send)}
        {renderInputAction("Submit Link","reddit-api","submit_post",[{key:"r_link_sub",placeholder:"Subreddit"},{key:"r_link_title",placeholder:"Title"},{key:"r_link_url",placeholder:"URL"}],()=>({subreddit:getInput("r_link_sub"),title:getInput("r_link_title"),url:getInput("r_link_url"),kind:"link"}),Link2)}
        {renderInputAction("Crosspost","reddit-api","crosspost",[{key:"r_xp_sub",placeholder:"Target Subreddit"},{key:"r_xp_title",placeholder:"Title"},{key:"r_xp_fn",placeholder:"Original fullname (t3_...)"}],()=>({subreddit:getInput("r_xp_sub"),title:getInput("r_xp_title"),crosspost_fullname:getInput("r_xp_fn")}),Forward)}
        {renderInputAction("Edit Post","reddit-api","edit_post",[{key:"r_ep_id",placeholder:"Thing ID (t3_...)"},{key:"r_ep_text",placeholder:"New body"}],()=>({thing_id:getInput("r_ep_id"),text:getInput("r_ep_text")}),FileText)}
        {renderInputAction("Delete Post","reddit-api","delete_post",[{key:"r_dp_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_dp_id")}),Trash2)}
        {renderInputAction("Vote","reddit-api","vote",[{key:"r_vote_id",placeholder:"Thing ID"},{key:"r_vote_dir",placeholder:"1/-1/0"}],()=>({thing_id:getInput("r_vote_id"),direction:parseInt(getInput("r_vote_dir")||"1")}),ArrowUp)}
        {renderInputAction("Hide","reddit-api","hide_post",[{key:"r_hide_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_hide_id")}),EyeOff)}
        {renderInputAction("Save","reddit-api","save_post",[{key:"r_save_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_save_id")}),Bookmark)}
        {renderInputAction("NSFW","reddit-api","mark_nsfw",[{key:"r_nsfw_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_nsfw_id")}),AlertCircle)}
        {renderInputAction("Spoiler","reddit-api","set_spoiler",[{key:"r_spoiler_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_spoiler_id")}),EyeOff)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Comments","reddit-api","get_comments",[{key:"r_cmt_post",placeholder:"Post ID"},{key:"r_cmt_sort",placeholder:"Sort (best/new/top)"}],()=>({post_id:getInput("r_cmt_post"),limit:50,sort:getInput("r_cmt_sort")||"best"}),MessageSquare)}
        {renderInputAction("Reply","reddit-api","submit_comment",[{key:"r_reply_id",placeholder:"Thing ID"},{key:"r_reply_text",placeholder:"Reply..."}],()=>({thing_id:getInput("r_reply_id"),text:getInput("r_reply_text")}),Send)}
        {renderInputAction("Edit Comment","reddit-api","edit_comment",[{key:"r_ec_id",placeholder:"Thing ID"},{key:"r_ec_text",placeholder:"New text"}],()=>({thing_id:getInput("r_ec_id"),text:getInput("r_ec_text")}),FileText)}
        {renderInputAction("Delete Comment","reddit-api","delete_comment",[{key:"r_dc_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_dc_id")}),Trash2)}
        {renderInputAction("My Comments","reddit-api","get_user_comments",[{key:"r_mc_sort",placeholder:"Sort (new/top)"}],()=>({sort:getInput("r_mc_sort")||"new",limit:25}),MessageSquare)}
      </TabsContent>
      <TabsContent value="subs" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Subs","reddit-api","get_my_subreddits",{limit:25},Hash)}
          {renderActionButton("Popular","reddit-api","get_popular_subreddits",{limit:25},TrendingUp)}
          {renderActionButton("New Subs","reddit-api","get_new_subreddits",{limit:25},Clock)}
        </div>
        {renderInputAction("Subreddit Info","reddit-api","get_subreddit",[{key:"r_si_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_si_sub")}),Eye)}
        {renderInputAction("Rules","reddit-api","get_subreddit_rules",[{key:"r_sr_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_sr_sub")}),Flag)}
        {renderInputAction("Subscribe","reddit-api","subscribe",[{key:"r_sub_join",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_sub_join")}),UserPlus)}
        {renderInputAction("Unsubscribe","reddit-api","unsubscribe",[{key:"r_unsub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_unsub")}),UserMinus)}
      </TabsContent>
      <TabsContent value="browse" className="space-y-2 mt-3">
        {renderInputAction("Hot","reddit-api","get_subreddit_hot",[{key:"r_hot_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_hot_sub"),limit:25}),TrendingUp)}
        {renderInputAction("New","reddit-api","get_subreddit_new",[{key:"r_new_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_new_sub"),limit:25}),Clock)}
        {renderInputAction("Top","reddit-api","get_subreddit_top",[{key:"r_top_sub",placeholder:"Subreddit"},{key:"r_top_time",placeholder:"Time (day/week/month/year/all)"}],()=>({subreddit:getInput("r_top_sub"),limit:25,time:getInput("r_top_time")||"day"}),ArrowUp)}
        {renderInputAction("Rising","reddit-api","get_subreddit_rising",[{key:"r_rise_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_rise_sub"),limit:25}),TrendingUp)}
        {renderInputAction("Controversial","reddit-api","get_subreddit_controversial",[{key:"r_cont_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_cont_sub"),limit:25}),AlertCircle)}
      </TabsContent>
      <TabsContent value="messages" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Inbox","reddit-api","get_inbox",{limit:25},Send)}
          {renderActionButton("Unread","reddit-api","get_unread",{limit:25},Bell)}
          {renderActionButton("Sent","reddit-api","get_sent",{limit:25},Forward)}
          {renderActionButton("Mark All Read","reddit-api","mark_all_read",{},Eye)}
        </div>
        {renderInputAction("Send Message","reddit-api","send_message",[{key:"r_msg_to",placeholder:"Username"},{key:"r_msg_subj",placeholder:"Subject"},{key:"r_msg_text",placeholder:"Body"}],()=>({to:getInput("r_msg_to"),subject:getInput("r_msg_subj"),text:getInput("r_msg_text")}),Send)}
      </TabsContent>
      <TabsContent value="mod" className="space-y-2 mt-3">
        {renderInputAction("Mod Queue","reddit-api","get_modqueue",[{key:"r_mq_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_mq_sub"),limit:25}),Filter)}
        {renderInputAction("Reports","reddit-api","get_reports",[{key:"r_rep_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_rep_sub"),limit:25}),Flag)}
        {renderInputAction("Spam","reddit-api","get_spam",[{key:"r_spam_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_spam_sub"),limit:25}),AlertCircle)}
        {renderInputAction("Mod Log","reddit-api","get_modlog",[{key:"r_ml_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_ml_sub"),limit:25}),Activity)}
        {renderInputAction("Approve","reddit-api","approve",[{key:"r_appr_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_appr_id")}),Zap)}
        {renderInputAction("Remove","reddit-api","remove",[{key:"r_rem_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_rem_id")}),Trash2)}
        {renderInputAction("Lock","reddit-api","lock",[{key:"r_lock_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_lock_id")}),Lock)}
        {renderInputAction("Unlock","reddit-api","unlock",[{key:"r_unlock_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_unlock_id")}),Unlock)}
        {renderInputAction("Sticky","reddit-api","set_sticky",[{key:"r_sticky_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_sticky_id")}),Pin)}
        {renderInputAction("Distinguish","reddit-api","distinguish",[{key:"r_dist_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_dist_id")}),Award)}
        {renderInputAction("Flair","reddit-api","get_flair",[{key:"r_flair_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_flair_sub")}),Star)}
      </TabsContent>
      <TabsContent value="profile" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Profile","reddit-api","get_profile",{},Users)}
          {renderActionButton("Karma","reddit-api","get_karma",{},ArrowUp)}
          {renderActionButton("Trophies","reddit-api","get_trophies",{},Award)}
          {renderActionButton("Prefs","reddit-api","get_prefs",{},Settings)}
          {renderActionButton("Friends","reddit-api","get_friends",{},UserPlus)}
          {renderActionButton("Blocked","reddit-api","get_blocked",{},Shield)}
        </div>
        {renderInputAction("User About","reddit-api","get_user_about",[{key:"r_ua_name",placeholder:"Username"}],()=>({username:getInput("r_ua_name")}),Eye)}
        {renderInputAction("User Posts","reddit-api","get_user_posts",[{key:"r_up_name",placeholder:"Username"}],()=>({username:getInput("r_up_name"),limit:25}),FileText)}
        {renderInputAction("User Overview","reddit-api","get_user_overview",[{key:"r_uo_name",placeholder:"Username"}],()=>({username:getInput("r_uo_name"),limit:25}),Activity)}
        {renderActionButton("My Upvoted","reddit-api","get_user_upvoted",{limit:25},ArrowUp)}
        {renderActionButton("My Saved","reddit-api","get_user_saved",{limit:25},Bookmark)}
      </TabsContent>
      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search Posts","reddit-api","search",[{key:"r_search_q",placeholder:"Query"},{key:"r_search_sub",placeholder:"Subreddit (optional)"}],()=>({query:getInput("r_search_q"),subreddit:getInput("r_search_sub")||undefined,limit:25}),Search)}
        {renderInputAction("Search Subreddits","reddit-api","search_subreddits",[{key:"r_ss_q",placeholder:"Query"}],()=>({query:getInput("r_ss_q"),limit:10}),Hash)}
        {renderInputAction("Search Users","reddit-api","search_users",[{key:"r_su_q",placeholder:"Query"}],()=>({query:getInput("r_su_q"),limit:10}),Users)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Post","social-ai-responder","generate_caption",[{key:"ai_r_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_r_topic"),platform:"reddit",include_cta:true}),Brain)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_r_cmt",placeholder:"Comment to reply to..."}],()=>({message_text:getInput("ai_r_cmt"),sender_name:"redditor"}),MessageSquare)}
        {renderInputAction("AI Title Generator","social-ai-responder","generate_caption",[{key:"ai_r_title",placeholder:"Content/topic for title"}],()=>({topic:`Generate 5 click-worthy Reddit post titles for: ${getInput("ai_r_title")}`,platform:"reddit",include_cta:false}),FileText)}
        {renderInputAction("AI Subreddit Finder","social-ai-responder","generate_caption",[{key:"ai_r_sub",placeholder:"Describe your niche"}],()=>({topic:`List 15 best subreddits to promote content about: ${getInput("ai_r_sub")}`,platform:"reddit",include_cta:false}),Search)}
        {renderInputAction("AI DM Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_r_dm",placeholder:"Incoming DM text..."}],()=>({message_text:getInput("ai_r_dm"),sender_name:"user"}),Send)}
        {renderInputAction("AI AMA Generator","social-ai-responder","generate_caption",[{key:"ai_r_ama",placeholder:"Your expertise/niche"}],()=>({topic:`Write an AMA (Ask Me Anything) post intro and 10 expected Q&A pairs for: ${getInput("ai_r_ama")}`,platform:"reddit",include_cta:false}),Star)}
      </TabsContent>
    </Tabs>
  );

  // ===== TELEGRAM =====
  const renderTelegramContent = () => (
    <Tabs defaultValue="messages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"messages",l:"Messages",icon:Send},{v:"media",l:"Media",icon:Image},{v:"special",l:"Special",icon:Dice1},{v:"chat",l:"Chat Mgmt",icon:Settings},{v:"members",l:"Members",icon:Users},{v:"bot",l:"Bot",icon:Bot},{v:"forum",l:"Forum",icon:Layers},{v:"webhook",l:"Webhook",icon:Zap},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="messages" className="space-y-2 mt-3">
        {renderInputAction("Send Text","telegram-api","send_message",[{key:"tg_chat_id",placeholder:"Chat ID"},{key:"tg_text",placeholder:"Message"}],()=>({chat_id:getInput("tg_chat_id"),text:getInput("tg_text")}),Send)}
        {renderInputAction("Forward","telegram-api","forward_message",[{key:"tg_fw_to",placeholder:"To Chat"},{key:"tg_fw_from",placeholder:"From Chat"},{key:"tg_fw_msg",placeholder:"Msg ID"}],()=>({chat_id:getInput("tg_fw_to"),from_chat_id:getInput("tg_fw_from"),message_id:parseInt(getInput("tg_fw_msg"))}),Forward)}
        {renderInputAction("Copy Message","telegram-api","copy_message",[{key:"tg_cp_to",placeholder:"To Chat"},{key:"tg_cp_from",placeholder:"From Chat"},{key:"tg_cp_msg",placeholder:"Msg ID"}],()=>({chat_id:getInput("tg_cp_to"),from_chat_id:getInput("tg_cp_from"),message_id:parseInt(getInput("tg_cp_msg"))}),Copy)}
        {renderInputAction("Edit","telegram-api","edit_message_text",[{key:"tg_edit_chat",placeholder:"Chat ID"},{key:"tg_edit_msg",placeholder:"Msg ID"},{key:"tg_edit_text",placeholder:"New text"}],()=>({chat_id:getInput("tg_edit_chat"),message_id:parseInt(getInput("tg_edit_msg")),text:getInput("tg_edit_text")}),FileText)}
        {renderInputAction("Delete","telegram-api","delete_message",[{key:"tg_del_chat",placeholder:"Chat ID"},{key:"tg_del_msg",placeholder:"Msg ID"}],()=>({chat_id:getInput("tg_del_chat"),message_id:parseInt(getInput("tg_del_msg"))}),Trash2)}
        {renderInputAction("Bulk Delete","telegram-api","delete_messages",[{key:"tg_bdel_chat",placeholder:"Chat ID"},{key:"tg_bdel_ids",placeholder:"Msg IDs (comma sep)"}],()=>({chat_id:getInput("tg_bdel_chat"),message_ids:getInput("tg_bdel_ids").split(",").map(s=>parseInt(s.trim()))}),Trash2)}
        {renderInputAction("Set Reaction","telegram-api","set_message_reaction",[{key:"tg_react_chat",placeholder:"Chat ID"},{key:"tg_react_msg",placeholder:"Msg ID"},{key:"tg_react_emoji",placeholder:"Emoji"}],()=>({chat_id:getInput("tg_react_chat"),message_id:parseInt(getInput("tg_react_msg")),reaction:[{type:"emoji",emoji:getInput("tg_react_emoji")}]}),Heart)}
        {renderInputAction("Chat Action","telegram-api","send_chat_action",[{key:"tg_ca_chat",placeholder:"Chat ID"},{key:"tg_ca_action",placeholder:"typing/upload_photo/..."}],()=>({chat_id:getInput("tg_ca_chat"),action:getInput("tg_ca_action")||"typing"}),Activity)}
      </TabsContent>
      <TabsContent value="media" className="space-y-2 mt-3">
        {renderInputAction("Photo","telegram-api","send_photo",[{key:"tg_ph_chat",placeholder:"Chat ID"},{key:"tg_ph_url",placeholder:"URL"},{key:"tg_ph_cap",placeholder:"Caption"}],()=>({chat_id:getInput("tg_ph_chat"),photo_url:getInput("tg_ph_url"),caption:getInput("tg_ph_cap")}),Image)}
        {renderInputAction("Video","telegram-api","send_video",[{key:"tg_vid_chat",placeholder:"Chat ID"},{key:"tg_vid_url",placeholder:"URL"},{key:"tg_vid_cap",placeholder:"Caption"}],()=>({chat_id:getInput("tg_vid_chat"),video_url:getInput("tg_vid_url"),caption:getInput("tg_vid_cap")}),Video)}
        {renderInputAction("Animation/GIF","telegram-api","send_animation",[{key:"tg_anim_chat",placeholder:"Chat ID"},{key:"tg_anim_url",placeholder:"URL"},{key:"tg_anim_cap",placeholder:"Caption"}],()=>({chat_id:getInput("tg_anim_chat"),animation_url:getInput("tg_anim_url"),caption:getInput("tg_anim_cap")}),Play)}
        {renderInputAction("Audio","telegram-api","send_audio",[{key:"tg_aud_chat",placeholder:"Chat ID"},{key:"tg_aud_url",placeholder:"URL"},{key:"tg_aud_cap",placeholder:"Caption"}],()=>({chat_id:getInput("tg_aud_chat"),audio_url:getInput("tg_aud_url"),caption:getInput("tg_aud_cap")}),Volume2)}
        {renderInputAction("Voice","telegram-api","send_voice",[{key:"tg_voi_chat",placeholder:"Chat ID"},{key:"tg_voi_url",placeholder:"URL"}],()=>({chat_id:getInput("tg_voi_chat"),voice_url:getInput("tg_voi_url")}),Mic)}
        {renderInputAction("Document","telegram-api","send_document",[{key:"tg_doc_chat",placeholder:"Chat ID"},{key:"tg_doc_url",placeholder:"URL"}],()=>({chat_id:getInput("tg_doc_chat"),document_url:getInput("tg_doc_url")}),FileText)}
        {renderInputAction("Sticker","telegram-api","send_sticker",[{key:"tg_stk_chat",placeholder:"Chat ID"},{key:"tg_stk_id",placeholder:"Sticker file_id"}],()=>({chat_id:getInput("tg_stk_chat"),sticker:getInput("tg_stk_id")}),Star)}
        {renderInputAction("Video Note","telegram-api","send_video_note",[{key:"tg_vn_chat",placeholder:"Chat ID"},{key:"tg_vn_url",placeholder:"URL"}],()=>({chat_id:getInput("tg_vn_chat"),video_note_url:getInput("tg_vn_url")}),Camera)}
      </TabsContent>
      <TabsContent value="special" className="space-y-2 mt-3">
        {renderInputAction("Location","telegram-api","send_location",[{key:"tg_loc_chat",placeholder:"Chat ID"},{key:"tg_loc_lat",placeholder:"Lat"},{key:"tg_loc_lng",placeholder:"Lng"}],()=>({chat_id:getInput("tg_loc_chat"),latitude:parseFloat(getInput("tg_loc_lat")),longitude:parseFloat(getInput("tg_loc_lng"))}),MapPin)}
        {renderInputAction("Venue","telegram-api","send_venue",[{key:"tg_ven_chat",placeholder:"Chat ID"},{key:"tg_ven_lat",placeholder:"Lat"},{key:"tg_ven_lng",placeholder:"Lng"},{key:"tg_ven_title",placeholder:"Title"},{key:"tg_ven_addr",placeholder:"Address"}],()=>({chat_id:getInput("tg_ven_chat"),latitude:parseFloat(getInput("tg_ven_lat")),longitude:parseFloat(getInput("tg_ven_lng")),title:getInput("tg_ven_title"),address:getInput("tg_ven_addr")}),MapPin)}
        {renderInputAction("Contact","telegram-api","send_contact",[{key:"tg_cnt_chat",placeholder:"Chat ID"},{key:"tg_cnt_phone",placeholder:"Phone"},{key:"tg_cnt_name",placeholder:"First Name"}],()=>({chat_id:getInput("tg_cnt_chat"),phone_number:getInput("tg_cnt_phone"),first_name:getInput("tg_cnt_name")}),Users)}
        {renderInputAction("Poll","telegram-api","send_poll",[{key:"tg_poll_chat",placeholder:"Chat ID"},{key:"tg_poll_q",placeholder:"Question"},{key:"tg_poll_opts",placeholder:"Options (comma sep)"}],()=>({chat_id:getInput("tg_poll_chat"),question:getInput("tg_poll_q"),options:getInput("tg_poll_opts").split(",").map(s=>({text:s.trim()}))}),BarChart3)}
        {renderInputAction("Dice","telegram-api","send_dice",[{key:"tg_dice_chat",placeholder:"Chat ID"},{key:"tg_dice_emoji",placeholder:"Emoji (🎲🎯🏀⚽🎳🎰)"}],()=>({chat_id:getInput("tg_dice_chat"),emoji:getInput("tg_dice_emoji")||"🎲"}),Dice1)}
      </TabsContent>
      <TabsContent value="chat" className="space-y-2 mt-3">
        {renderActionButton("Bot Info","telegram-api","get_me",{},Bot)}
        {renderInputAction("Get Chat","telegram-api","get_chat",[{key:"tg_gc_id",placeholder:"Chat ID"}],()=>({chat_id:getInput("tg_gc_id")}),MessageSquare)}
        {renderInputAction("Member Count","telegram-api","get_chat_member_count",[{key:"tg_mc_id",placeholder:"Chat ID"}],()=>({chat_id:getInput("tg_mc_id")}),Users)}
        {renderInputAction("Set Title","telegram-api","set_chat_title",[{key:"tg_st_chat",placeholder:"Chat ID"},{key:"tg_st_title",placeholder:"Title"}],()=>({chat_id:getInput("tg_st_chat"),title:getInput("tg_st_title")}),FileText)}
        {renderInputAction("Set Description","telegram-api","set_chat_description",[{key:"tg_sd_chat",placeholder:"Chat ID"},{key:"tg_sd_desc",placeholder:"Description"}],()=>({chat_id:getInput("tg_sd_chat"),description:getInput("tg_sd_desc")}),FileText)}
        {renderInputAction("Pin Message","telegram-api","pin_chat_message",[{key:"tg_pin_chat",placeholder:"Chat ID"},{key:"tg_pin_msg",placeholder:"Msg ID"}],()=>({chat_id:getInput("tg_pin_chat"),message_id:parseInt(getInput("tg_pin_msg"))}),Pin)}
        {renderInputAction("Unpin","telegram-api","unpin_chat_message",[{key:"tg_unpin_chat",placeholder:"Chat ID"},{key:"tg_unpin_msg",placeholder:"Msg ID"}],()=>({chat_id:getInput("tg_unpin_chat"),message_id:parseInt(getInput("tg_unpin_msg"))}),PinOff)}
        {renderInputAction("Invite Link","telegram-api","create_chat_invite_link",[{key:"tg_inv_chat",placeholder:"Chat ID"}],()=>({chat_id:getInput("tg_inv_chat")}),Link2)}
        {renderInputAction("Export Invite","telegram-api","export_chat_invite_link",[{key:"tg_exp_chat",placeholder:"Chat ID"}],()=>({chat_id:getInput("tg_exp_chat")}),Link2)}
        {renderInputAction("Leave Chat","telegram-api","leave_chat",[{key:"tg_leave_chat",placeholder:"Chat ID"}],()=>({chat_id:getInput("tg_leave_chat")}),UserMinus)}
      </TabsContent>
      <TabsContent value="members" className="space-y-2 mt-3">
        {renderInputAction("Get Member","telegram-api","get_chat_member",[{key:"tg_gm_chat",placeholder:"Chat ID"},{key:"tg_gm_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_gm_chat"),user_id:parseInt(getInput("tg_gm_user"))}),Eye)}
        {renderInputAction("Ban","telegram-api","ban_chat_member",[{key:"tg_ban_chat",placeholder:"Chat ID"},{key:"tg_ban_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_ban_chat"),user_id:parseInt(getInput("tg_ban_user"))}),Shield)}
        {renderInputAction("Unban","telegram-api","unban_chat_member",[{key:"tg_unban_chat",placeholder:"Chat ID"},{key:"tg_unban_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_unban_chat"),user_id:parseInt(getInput("tg_unban_user"))}),UserPlus)}
        {renderInputAction("Restrict","telegram-api","restrict_chat_member",[{key:"tg_rest_chat",placeholder:"Chat ID"},{key:"tg_rest_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_rest_chat"),user_id:parseInt(getInput("tg_rest_user"))}),Lock)}
        {renderInputAction("Promote","telegram-api","promote_chat_member",[{key:"tg_promo_chat",placeholder:"Chat ID"},{key:"tg_promo_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_promo_chat"),user_id:parseInt(getInput("tg_promo_user")),can_manage_chat:true,can_delete_messages:true,can_manage_video_chats:true}),ArrowUp)}
        {renderInputAction("Approve Join","telegram-api","approve_chat_join_request",[{key:"tg_appr_chat",placeholder:"Chat ID"},{key:"tg_appr_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_appr_chat"),user_id:parseInt(getInput("tg_appr_user"))}),Zap)}
        {renderInputAction("Decline Join","telegram-api","decline_chat_join_request",[{key:"tg_decl_chat",placeholder:"Chat ID"},{key:"tg_decl_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_decl_chat"),user_id:parseInt(getInput("tg_decl_user"))}),UserMinus)}
        {renderInputAction("Profile Photos","telegram-api","get_user_profile_photos",[{key:"tg_pp_user",placeholder:"User ID"}],()=>({user_id:parseInt(getInput("tg_pp_user"))}),Camera)}
      </TabsContent>
      <TabsContent value="bot" className="space-y-2 mt-3">
        {renderActionButton("Bot Info","telegram-api","get_me",{},Bot)}
        {renderActionButton("Commands","telegram-api","get_my_commands",{},Briefcase)}
        {renderInputAction("Set Commands","telegram-api","set_my_commands",[{key:"tg_cmd_json",placeholder:'[{"command":"start","description":"..."}]'}],()=>({commands:JSON.parse(getInput("tg_cmd_json")||"[]")}),Settings)}
        {renderActionButton("Delete Commands","telegram-api","delete_my_commands",{},Trash2)}
        {renderActionButton("Bot Name","telegram-api","get_my_name",{},Users)}
        {renderInputAction("Set Name","telegram-api","set_my_name",[{key:"tg_sn_name",placeholder:"Bot name"}],()=>({name:getInput("tg_sn_name")}),Users)}
        {renderActionButton("Description","telegram-api","get_my_description",{},FileText)}
        {renderInputAction("Set Description","telegram-api","set_my_description",[{key:"tg_sd_desc",placeholder:"Description"}],()=>({description:getInput("tg_sd_desc")}),FileText)}
        {renderActionButton("Short Desc","telegram-api","get_my_short_description",{},FileText)}
      </TabsContent>
      <TabsContent value="forum" className="space-y-2 mt-3">
        {renderInputAction("Create Topic","telegram-api","create_forum_topic",[{key:"tg_ft_chat",placeholder:"Chat ID"},{key:"tg_ft_name",placeholder:"Topic name"}],()=>({chat_id:getInput("tg_ft_chat"),name:getInput("tg_ft_name")}),FolderOpen)}
        {renderInputAction("Edit Topic","telegram-api","edit_forum_topic",[{key:"tg_eft_chat",placeholder:"Chat ID"},{key:"tg_eft_thread",placeholder:"Thread ID"},{key:"tg_eft_name",placeholder:"New name"}],()=>({chat_id:getInput("tg_eft_chat"),message_thread_id:parseInt(getInput("tg_eft_thread")),name:getInput("tg_eft_name")}),FileText)}
        {renderInputAction("Close Topic","telegram-api","close_forum_topic",[{key:"tg_cft_chat",placeholder:"Chat ID"},{key:"tg_cft_thread",placeholder:"Thread ID"}],()=>({chat_id:getInput("tg_cft_chat"),message_thread_id:parseInt(getInput("tg_cft_thread"))}),Lock)}
        {renderInputAction("Reopen Topic","telegram-api","reopen_forum_topic",[{key:"tg_rft_chat",placeholder:"Chat ID"},{key:"tg_rft_thread",placeholder:"Thread ID"}],()=>({chat_id:getInput("tg_rft_chat"),message_thread_id:parseInt(getInput("tg_rft_thread"))}),Unlock)}
        {renderInputAction("Delete Topic","telegram-api","delete_forum_topic",[{key:"tg_dft_chat",placeholder:"Chat ID"},{key:"tg_dft_thread",placeholder:"Thread ID"}],()=>({chat_id:getInput("tg_dft_chat"),message_thread_id:parseInt(getInput("tg_dft_thread"))}),Trash2)}
      </TabsContent>
      <TabsContent value="webhook" className="space-y-2 mt-3">
        {renderActionButton("Webhook Info","telegram-api","get_webhook_info",{},Activity)}
        {renderActionButton("Get Updates","telegram-api","get_updates",{limit:20},RefreshCw)}
        {renderInputAction("Set Webhook","telegram-api","set_webhook",[{key:"tg_wh_url",placeholder:"Webhook URL"}],()=>({webhook_url:getInput("tg_wh_url")}),Zap)}
        {renderActionButton("Delete Webhook","telegram-api","delete_webhook",{},Trash2)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Message","social-ai-responder","generate_caption",[{key:"ai_tg_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_tg_topic"),platform:"telegram",include_cta:true}),Brain)}
        {renderInputAction("AI Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_tg_dm",placeholder:"Incoming message..."}],()=>({message_text:getInput("ai_tg_dm"),sender_name:"subscriber"}),Zap)}
        {renderInputAction("AI Channel Post","social-ai-responder","generate_caption",[{key:"ai_tg_ch",placeholder:"Topic for channel post"}],()=>({topic:`Write a Telegram channel post (formatted with bold and links) about: ${getInput("ai_tg_ch")}`,platform:"telegram",include_cta:true}),Megaphone)}
        {renderInputAction("AI Poll Creator","social-ai-responder","generate_caption",[{key:"ai_tg_poll",placeholder:"Topic for poll"}],()=>({topic:`Create 5 engaging Telegram poll questions with 4 options each about: ${getInput("ai_tg_poll")}`,platform:"telegram",include_cta:false}),BarChart3)}
        {renderInputAction("AI Welcome","social-ai-responder","generate_caption",[{key:"ai_tg_welcome",placeholder:"Group/channel description"}],()=>({topic:`Write a warm welcome message for new Telegram members joining: ${getInput("ai_tg_welcome")}`,platform:"telegram",include_cta:false}),UserPlus)}
        {renderInputAction("AI Bot Response","social-ai-responder","generate_dm_reply",[{key:"ai_tg_bot",placeholder:"User command/query..."}],()=>({message_text:getInput("ai_tg_bot"),sender_name:"user"}),Bot)}
      </TabsContent>
    </Tabs>
  );

  // ===== TIKTOK =====
  const renderTikTokContent = () => (
    <Tabs defaultValue="videos" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"videos",l:"Videos",icon:Video},{v:"publish",l:"Publish",icon:Upload},{v:"comments",l:"Comments",icon:MessageSquare},{v:"dms",l:"DMs",icon:Send},{v:"playlists",l:"Playlists",icon:List},{v:"research",l:"Research",icon:Search},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="videos" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Videos","tiktok-api","get_videos",{limit:20},Video)}
          {renderActionButton("User Info","tiktok-api","get_user_info",{},Users)}
          {renderActionButton("Creator Info","tiktok-api","get_creator_info",{},Star)}
        </div>
        {renderInputAction("Video Details","tiktok-api","get_video_details",[{key:"tt_vd_ids",placeholder:"Video IDs (comma sep)"}],()=>({video_ids:getInput("tt_vd_ids").split(",").map(s=>s.trim())}),Eye)}
        {renderInputAction("Publish Status","tiktok-api","check_publish_status",[{key:"tt_ps_id",placeholder:"Publish ID"}],()=>({publish_id:getInput("tt_ps_id")}),Activity)}
      </TabsContent>
      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Publish Video","tiktok-api","publish_video_by_url",[{key:"tt_pub_url",placeholder:"Video URL"},{key:"tt_pub_title",placeholder:"Caption"}],()=>({video_url:getInput("tt_pub_url"),title:getInput("tt_pub_title"),privacy_level:"PUBLIC_TO_EVERYONE"}),Upload)}
        {renderInputAction("Publish Photo","tiktok-api","publish_photo",[{key:"tt_ph_title",placeholder:"Title"},{key:"tt_ph_urls",placeholder:"Image URLs (comma sep)"}],()=>({title:getInput("tt_ph_title"),image_urls:getInput("tt_ph_urls").split(",").map(s=>s.trim()),privacy_level:"PUBLIC_TO_EVERYONE"}),Image)}
        {renderInputAction("Carousel","tiktok-api","publish_carousel",[{key:"tt_car_title",placeholder:"Title"},{key:"tt_car_urls",placeholder:"Image URLs (comma sep)"}],()=>({title:getInput("tt_car_title"),image_urls:getInput("tt_car_urls").split(",").map(s=>s.trim()),privacy_level:"PUBLIC_TO_EVERYONE"}),Layers)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments","tiktok-api","get_comments",[{key:"tt_cmt_vid",placeholder:"Video ID"}],()=>({video_id:getInput("tt_cmt_vid"),limit:50}),MessageSquare)}
        {renderInputAction("Comment Replies","tiktok-api","get_comment_replies",[{key:"tt_cr_vid",placeholder:"Video ID"},{key:"tt_cr_cmt",placeholder:"Comment ID"}],()=>({video_id:getInput("tt_cr_vid"),comment_id:getInput("tt_cr_cmt"),limit:20}),MessageSquare)}
        {renderInputAction("Reply","tiktok-api","reply_to_comment",[{key:"tt_rply_vid",placeholder:"Video ID"},{key:"tt_rply_cmt",placeholder:"Comment ID"},{key:"tt_rply_text",placeholder:"Reply"}],()=>({video_id:getInput("tt_rply_vid"),comment_id:getInput("tt_rply_cmt"),message:getInput("tt_rply_text")}),Send)}
      </TabsContent>
      <TabsContent value="dms" className="space-y-2 mt-3">
        {renderActionButton("Conversations","tiktok-api","get_conversations",{},MessageSquare)}
        {renderInputAction("Get Messages","tiktok-api","get_messages",[{key:"tt_gm_conv",placeholder:"Conversation ID"}],()=>({conversation_id:getInput("tt_gm_conv"),limit:20}),MessageSquare)}
        {renderInputAction("Send DM","tiktok-api","send_dm",[{key:"tt_dm_conv",placeholder:"Conv ID"},{key:"tt_dm_text",placeholder:"Message"}],()=>({conversation_id:getInput("tt_dm_conv"),message:getInput("tt_dm_text")}),Send)}
      </TabsContent>
      <TabsContent value="playlists" className="space-y-2 mt-3">
        {renderActionButton("My Playlists","tiktok-api","get_playlists",{limit:20},List)}
        {renderInputAction("Create Playlist","tiktok-api","create_playlist",[{key:"tt_pl_name",placeholder:"Playlist name"}],()=>({name:getInput("tt_pl_name")}),FolderOpen)}
      </TabsContent>
      <TabsContent value="research" className="space-y-2 mt-3">
        {renderInputAction("Research User","tiktok-api","research_user",[{key:"tt_ru",placeholder:"Username"}],()=>({username:getInput("tt_ru")}),Users)}
        {renderInputAction("Research Videos","tiktok-api","research_videos",[{key:"tt_rv",placeholder:"Keywords (comma sep)"}],()=>({keywords:getInput("tt_rv").split(",").map(s=>s.trim()),limit:20}),Search)}
        {renderInputAction("Research Hashtag","tiktok-api","research_hashtag",[{key:"tt_rh",placeholder:"Hashtags (comma sep)"}],()=>({hashtags:getInput("tt_rh").split(",").map(s=>s.trim())}),Hash)}
        {renderInputAction("Research Comments","tiktok-api","research_comments",[{key:"tt_rc_vid",placeholder:"Video ID"}],()=>({video_id:getInput("tt_rc_vid"),limit:100}),MessageSquare)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Caption","social-ai-responder","generate_caption",[{key:"ai_tt_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_tt_topic"),platform:"tiktok",include_cta:true}),Brain)}
        {renderInputAction("AI DM Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_tt_dm",placeholder:"Incoming DM..."}],()=>({message_text:getInput("ai_tt_dm"),sender_name:"fan"}),Send)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_tt_cmt",placeholder:"Comment text..."}],()=>({message_text:getInput("ai_tt_cmt"),sender_name:"viewer"}),MessageSquare)}
        {renderInputAction("AI Hashtag Strategy","social-ai-responder","generate_caption",[{key:"ai_tt_ht",placeholder:"Niche/content type"}],()=>({topic:`Generate 30 TikTok hashtags (mix of trending + niche) for: ${getInput("ai_tt_ht")}`,platform:"tiktok",include_cta:false}),Hash)}
        {renderInputAction("AI Video Ideas","social-ai-responder","generate_caption",[{key:"ai_tt_ideas",placeholder:"Your niche"}],()=>({topic:`Generate 10 viral TikTok video ideas with hooks for: ${getInput("ai_tt_ideas")}`,platform:"tiktok",include_cta:false}),Video)}
        {renderInputAction("AI Hook Generator","social-ai-responder","generate_caption",[{key:"ai_tt_hook",placeholder:"Video topic"}],()=>({topic:`Write 10 attention-grabbing TikTok video hooks (first 3 seconds) for: ${getInput("ai_tt_hook")}`,platform:"tiktok",include_cta:false}),Zap)}
        {renderInputAction("AI Duet/Stitch Ideas","social-ai-responder","generate_caption",[{key:"ai_tt_duet",placeholder:"Original video topic"}],()=>({topic:`Generate 5 creative duet/stitch response ideas for a TikTok about: ${getInput("ai_tt_duet")}`,platform:"tiktok",include_cta:false}),Repeat)}
      </TabsContent>
    </Tabs>
  );

  // ===== SNAPCHAT, THREADS, WHATSAPP, SIGNAL, YOUTUBE, PINTEREST, DISCORD, FACEBOOK =====
  // Keeping these the same as before since they already had comprehensive coverage
  // but adding missing actions

  const renderSnapchatContent = () => (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"account",l:"Account",icon:Users},{v:"campaigns",l:"Campaigns",icon:Target},{v:"ads",l:"Ads",icon:Megaphone},{v:"creatives",l:"Creatives",icon:Image},{v:"audiences",l:"Audiences",icon:Users},{v:"analytics",l:"Analytics",icon:BarChart3},{v:"catalogs",l:"Catalogs",icon:Layers},{v:"pixels",l:"Pixels",icon:Activity},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="account" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Me","snapchat-api","get_me",{},Users)}
          {renderActionButton("Organizations","snapchat-api","get_organizations",{},Briefcase)}
          {renderActionButton("Bitmoji","snapchat-api","get_bitmoji_avatar",{},Star)}
        </div>
        {renderInputAction("Ad Accounts","snapchat-api","get_ad_accounts",[{key:"snap_org_id",placeholder:"Organization ID"}],()=>({organization_id:getInput("snap_org_id")}),Briefcase)}
      </TabsContent>
      <TabsContent value="campaigns" className="space-y-2 mt-3">
        {renderInputAction("Get Campaigns","snapchat-api","get_campaigns",[{key:"snap_camp_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_camp_aa")}),Target)}
        {renderInputAction("Create Campaign","snapchat-api","create_campaign",[{key:"snap_cc_aa",placeholder:"Ad Account ID"},{key:"snap_cc_name",placeholder:"Name"},{key:"snap_cc_obj",placeholder:"Objective (AWARENESS)"}],()=>({ad_account_id:getInput("snap_cc_aa"),name:getInput("snap_cc_name"),objective:getInput("snap_cc_obj")||"AWARENESS"}),Target)}
        {renderInputAction("Update Campaign","snapchat-api","update_campaign",[{key:"snap_uc_aa",placeholder:"Ad Account ID"},{key:"snap_uc_id",placeholder:"Campaign ID"},{key:"snap_uc_name",placeholder:"New name"},{key:"snap_uc_status",placeholder:"Status (ACTIVE/PAUSED)"}],()=>({ad_account_id:getInput("snap_uc_aa"),campaign_id:getInput("snap_uc_id"),name:getInput("snap_uc_name"),status:getInput("snap_uc_status")}),Settings)}
        {renderInputAction("Delete Campaign","snapchat-api","delete_campaign",[{key:"snap_dc_id",placeholder:"Campaign ID"}],()=>({campaign_id:getInput("snap_dc_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="ads" className="space-y-2 mt-3">
        {renderInputAction("Get Ad Squads","snapchat-api","get_ad_squads",[{key:"snap_as_cid",placeholder:"Campaign ID"}],()=>({campaign_id:getInput("snap_as_cid")}),Layers)}
        {renderInputAction("Get Ads","snapchat-api","get_ads",[{key:"snap_ads_asid",placeholder:"Ad Squad ID"}],()=>({ad_squad_id:getInput("snap_ads_asid")}),Megaphone)}
        {renderInputAction("Create Ad","snapchat-api","create_ad",[{key:"snap_ca_asid",placeholder:"Ad Squad ID"},{key:"snap_ca_name",placeholder:"Name"},{key:"snap_ca_crid",placeholder:"Creative ID"}],()=>({ad_squad_id:getInput("snap_ca_asid"),name:getInput("snap_ca_name"),creative_id:getInput("snap_ca_crid")}),Megaphone)}
      </TabsContent>
      <TabsContent value="creatives" className="space-y-2 mt-3">
        {renderInputAction("Get Creatives","snapchat-api","get_creatives",[{key:"snap_cr_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_cr_aa")}),Image)}
        {renderInputAction("Get Media","snapchat-api","get_media",[{key:"snap_md_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_md_aa")}),Video)}
        {renderInputAction("Create Media","snapchat-api","create_media",[{key:"snap_cm_aa",placeholder:"Ad Account ID"},{key:"snap_cm_name",placeholder:"Name"}],()=>({ad_account_id:getInput("snap_cm_aa"),name:getInput("snap_cm_name")}),Upload)}
      </TabsContent>
      <TabsContent value="audiences" className="space-y-2 mt-3">
        {renderInputAction("Get Audiences","snapchat-api","get_audiences",[{key:"snap_aud_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_aud_aa")}),Users)}
        {renderInputAction("Create Audience","snapchat-api","create_audience",[{key:"snap_ca_aa",placeholder:"Ad Account ID"},{key:"snap_ca_name",placeholder:"Name"},{key:"snap_ca_desc",placeholder:"Description"}],()=>({ad_account_id:getInput("snap_ca_aa"),name:getInput("snap_ca_name"),description:getInput("snap_ca_desc")}),UserPlus)}
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Interest Targeting","snapchat-api","get_interest_targeting",{},Target)}
          {renderActionButton("Demographics","snapchat-api","get_demographics_targeting",{},Users)}
        </div>
        {renderInputAction("Location Targeting","snapchat-api","get_location_targeting",[{key:"snap_loc_cc",placeholder:"Country Code (US)"}],()=>({country_code:getInput("snap_loc_cc")||"US"}),MapPin)}
      </TabsContent>
      <TabsContent value="analytics" className="space-y-2 mt-3">
        {renderInputAction("Campaign Stats","snapchat-api","get_campaign_stats",[{key:"snap_cs_id",placeholder:"Campaign ID"}],()=>({campaign_id:getInput("snap_cs_id")}),BarChart3)}
        {renderInputAction("Ad Squad Stats","snapchat-api","get_ad_squad_stats",[{key:"snap_ass_id",placeholder:"Ad Squad ID"}],()=>({ad_squad_id:getInput("snap_ass_id")}),BarChart3)}
        {renderInputAction("Ad Stats","snapchat-api","get_ad_stats",[{key:"snap_as_id",placeholder:"Ad ID"}],()=>({ad_id:getInput("snap_as_id")}),BarChart3)}
      </TabsContent>
      <TabsContent value="catalogs" className="space-y-2 mt-3">
        {renderInputAction("Catalogs","snapchat-api","get_catalogs",[{key:"snap_cat_org",placeholder:"Organization ID"}],()=>({organization_id:getInput("snap_cat_org")}),Layers)}
        {renderInputAction("Product Sets","snapchat-api","get_product_sets",[{key:"snap_ps_cat",placeholder:"Catalog ID"}],()=>({catalog_id:getInput("snap_ps_cat")}),Layers)}
        {renderInputAction("Products","snapchat-api","get_products",[{key:"snap_prod_cat",placeholder:"Catalog ID"}],()=>({catalog_id:getInput("snap_prod_cat")}),Layers)}
      </TabsContent>
      <TabsContent value="pixels" className="space-y-2 mt-3">
        {renderInputAction("Get Pixels","snapchat-api","get_pixels",[{key:"snap_px_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_px_aa")}),Activity)}
        {renderInputAction("Create Pixel","snapchat-api","create_pixel",[{key:"snap_cpx_aa",placeholder:"Ad Account ID"},{key:"snap_cpx_name",placeholder:"Pixel Name"}],()=>({ad_account_id:getInput("snap_cpx_aa"),name:getInput("snap_cpx_name")}),Activity)}
        {renderInputAction("Pixel Stats","snapchat-api","get_pixel_stats",[{key:"snap_pxs_id",placeholder:"Pixel ID"}],()=>({pixel_id:getInput("snap_pxs_id")}),BarChart3)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Ad Copy","social-ai-responder","generate_caption",[{key:"ai_snap_topic",placeholder:"Ad topic"}],()=>({topic:getInput("ai_snap_topic"),platform:"snapchat",include_cta:true}),Brain)}
        {renderInputAction("AI Story Script","social-ai-responder","generate_caption",[{key:"ai_snap_story",placeholder:"Story theme"}],()=>({topic:`Write a 5-panel Snapchat story script with captions for: ${getInput("ai_snap_story")}`,platform:"snapchat",include_cta:true}),Play)}
        {renderInputAction("AI Audience Targeting","social-ai-responder","generate_caption",[{key:"ai_snap_aud",placeholder:"Product/service"}],()=>({topic:`Suggest 5 Snapchat ad audience segments for: ${getInput("ai_snap_aud")}`,platform:"snapchat",include_cta:false}),Target)}
        {renderInputAction("AI Campaign Strategy","social-ai-responder","generate_caption",[{key:"ai_snap_camp",placeholder:"Campaign goal"}],()=>({topic:`Create a Snapchat ad campaign strategy for: ${getInput("ai_snap_camp")}`,platform:"snapchat",include_cta:false}),Briefcase)}
      </TabsContent>
    </Tabs>
  );

  const renderThreadsContent = () => (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"posts",l:"Posts",icon:MessageSquare},{v:"publish",l:"Publish",icon:Send},{v:"replies",l:"Replies",icon:MessageCircle},{v:"insights",l:"Insights",icon:BarChart3},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="posts" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Threads","threads-api","get_threads",{limit:25},MessageSquare)}
          {renderActionButton("Profile","threads-api","get_profile",{},Users)}
          {renderActionButton("Publish Limit","threads-api","get_publishing_limit",{},Activity)}
        </div>
        {renderInputAction("Get Thread","threads-api","get_thread",[{key:"th_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("th_id")}),Eye)}
        {renderInputAction("User Profile","threads-api","get_user_profile",[{key:"th_uid",placeholder:"User ID"}],()=>({user_id:getInput("th_uid")}),Users)}
      </TabsContent>
      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Text Thread","threads-api","create_text_thread",[{key:"th_text",placeholder:"What's on your mind?"}],()=>({text:getInput("th_text")}),Send)}
        {renderInputAction("Image Thread","threads-api","create_image_thread",[{key:"th_img_url",placeholder:"Image URL"},{key:"th_img_text",placeholder:"Caption"}],()=>({image_url:getInput("th_img_url"),text:getInput("th_img_text")}),Image)}
        {renderInputAction("Video Thread","threads-api","create_video_thread",[{key:"th_vid_url",placeholder:"Video URL"},{key:"th_vid_text",placeholder:"Caption"}],()=>({video_url:getInput("th_vid_url"),text:getInput("th_vid_text")}),Video)}
        {renderInputAction("Carousel Thread","threads-api","create_carousel_thread",[{key:"th_car_text",placeholder:"Caption"},{key:"th_car_urls",placeholder:"Image URLs (comma sep)"}],()=>({text:getInput("th_car_text"),items:getInput("th_car_urls").split(",").map(s=>({media_type:"IMAGE",image_url:s.trim()}))}),Layers)}
        {renderInputAction("Reply to Thread","threads-api","create_text_thread",[{key:"th_reply_id",placeholder:"Thread ID to reply"},{key:"th_reply_text",placeholder:"Reply..."}],()=>({text:getInput("th_reply_text"),reply_to_id:getInput("th_reply_id")}),MessageCircle)}
        {renderInputAction("Quote Thread","threads-api","create_text_thread",[{key:"th_quote_id",placeholder:"Thread ID to quote"},{key:"th_quote_text",placeholder:"Comment..."}],()=>({text:getInput("th_quote_text"),quote_post_id:getInput("th_quote_id")}),Repeat)}
      </TabsContent>
      <TabsContent value="replies" className="space-y-2 mt-3">
        {renderInputAction("Get Replies","threads-api","get_replies",[{key:"th_rep_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("th_rep_id"),limit:25}),MessageCircle)}
        {renderInputAction("Conversation","threads-api","get_conversation",[{key:"th_conv_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("th_conv_id"),limit:25}),Layers)}
        {renderInputAction("Hide Reply","threads-api","hide_reply",[{key:"th_hide_id",placeholder:"Reply ID"}],()=>({reply_id:getInput("th_hide_id")}),EyeOff)}
        {renderInputAction("Reply Control","threads-api","get_reply_control",[{key:"th_rc_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("th_rc_id")}),Shield)}
      </TabsContent>
      <TabsContent value="insights" className="space-y-2 mt-3">
        {renderInputAction("Thread Insights","threads-api","get_thread_insights",[{key:"th_ins_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("th_ins_id")}),BarChart3)}
        {renderActionButton("User Insights (30d)","threads-api","get_user_insights",{period:"last_30_days"},TrendingUp)}
        {renderActionButton("User Insights (7d)","threads-api","get_user_insights",{period:"last_7_days"},TrendingUp)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Thread Post","social-ai-responder","generate_caption",[{key:"ai_th_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_th_topic"),platform:"threads",include_cta:true}),Brain)}
        {renderInputAction("AI Reply","social-ai-responder","generate_dm_reply",[{key:"ai_th_reply",placeholder:"Thread to reply to..."}],()=>({message_text:getInput("ai_th_reply"),sender_name:"user"}),Zap)}
        {renderInputAction("AI Conversation Starter","social-ai-responder","generate_caption",[{key:"ai_th_convo",placeholder:"Your niche"}],()=>({topic:`Write 10 engaging Threads conversation starters for: ${getInput("ai_th_convo")}`,platform:"threads",include_cta:false}),MessageCircle)}
        {renderInputAction("AI Content Calendar","social-ai-responder","generate_caption",[{key:"ai_th_cal",placeholder:"Niche for 7-day plan"}],()=>({topic:`Create a 7-day Threads content calendar with daily post ideas for: ${getInput("ai_th_cal")}`,platform:"threads",include_cta:false}),Calendar)}
      </TabsContent>
    </Tabs>
  );

  const renderWhatsAppContent = () => (
    <Tabs defaultValue="messages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"messages",l:"Messages",icon:Send},{v:"interactive",l:"Interactive",icon:Zap},{v:"media",l:"Media",icon:Image},{v:"templates",l:"Templates",icon:FileText},{v:"business",l:"Business",icon:Briefcase},{v:"analytics",l:"Analytics",icon:BarChart3},{v:"flows",l:"Flows",icon:Activity},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="messages" className="space-y-2 mt-3">
        {renderInputAction("Send Text","whatsapp-api","send_text",[{key:"wa_to",placeholder:"Phone (+1234...)"},{key:"wa_text",placeholder:"Message"}],()=>({to:getInput("wa_to"),text:getInput("wa_text")}),Send)}
        {renderInputAction("Send Image","whatsapp-api","send_image",[{key:"wa_img_to",placeholder:"Phone"},{key:"wa_img_url",placeholder:"Image URL"},{key:"wa_img_cap",placeholder:"Caption"}],()=>({to:getInput("wa_img_to"),image_url:getInput("wa_img_url"),caption:getInput("wa_img_cap")}),Image)}
        {renderInputAction("Send Video","whatsapp-api","send_video",[{key:"wa_vid_to",placeholder:"Phone"},{key:"wa_vid_url",placeholder:"Video URL"}],()=>({to:getInput("wa_vid_to"),video_url:getInput("wa_vid_url")}),Video)}
        {renderInputAction("Send Audio","whatsapp-api","send_audio",[{key:"wa_aud_to",placeholder:"Phone"},{key:"wa_aud_url",placeholder:"Audio URL"}],()=>({to:getInput("wa_aud_to"),audio_url:getInput("wa_aud_url")}),Volume2)}
        {renderInputAction("Send Document","whatsapp-api","send_document",[{key:"wa_doc_to",placeholder:"Phone"},{key:"wa_doc_url",placeholder:"Doc URL"},{key:"wa_doc_name",placeholder:"Filename"}],()=>({to:getInput("wa_doc_to"),document_url:getInput("wa_doc_url"),filename:getInput("wa_doc_name")}),FileText)}
        {renderInputAction("Send Sticker","whatsapp-api","send_sticker",[{key:"wa_stk_to",placeholder:"Phone"},{key:"wa_stk_url",placeholder:"Sticker URL"}],()=>({to:getInput("wa_stk_to"),sticker_url:getInput("wa_stk_url")}),Star)}
        {renderInputAction("Send Location","whatsapp-api","send_location",[{key:"wa_loc_to",placeholder:"Phone"},{key:"wa_loc_lat",placeholder:"Lat"},{key:"wa_loc_lng",placeholder:"Lng"}],()=>({to:getInput("wa_loc_to"),latitude:parseFloat(getInput("wa_loc_lat")),longitude:parseFloat(getInput("wa_loc_lng"))}),MapPin)}
        {renderInputAction("Send Template","whatsapp-api","send_template",[{key:"wa_tpl_to",placeholder:"Phone"},{key:"wa_tpl_name",placeholder:"Template name"},{key:"wa_tpl_lang",placeholder:"Language (en_US)"}],()=>({to:getInput("wa_tpl_to"),template_name:getInput("wa_tpl_name"),language:getInput("wa_tpl_lang")||"en_US"}),FileText)}
        {renderInputAction("React","whatsapp-api","send_reaction",[{key:"wa_react_to",placeholder:"Phone"},{key:"wa_react_msg",placeholder:"Message ID"},{key:"wa_react_emoji",placeholder:"Emoji"}],()=>({to:getInput("wa_react_to"),message_id:getInput("wa_react_msg"),emoji:getInput("wa_react_emoji")}),Heart)}
        {renderInputAction("Mark Read","whatsapp-api","mark_as_read",[{key:"wa_read_msg",placeholder:"Message ID"}],()=>({message_id:getInput("wa_read_msg")}),Eye)}
      </TabsContent>
      <TabsContent value="interactive" className="space-y-2 mt-3">
        {renderInputAction("Button Message","whatsapp-api","send_interactive_buttons",[{key:"wa_btn_to",placeholder:"Phone"},{key:"wa_btn_body",placeholder:"Body text"},{key:"wa_btn_json",placeholder:'Buttons JSON [{"type":"reply","reply":{"id":"1","title":"Yes"}}]'}],()=>({to:getInput("wa_btn_to"),body_text:getInput("wa_btn_body"),buttons:JSON.parse(getInput("wa_btn_json")||"[]")}),Zap)}
        {renderInputAction("List Message","whatsapp-api","send_interactive_list",[{key:"wa_list_to",placeholder:"Phone"},{key:"wa_list_body",placeholder:"Body text"},{key:"wa_list_btn",placeholder:"Button text"},{key:"wa_list_json",placeholder:"Sections JSON"}],()=>({to:getInput("wa_list_to"),body_text:getInput("wa_list_body"),button_text:getInput("wa_list_btn"),sections:JSON.parse(getInput("wa_list_json")||"[]")}),List)}
        {renderInputAction("Send Contacts","whatsapp-api","send_contacts",[{key:"wa_cnt_to",placeholder:"Phone"},{key:"wa_cnt_json",placeholder:"Contacts JSON"}],()=>({to:getInput("wa_cnt_to"),contacts:JSON.parse(getInput("wa_cnt_json")||"[]")}),Users)}
      </TabsContent>
      <TabsContent value="media" className="space-y-2 mt-3">
        {renderInputAction("Get Media","whatsapp-api","get_media",[{key:"wa_media_id",placeholder:"Media ID"}],()=>({media_id:getInput("wa_media_id")}),Image)}
        {renderInputAction("Upload Media","whatsapp-api","upload_media",[{key:"wa_um_url",placeholder:"File URL"},{key:"wa_um_type",placeholder:"MIME type"}],()=>({url:getInput("wa_um_url"),type:getInput("wa_um_type")}),Upload)}
        {renderInputAction("Delete Media","whatsapp-api","delete_media",[{key:"wa_del_media",placeholder:"Media ID"}],()=>({media_id:getInput("wa_del_media")}),Trash2)}
      </TabsContent>
      <TabsContent value="templates" className="space-y-2 mt-3">
        {renderInputAction("Get Templates","whatsapp-api","get_templates",[{key:"wa_tpl_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_tpl_waba"),limit:50}),FileText)}
        {renderInputAction("Create Template","whatsapp-api","create_template",[{key:"wa_ctpl_waba",placeholder:"WABA ID"},{key:"wa_ctpl_name",placeholder:"Name"},{key:"wa_ctpl_cat",placeholder:"Category (MARKETING)"},{key:"wa_ctpl_json",placeholder:"Components JSON"}],()=>({waba_id:getInput("wa_ctpl_waba"),name:getInput("wa_ctpl_name"),category:getInput("wa_ctpl_cat")||"MARKETING",components:JSON.parse(getInput("wa_ctpl_json")||"[]")}),FileText)}
        {renderInputAction("Delete Template","whatsapp-api","delete_template",[{key:"wa_dtpl_waba",placeholder:"WABA ID"},{key:"wa_dtpl_name",placeholder:"Template name"}],()=>({waba_id:getInput("wa_dtpl_waba"),name:getInput("wa_dtpl_name")}),Trash2)}
      </TabsContent>
      <TabsContent value="business" className="space-y-2 mt-3">
        {renderInputAction("Business Profile","whatsapp-api","get_business_profile",[{key:"wa_bp_pid",placeholder:"Phone Number ID"}],()=>({phone_number_id:getInput("wa_bp_pid")}),Briefcase)}
        {renderInputAction("Update Profile","whatsapp-api","update_business_profile",[{key:"wa_ubp_pid",placeholder:"Phone Number ID"},{key:"wa_ubp_about",placeholder:"About"},{key:"wa_ubp_desc",placeholder:"Description"}],()=>({phone_number_id:getInput("wa_ubp_pid"),about:getInput("wa_ubp_about"),description:getInput("wa_ubp_desc")}),Settings)}
        {renderInputAction("Phone Numbers","whatsapp-api","get_phone_numbers",[{key:"wa_pn_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_pn_waba")}),Phone)}
        {renderInputAction("Phone Details","whatsapp-api","get_phone_number",[{key:"wa_pd_id",placeholder:"Phone Number ID"}],()=>({phone_number_id:getInput("wa_pd_id")}),Eye)}
        {renderInputAction("Register Webhook","whatsapp-api","register_webhook",[{key:"wa_wh_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_wh_waba")}),Zap)}
      </TabsContent>
      <TabsContent value="analytics" className="space-y-2 mt-3">
        {renderInputAction("Analytics","whatsapp-api","get_analytics",[{key:"wa_an_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_an_waba")}),BarChart3)}
        {renderInputAction("Conversation Analytics","whatsapp-api","get_conversation_analytics",[{key:"wa_ca_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_ca_waba")}),TrendingUp)}
      </TabsContent>
      <TabsContent value="flows" className="space-y-2 mt-3">
        {renderInputAction("Get Flows","whatsapp-api","get_flows",[{key:"wa_fl_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_fl_waba")}),Activity)}
        {renderInputAction("Create Flow","whatsapp-api","create_flow",[{key:"wa_cfl_waba",placeholder:"WABA ID"},{key:"wa_cfl_name",placeholder:"Flow Name"}],()=>({waba_id:getInput("wa_cfl_waba"),name:getInput("wa_cfl_name")}),Activity)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Message","social-ai-responder","generate_caption",[{key:"ai_wa_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_wa_topic"),platform:"whatsapp",include_cta:true}),Brain)}
        {renderInputAction("AI Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_wa_msg",placeholder:"Incoming message..."}],()=>({message_text:getInput("ai_wa_msg"),sender_name:"customer"}),Zap)}
        {renderInputAction("AI Template Creator","social-ai-responder","generate_caption",[{key:"ai_wa_tpl",placeholder:"Template purpose"}],()=>({topic:`Write a WhatsApp Business message template for: ${getInput("ai_wa_tpl")}`,platform:"whatsapp",include_cta:true}),FileText)}
        {renderInputAction("AI Broadcast","social-ai-responder","generate_caption",[{key:"ai_wa_bcast",placeholder:"Broadcast topic"}],()=>({topic:`Write a WhatsApp broadcast message promoting: ${getInput("ai_wa_bcast")}`,platform:"whatsapp",include_cta:true}),Megaphone)}
        {renderInputAction("AI Quick Replies","social-ai-responder","generate_caption",[{key:"ai_wa_qr",placeholder:"Business type"}],()=>({topic:`Generate 10 WhatsApp quick reply templates for: ${getInput("ai_wa_qr")}`,platform:"whatsapp",include_cta:false}),Zap)}
      </TabsContent>
    </Tabs>
  );

  const renderSignalContent = () => (
    <Tabs defaultValue="messages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"messages",l:"Messages",icon:Send},{v:"groups",l:"Groups",icon:Users},{v:"contacts",l:"Contacts",icon:Users},{v:"identity",l:"Identity",icon:Shield},{v:"setup",l:"Setup",icon:Settings},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="messages" className="space-y-2 mt-3">
        {renderInputAction("Send Message","signal-api","send_message",[{key:"sig_from",placeholder:"Sender number"},{key:"sig_to",placeholder:"Recipient"},{key:"sig_text",placeholder:"Message"}],()=>({sender_number:getInput("sig_from"),to:getInput("sig_to"),message:getInput("sig_text")}),Send)}
        {renderInputAction("Send Attachment","signal-api","send_attachment",[{key:"sig_att_from",placeholder:"Sender"},{key:"sig_att_to",placeholder:"Recipient"},{key:"sig_att_msg",placeholder:"Caption"},{key:"sig_att_b64",placeholder:"Base64 data"}],()=>({sender_number:getInput("sig_att_from"),to:getInput("sig_att_to"),message:getInput("sig_att_msg"),attachments:[getInput("sig_att_b64")]}),Upload)}
        {renderInputAction("Get Messages","signal-api","get_messages",[{key:"sig_recv",placeholder:"Your number"}],()=>({number:getInput("sig_recv")}),MessageSquare)}
        {renderInputAction("React","signal-api","send_reaction",[{key:"sig_react_from",placeholder:"Sender"},{key:"sig_react_to",placeholder:"Recipient"},{key:"sig_react_emoji",placeholder:"Emoji"},{key:"sig_react_ts",placeholder:"Target timestamp"}],()=>({sender_number:getInput("sig_react_from"),recipient:getInput("sig_react_to"),emoji:getInput("sig_react_emoji"),target_author:getInput("sig_react_to"),target_timestamp:parseInt(getInput("sig_react_ts"))}),Heart)}
        {renderInputAction("Remove Reaction","signal-api","remove_reaction",[{key:"sig_rr_from",placeholder:"Sender"},{key:"sig_rr_to",placeholder:"Recipient"},{key:"sig_rr_ts",placeholder:"Target timestamp"}],()=>({sender_number:getInput("sig_rr_from"),recipient:getInput("sig_rr_to"),target_author:getInput("sig_rr_to"),target_timestamp:parseInt(getInput("sig_rr_ts"))}),Heart)}
        {renderInputAction("Delete Message","signal-api","delete_message",[{key:"sig_dm_num",placeholder:"Your number"},{key:"sig_dm_recip",placeholder:"Recipient"},{key:"sig_dm_ts",placeholder:"Timestamp"}],()=>({number:getInput("sig_dm_num"),recipient:getInput("sig_dm_recip"),timestamp:parseInt(getInput("sig_dm_ts"))}),Trash2)}
        {renderInputAction("Typing","signal-api","send_typing",[{key:"sig_type_from",placeholder:"Sender"},{key:"sig_type_to",placeholder:"Recipient"}],()=>({sender_number:getInput("sig_type_from"),recipient:getInput("sig_type_to")}),Activity)}
      </TabsContent>
      <TabsContent value="groups" className="space-y-2 mt-3">
        {renderInputAction("List Groups","signal-api","list_groups",[{key:"sig_lg_num",placeholder:"Your number"}],()=>({number:getInput("sig_lg_num")}),Users)}
        {renderInputAction("Create Group","signal-api","create_group",[{key:"sig_cg_num",placeholder:"Your number"},{key:"sig_cg_name",placeholder:"Group name"},{key:"sig_cg_members",placeholder:"Members (comma sep)"}],()=>({number:getInput("sig_cg_num"),name:getInput("sig_cg_name"),members:getInput("sig_cg_members").split(",").map(s=>s.trim())}),UserPlus)}
        {renderInputAction("Update Group","signal-api","update_group",[{key:"sig_ug_num",placeholder:"Your number"},{key:"sig_ug_gid",placeholder:"Group ID"},{key:"sig_ug_name",placeholder:"New name"}],()=>({number:getInput("sig_ug_num"),group_id:getInput("sig_ug_gid"),name:getInput("sig_ug_name")}),Settings)}
        {renderInputAction("Group Message","signal-api","send_group_message",[{key:"sig_gm_from",placeholder:"Sender"},{key:"sig_gm_gid",placeholder:"Group ID"},{key:"sig_gm_text",placeholder:"Message"}],()=>({sender_number:getInput("sig_gm_from"),group_id:getInput("sig_gm_gid"),message:getInput("sig_gm_text")}),Send)}
        {renderInputAction("Leave Group","signal-api","leave_group",[{key:"sig_lg2_num",placeholder:"Your number"},{key:"sig_lg2_gid",placeholder:"Group ID"}],()=>({number:getInput("sig_lg2_num"),group_id:getInput("sig_lg2_gid")}),UserMinus)}
        {renderInputAction("Delete Group","signal-api","delete_group",[{key:"sig_dg_num",placeholder:"Your number"},{key:"sig_dg_gid",placeholder:"Group ID"}],()=>({number:getInput("sig_dg_num"),group_id:getInput("sig_dg_gid")}),Trash2)}
      </TabsContent>
      <TabsContent value="contacts" className="space-y-2 mt-3">
        {renderInputAction("List Contacts","signal-api","list_contacts",[{key:"sig_lc_num",placeholder:"Your number"}],()=>({number:getInput("sig_lc_num")}),Users)}
        {renderInputAction("Update Contact","signal-api","update_contact",[{key:"sig_uc_num",placeholder:"Your number"},{key:"sig_uc_recip",placeholder:"Contact number"},{key:"sig_uc_name",placeholder:"Name"}],()=>({number:getInput("sig_uc_num"),recipient:getInput("sig_uc_recip"),name:getInput("sig_uc_name")}),Settings)}
        {renderInputAction("Block","signal-api","block_contact",[{key:"sig_blk_num",placeholder:"Your number"},{key:"sig_blk_who",placeholder:"Contact number"}],()=>({number:getInput("sig_blk_num"),recipient:getInput("sig_blk_who")}),Shield)}
        {renderInputAction("Unblock","signal-api","unblock_contact",[{key:"sig_ublk_num",placeholder:"Your number"},{key:"sig_ublk_who",placeholder:"Contact number"}],()=>({number:getInput("sig_ublk_num"),recipient:getInput("sig_ublk_who")}),UserPlus)}
      </TabsContent>
      <TabsContent value="identity" className="space-y-2 mt-3">
        {renderInputAction("List Identities","signal-api","list_identities",[{key:"sig_li_num",placeholder:"Your number"}],()=>({number:getInput("sig_li_num")}),Shield)}
        {renderInputAction("Trust Identity","signal-api","trust_identity",[{key:"sig_ti_num",placeholder:"Your number"},{key:"sig_ti_recip",placeholder:"Contact number"}],()=>({number:getInput("sig_ti_num"),recipient:getInput("sig_ti_recip")}),Shield)}
        {renderInputAction("Sticker Packs","signal-api","list_sticker_packs",[{key:"sig_sp_num",placeholder:"Your number"}],()=>({number:getInput("sig_sp_num")}),Star)}
      </TabsContent>
      <TabsContent value="setup" className="space-y-2 mt-3">
        {renderInputAction("List Accounts","signal-api","list_accounts",[],()=>({}),Users)}
        {renderInputAction("Get Account","signal-api","get_account",[{key:"sig_ga_num",placeholder:"Phone number"}],()=>({number:getInput("sig_ga_num")}),Eye)}
        {renderInputAction("Set Profile","signal-api","set_profile",[{key:"sig_sp2_num",placeholder:"Your number"},{key:"sig_sp2_name",placeholder:"Name"},{key:"sig_sp2_about",placeholder:"About"}],()=>({number:getInput("sig_sp2_num"),name:getInput("sig_sp2_name"),about:getInput("sig_sp2_about")}),Users)}
        {renderInputAction("Register","signal-api","register",[{key:"sig_reg_url",placeholder:"API URL"},{key:"sig_reg_num",placeholder:"Phone number"}],()=>({api_url:getInput("sig_reg_url"),number:getInput("sig_reg_num")}),Settings)}
        {renderInputAction("Verify","signal-api","verify",[{key:"sig_ver_url",placeholder:"API URL"},{key:"sig_ver_num",placeholder:"Phone"},{key:"sig_ver_code",placeholder:"Code"}],()=>({api_url:getInput("sig_ver_url"),number:getInput("sig_ver_num"),verification_code:getInput("sig_ver_code")}),Shield)}
        {renderInputAction("Link Device","signal-api","link_device",[{key:"sig_ld_url",placeholder:"API URL"},{key:"sig_ld_name",placeholder:"Device name"}],()=>({api_url:getInput("sig_ld_url"),device_name:getInput("sig_ld_name")||"Lovable"}),Link2)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Message","social-ai-responder","generate_caption",[{key:"ai_sig_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_sig_topic"),platform:"signal",include_cta:false}),Brain)}
        {renderInputAction("AI Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_sig_dm",placeholder:"Incoming message..."}],()=>({message_text:getInput("ai_sig_dm"),sender_name:"contact"}),Zap)}
        {renderInputAction("AI Group Announcement","social-ai-responder","generate_caption",[{key:"ai_sig_grp",placeholder:"Announcement topic"}],()=>({topic:`Write a Signal group announcement about: ${getInput("ai_sig_grp")}`,platform:"signal",include_cta:false}),Megaphone)}
      </TabsContent>
    </Tabs>
  );

  const renderYouTubeContent = () => (
    <Tabs defaultValue="channel" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"channel",l:"Channel",icon:Users},{v:"videos",l:"Videos",icon:Video},{v:"comments",l:"Comments",icon:MessageSquare},{v:"playlists",l:"Playlists",icon:List},{v:"subs",l:"Subs",icon:Bell},{v:"search",l:"Search",icon:Search},{v:"live",l:"Live",icon:Radio},{v:"analytics",l:"Analytics",icon:BarChart3},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="channel" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Channel","youtube-api","get_my_channel",{},Users)}
          {renderActionButton("Categories","youtube-api","get_categories",{region:"US"},Layers)}
          {renderActionButton("Sections","youtube-api","get_channel_sections",{},FolderOpen)}
        </div>
        {renderInputAction("Lookup Channel","youtube-api","get_channel_by_username",[{key:"yt_lookup",placeholder:"@handle"}],()=>({username:getInput("yt_lookup")}),Search)}
        {renderInputAction("Channel by ID","youtube-api","get_channel",[{key:"yt_ch_id",placeholder:"Channel ID"}],()=>({channel_id:getInput("yt_ch_id")}),Eye)}
      </TabsContent>
      <TabsContent value="videos" className="space-y-2 mt-3">
        {renderActionButton("My Videos","youtube-api","list_my_videos",{limit:25},Video)}
        {renderInputAction("Get Video","youtube-api","get_video",[{key:"yt_vid_id",placeholder:"Video ID"}],()=>({video_id:getInput("yt_vid_id")}),Eye)}
        {renderInputAction("Delete Video","youtube-api","delete_video",[{key:"yt_del_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_del_vid")}),Trash2)}
        {renderInputAction("Like Video","youtube-api","rate_video",[{key:"yt_like_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_like_vid"),rating:"like"}),Heart)}
        {renderInputAction("Dislike Video","youtube-api","rate_video",[{key:"yt_dis_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_dis_vid"),rating:"dislike"}),ArrowDown)}
        {renderInputAction("Get Rating","youtube-api","get_video_rating",[{key:"yt_gr_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_gr_vid")}),Star)}
        {renderInputAction("Captions","youtube-api","get_captions",[{key:"yt_cap_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_cap_vid")}),FileText)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments","youtube-api","get_comments",[{key:"yt_cmt_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_cmt_vid"),limit:20}),MessageSquare)}
        {renderInputAction("Post Comment","youtube-api","post_comment",[{key:"yt_pc_vid",placeholder:"Video ID"},{key:"yt_pc_text",placeholder:"Comment..."}],()=>({video_id:getInput("yt_pc_vid"),text:getInput("yt_pc_text")}),Send)}
        {renderInputAction("Reply","youtube-api","reply_comment",[{key:"yt_rc_parent",placeholder:"Parent Comment ID"},{key:"yt_rc_text",placeholder:"Reply..."}],()=>({parent_id:getInput("yt_rc_parent"),text:getInput("yt_rc_text")}),MessageSquare)}
        {renderInputAction("Edit Comment","youtube-api","update_comment",[{key:"yt_uc_id",placeholder:"Comment ID"},{key:"yt_uc_text",placeholder:"New text"}],()=>({comment_id:getInput("yt_uc_id"),text:getInput("yt_uc_text")}),FileText)}
        {renderInputAction("Delete Comment","youtube-api","delete_comment",[{key:"yt_dc_id",placeholder:"Comment ID"}],()=>({comment_id:getInput("yt_dc_id")}),Trash2)}
        {renderInputAction("Moderate","youtube-api","set_moderation_status",[{key:"yt_mod_id",placeholder:"Comment ID"},{key:"yt_mod_st",placeholder:"published/heldForReview/rejected"}],()=>({comment_id:getInput("yt_mod_id"),status:getInput("yt_mod_st")||"published"}),Shield)}
      </TabsContent>
      <TabsContent value="playlists" className="space-y-2 mt-3">
        {renderActionButton("My Playlists","youtube-api","get_playlists",{limit:25},List)}
        {renderInputAction("Create Playlist","youtube-api","create_playlist",[{key:"yt_pl_title",placeholder:"Title"},{key:"yt_pl_desc",placeholder:"Description"}],()=>({title:getInput("yt_pl_title"),description:getInput("yt_pl_desc")}),FolderOpen)}
        {renderInputAction("Playlist Items","youtube-api","get_playlist_items",[{key:"yt_pli_id",placeholder:"Playlist ID"}],()=>({playlist_id:getInput("yt_pli_id"),limit:25}),Layers)}
        {renderInputAction("Add to Playlist","youtube-api","add_to_playlist",[{key:"yt_apl_pl",placeholder:"Playlist ID"},{key:"yt_apl_vid",placeholder:"Video ID"}],()=>({playlist_id:getInput("yt_apl_pl"),video_id:getInput("yt_apl_vid")}),UserPlus)}
        {renderInputAction("Remove from Playlist","youtube-api","remove_from_playlist",[{key:"yt_rpl_item",placeholder:"Playlist Item ID"}],()=>({playlist_item_id:getInput("yt_rpl_item")}),Trash2)}
        {renderInputAction("Delete Playlist","youtube-api","delete_playlist",[{key:"yt_dpl_id",placeholder:"Playlist ID"}],()=>({playlist_id:getInput("yt_dpl_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="subs" className="space-y-2 mt-3">
        {renderActionButton("My Subscriptions","youtube-api","get_subscriptions",{limit:25},Bell)}
        {renderInputAction("Subscribe","youtube-api","subscribe",[{key:"yt_sub_ch",placeholder:"Channel ID"}],()=>({channel_id:getInput("yt_sub_ch")}),UserPlus)}
        {renderInputAction("Unsubscribe","youtube-api","unsubscribe",[{key:"yt_unsub_id",placeholder:"Subscription ID"}],()=>({subscription_id:getInput("yt_unsub_id")}),UserMinus)}
      </TabsContent>
      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search","youtube-api","search",[{key:"yt_sq",placeholder:"Query"},{key:"yt_st",placeholder:"Type (video/channel/playlist)"}],()=>({query:getInput("yt_sq"),type:getInput("yt_st")||"video",limit:10}),Search)}
        {renderInputAction("Search My Channel","youtube-api","search_my_channel",[{key:"yt_smc",placeholder:"Query"}],()=>({query:getInput("yt_smc"),limit:10}),Search)}
      </TabsContent>
      <TabsContent value="live" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Broadcasts","youtube-api","list_live_broadcasts",{status:"all",limit:10},Radio)}
          {renderActionButton("Streams","youtube-api","list_live_streams",{limit:10},Activity)}
        </div>
        {renderInputAction("Create Broadcast","youtube-api","create_live_broadcast",[{key:"yt_lb_title",placeholder:"Title"},{key:"yt_lb_start",placeholder:"Start time (ISO)"}],()=>({title:getInput("yt_lb_title"),start_time:getInput("yt_lb_start")}),Radio)}
        {renderInputAction("Transition","youtube-api","transition_broadcast",[{key:"yt_tb_id",placeholder:"Broadcast ID"},{key:"yt_tb_st",placeholder:"Status (testing/live/complete)"}],()=>({broadcast_id:getInput("yt_tb_id"),status:getInput("yt_tb_st")}),Play)}
        {renderInputAction("Chat Messages","youtube-api","get_live_chat_messages",[{key:"yt_lc_id",placeholder:"Live Chat ID"}],()=>({live_chat_id:getInput("yt_lc_id"),limit:50}),MessageSquare)}
        {renderInputAction("Send Chat","youtube-api","send_live_chat_message",[{key:"yt_sc_id",placeholder:"Live Chat ID"},{key:"yt_sc_msg",placeholder:"Message"}],()=>({live_chat_id:getInput("yt_sc_id"),message:getInput("yt_sc_msg")}),Send)}
        {renderInputAction("Ban User","youtube-api","ban_live_chat_user",[{key:"yt_ban_chat",placeholder:"Live Chat ID"},{key:"yt_ban_ch",placeholder:"Channel ID"}],()=>({live_chat_id:getInput("yt_ban_chat"),channel_id:getInput("yt_ban_ch")}),Shield)}
      </TabsContent>
      <TabsContent value="analytics" className="space-y-2 mt-3">
        {renderActionButton("Channel Analytics","youtube-api","get_channel_analytics",{},BarChart3)}
        {renderActionButton("Demographics","youtube-api","get_demographics",{},Users)}
        {renderActionButton("Traffic Sources","youtube-api","get_traffic_sources",{},TrendingUp)}
        {renderInputAction("Video Analytics","youtube-api","get_video_analytics",[{key:"yt_va_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_va_vid")}),BarChart3)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Title/Description","social-ai-responder","generate_caption",[{key:"ai_yt_topic",placeholder:"Video topic"}],()=>({topic:getInput("ai_yt_topic"),platform:"youtube",include_cta:true}),Brain)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_yt_cmt",placeholder:"Comment text..."}],()=>({message_text:getInput("ai_yt_cmt"),sender_name:"viewer"}),Zap)}
        {renderInputAction("AI Tag Generator","social-ai-responder","generate_caption",[{key:"ai_yt_tags",placeholder:"Video topic"}],()=>({topic:`Generate 20 SEO-optimized YouTube tags for: ${getInput("ai_yt_tags")}`,platform:"youtube",include_cta:false}),Hash)}
        {renderInputAction("AI Script Outline","social-ai-responder","generate_caption",[{key:"ai_yt_script",placeholder:"Video topic"}],()=>({topic:`Write a YouTube video script outline with intro hook, 5 main points, and CTA for: ${getInput("ai_yt_script")}`,platform:"youtube",include_cta:true}),FileText)}
        {renderInputAction("AI Shorts Ideas","social-ai-responder","generate_caption",[{key:"ai_yt_shorts",placeholder:"Your niche"}],()=>({topic:`Generate 10 viral YouTube Shorts ideas with hooks for: ${getInput("ai_yt_shorts")}`,platform:"youtube",include_cta:false}),Video)}
        {renderInputAction("AI Live Chat Mod","social-ai-responder","generate_dm_reply",[{key:"ai_yt_live",placeholder:"Chat message..."}],()=>({message_text:getInput("ai_yt_live"),sender_name:"viewer"}),Radio)}
      </TabsContent>
    </Tabs>
  );

  const renderPinterestContent = () => (
    <Tabs defaultValue="pins" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"pins",l:"Pins",icon:Image},{v:"boards",l:"Boards",icon:Layers},{v:"search",l:"Search",icon:Search},{v:"analytics",l:"Analytics",icon:BarChart3},{v:"ads",l:"Ads",icon:Megaphone},{v:"catalogs",l:"Catalogs",icon:Briefcase},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="pins" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Account","pinterest-api","get_account",{},Users)}
          {renderActionButton("My Pins","pinterest-api","get_pins",{limit:25},Image)}
        </div>
        {renderInputAction("Create Pin","pinterest-api","create_pin",[{key:"pin_title",placeholder:"Title"},{key:"pin_desc",placeholder:"Description"},{key:"pin_board",placeholder:"Board ID"},{key:"pin_img",placeholder:"Image URL"},{key:"pin_link",placeholder:"Link URL (opt)"}],()=>({title:getInput("pin_title"),description:getInput("pin_desc"),board_id:getInput("pin_board"),image_url:getInput("pin_img"),link:getInput("pin_link")}),Image)}
        {renderInputAction("Update Pin","pinterest-api","update_pin",[{key:"pin_up_id",placeholder:"Pin ID"},{key:"pin_up_title",placeholder:"Title"},{key:"pin_up_desc",placeholder:"Description"}],()=>({pin_id:getInput("pin_up_id"),title:getInput("pin_up_title"),description:getInput("pin_up_desc")}),Settings)}
        {renderInputAction("Save Pin to Board","pinterest-api","save_pin",[{key:"pin_save_id",placeholder:"Pin ID"},{key:"pin_save_board",placeholder:"Board ID"}],()=>({pin_id:getInput("pin_save_id"),board_id:getInput("pin_save_board")}),Bookmark)}
        {renderInputAction("Get Pin","pinterest-api","get_pin",[{key:"pin_id",placeholder:"Pin ID"}],()=>({pin_id:getInput("pin_id")}),Eye)}
        {renderInputAction("Delete Pin","pinterest-api","delete_pin",[{key:"pin_del_id",placeholder:"Pin ID"}],()=>({pin_id:getInput("pin_del_id")}),Trash2)}
        {renderInputAction("Pin Analytics","pinterest-api","get_pin_analytics",[{key:"pin_an_id",placeholder:"Pin ID"}],()=>({pin_id:getInput("pin_an_id")}),BarChart3)}
      </TabsContent>
      <TabsContent value="boards" className="space-y-2 mt-3">
        {renderActionButton("My Boards","pinterest-api","get_boards",{limit:25},Layers)}
        {renderInputAction("Create Board","pinterest-api","create_board",[{key:"brd_name",placeholder:"Name"},{key:"brd_desc",placeholder:"Description"}],()=>({name:getInput("brd_name"),description:getInput("brd_desc")}),Layers)}
        {renderInputAction("Update Board","pinterest-api","update_board",[{key:"brd_up_id",placeholder:"Board ID"},{key:"brd_up_name",placeholder:"Name"},{key:"brd_up_desc",placeholder:"Description"}],()=>({board_id:getInput("brd_up_id"),name:getInput("brd_up_name"),description:getInput("brd_up_desc")}),Settings)}
        {renderInputAction("Board Pins","pinterest-api","get_board_pins",[{key:"brd_pins_id",placeholder:"Board ID"}],()=>({board_id:getInput("brd_pins_id"),limit:25}),Image)}
        {renderInputAction("Board Sections","pinterest-api","get_board_sections",[{key:"brd_sec_id",placeholder:"Board ID"}],()=>({board_id:getInput("brd_sec_id")}),FolderOpen)}
        {renderInputAction("Create Section","pinterest-api","create_board_section",[{key:"brd_cs_id",placeholder:"Board ID"},{key:"brd_cs_name",placeholder:"Section name"}],()=>({board_id:getInput("brd_cs_id"),name:getInput("brd_cs_name")}),FolderOpen)}
        {renderInputAction("Delete Board","pinterest-api","delete_board",[{key:"brd_del_id",placeholder:"Board ID"}],()=>({board_id:getInput("brd_del_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search Pins","pinterest-api","search_pins",[{key:"pin_sq",placeholder:"Query"}],()=>({query:getInput("pin_sq"),limit:10}),Search)}
        {renderInputAction("Search Boards","pinterest-api","search_boards",[{key:"brd_sq",placeholder:"Query"}],()=>({query:getInput("brd_sq"),limit:10}),Search)}
        {renderInputAction("Related Terms","pinterest-api","get_related_terms",[{key:"pin_rt",placeholder:"Term"}],()=>({term:getInput("pin_rt")}),Hash)}
        {renderInputAction("Suggested Terms","pinterest-api","get_suggested_terms",[{key:"pin_st",placeholder:"Term"}],()=>({term:getInput("pin_st"),limit:10}),TrendingUp)}
      </TabsContent>
      <TabsContent value="analytics" className="space-y-2 mt-3">
        {renderActionButton("Account Analytics","pinterest-api","get_account_analytics",{},BarChart3)}
        {renderActionButton("Top Pins","pinterest-api","get_top_pins",{},TrendingUp)}
        {renderActionButton("Top Video Pins","pinterest-api","get_top_video_pins",{},Video)}
      </TabsContent>
      <TabsContent value="ads" className="space-y-2 mt-3">
        {renderActionButton("Ad Accounts","pinterest-api","get_ad_accounts",{},Briefcase)}
        {renderInputAction("Campaigns","pinterest-api","get_campaigns",[{key:"pin_ad_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("pin_ad_aa")}),Target)}
        {renderInputAction("Ad Groups","pinterest-api","get_ad_groups",[{key:"pin_ag_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("pin_ag_aa")}),Layers)}
        {renderInputAction("Ads","pinterest-api","get_ads",[{key:"pin_ads_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("pin_ads_aa")}),Megaphone)}
        {renderInputAction("Ad Analytics","pinterest-api","get_ad_analytics",[{key:"pin_aan_id",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("pin_aan_id")}),BarChart3)}
        {renderInputAction("Keywords","pinterest-api","get_keywords",[{key:"pin_kw_aa",placeholder:"Ad Account ID"},{key:"pin_kw_ag",placeholder:"Ad Group ID"}],()=>({ad_account_id:getInput("pin_kw_aa"),ad_group_id:getInput("pin_kw_ag")}),Hash)}
      </TabsContent>
      <TabsContent value="catalogs" className="space-y-2 mt-3">
        {renderActionButton("Catalogs","pinterest-api","get_catalogs",{},Layers)}
        {renderActionButton("Feeds","pinterest-api","get_feeds",{},Activity)}
        {renderActionButton("Product Groups","pinterest-api","get_product_groups",{},Briefcase)}
        {renderInputAction("Get Items","pinterest-api","get_items",[{key:"pin_items_ids",placeholder:"Item IDs (comma sep)"}],()=>({item_ids:getInput("pin_items_ids").split(",").map(s=>s.trim())}),Eye)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Pin Description","social-ai-responder","generate_caption",[{key:"ai_pin_topic",placeholder:"Pin topic"}],()=>({topic:getInput("ai_pin_topic"),platform:"pinterest",include_cta:true}),Brain)}
        {renderInputAction("AI Board Strategy","social-ai-responder","generate_caption",[{key:"ai_pin_board",placeholder:"Your niche"}],()=>({topic:`Suggest 10 Pinterest board ideas with SEO-optimized names for: ${getInput("ai_pin_board")}`,platform:"pinterest",include_cta:false}),Layers)}
        {renderInputAction("AI SEO Keywords","social-ai-responder","generate_caption",[{key:"ai_pin_seo",placeholder:"Product/topic"}],()=>({topic:`Generate 20 Pinterest SEO keywords for: ${getInput("ai_pin_seo")}`,platform:"pinterest",include_cta:false}),Search)}
        {renderInputAction("AI Idea Pin Script","social-ai-responder","generate_caption",[{key:"ai_pin_idea",placeholder:"Topic"}],()=>({topic:`Write a 5-slide Pinterest Idea Pin script for: ${getInput("ai_pin_idea")}`,platform:"pinterest",include_cta:true}),Play)}
      </TabsContent>
    </Tabs>
  );

  const renderDiscordContent = () => (
    <Tabs defaultValue="messages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"messages",l:"Messages",icon:Send},{v:"guilds",l:"Servers",icon:Globe},{v:"members",l:"Members",icon:Users},{v:"roles",l:"Roles",icon:Shield},{v:"channels",l:"Channels",icon:Hash},{v:"threads",l:"Threads",icon:Layers},{v:"webhooks",l:"Webhooks",icon:Zap},{v:"events",l:"Events",icon:Calendar},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="messages" className="space-y-2 mt-3">
        {renderInputAction("Get Messages","discord-api","get_messages",[{key:"dc_msg_ch",placeholder:"Channel ID"}],()=>({channel_id:getInput("dc_msg_ch"),limit:50}),MessageSquare)}
        {renderInputAction("Send Message","discord-api","send_message",[{key:"dc_send_ch",placeholder:"Channel ID"},{key:"dc_send_text",placeholder:"Message"}],()=>({channel_id:getInput("dc_send_ch"),content:getInput("dc_send_text")}),Send)}
        {renderInputAction("Edit Message","discord-api","edit_message",[{key:"dc_edit_ch",placeholder:"Channel ID"},{key:"dc_edit_msg",placeholder:"Message ID"},{key:"dc_edit_text",placeholder:"New content"}],()=>({channel_id:getInput("dc_edit_ch"),message_id:getInput("dc_edit_msg"),content:getInput("dc_edit_text")}),FileText)}
        {renderInputAction("Delete Message","discord-api","delete_message",[{key:"dc_del_ch",placeholder:"Channel ID"},{key:"dc_del_msg",placeholder:"Message ID"}],()=>({channel_id:getInput("dc_del_ch"),message_id:getInput("dc_del_msg")}),Trash2)}
        {renderInputAction("Bulk Delete","discord-api","bulk_delete_messages",[{key:"dc_bdel_ch",placeholder:"Channel ID"},{key:"dc_bdel_ids",placeholder:"Message IDs (comma sep)"}],()=>({channel_id:getInput("dc_bdel_ch"),message_ids:getInput("dc_bdel_ids").split(",").map(s=>s.trim())}),Trash2)}
        {renderInputAction("Pin","discord-api","pin_message",[{key:"dc_pin_ch",placeholder:"Channel ID"},{key:"dc_pin_msg",placeholder:"Message ID"}],()=>({channel_id:getInput("dc_pin_ch"),message_id:getInput("dc_pin_msg")}),Pin)}
        {renderInputAction("Unpin","discord-api","unpin_message",[{key:"dc_upin_ch",placeholder:"Channel ID"},{key:"dc_upin_msg",placeholder:"Message ID"}],()=>({channel_id:getInput("dc_upin_ch"),message_id:getInput("dc_upin_msg")}),PinOff)}
        {renderInputAction("Pinned","discord-api","get_pinned_messages",[{key:"dc_gpins_ch",placeholder:"Channel ID"}],()=>({channel_id:getInput("dc_gpins_ch")}),Pin)}
        {renderInputAction("React","discord-api","add_reaction",[{key:"dc_react_ch",placeholder:"Channel ID"},{key:"dc_react_msg",placeholder:"Message ID"},{key:"dc_react_emoji",placeholder:"Emoji"}],()=>({channel_id:getInput("dc_react_ch"),message_id:getInput("dc_react_msg"),emoji:getInput("dc_react_emoji")}),Heart)}
        {renderInputAction("Remove Reaction","discord-api","remove_reaction",[{key:"dc_rr_ch",placeholder:"Channel ID"},{key:"dc_rr_msg",placeholder:"Message ID"},{key:"dc_rr_emoji",placeholder:"Emoji"}],()=>({channel_id:getInput("dc_rr_ch"),message_id:getInput("dc_rr_msg"),emoji:getInput("dc_rr_emoji")}),Heart)}
      </TabsContent>
      <TabsContent value="guilds" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Me","discord-api","get_me",{},Users)}
          {renderActionButton("My Servers","discord-api","get_my_guilds",{limit:100},Globe)}
        </div>
        {renderInputAction("Get Server","discord-api","get_guild",[{key:"dc_guild_id",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_guild_id")}),Globe)}
        {renderInputAction("Preview","discord-api","get_guild_preview",[{key:"dc_gp_id",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_gp_id")}),Eye)}
        {renderInputAction("Channels","discord-api","get_guild_channels",[{key:"dc_gch_id",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_gch_id")}),Hash)}
        {renderInputAction("Create Channel","discord-api","create_guild_channel",[{key:"dc_cch_gid",placeholder:"Server ID"},{key:"dc_cch_name",placeholder:"Channel name"}],()=>({guild_id:getInput("dc_cch_gid"),name:getInput("dc_cch_name")}),Hash)}
        {renderInputAction("Invites","discord-api","get_guild_invites",[{key:"dc_inv_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_inv_gid")}),Link2)}
        {renderInputAction("Audit Log","discord-api","get_audit_log",[{key:"dc_al_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_al_gid"),limit:50}),Activity)}
      </TabsContent>
      <TabsContent value="members" className="space-y-2 mt-3">
        {renderInputAction("List Members","discord-api","get_guild_members",[{key:"dc_mem_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_mem_gid"),limit:100}),Users)}
        {renderInputAction("Get Member","discord-api","get_guild_member",[{key:"dc_gm_gid",placeholder:"Server ID"},{key:"dc_gm_uid",placeholder:"User ID"}],()=>({guild_id:getInput("dc_gm_gid"),user_id:getInput("dc_gm_uid")}),Eye)}
        {renderInputAction("Modify Member","discord-api","modify_guild_member",[{key:"dc_mm_gid",placeholder:"Server ID"},{key:"dc_mm_uid",placeholder:"User ID"},{key:"dc_mm_nick",placeholder:"Nickname"}],()=>({guild_id:getInput("dc_mm_gid"),user_id:getInput("dc_mm_uid"),nick:getInput("dc_mm_nick")}),Settings)}
        {renderInputAction("Add Role","discord-api","add_member_role",[{key:"dc_ar_gid",placeholder:"Server ID"},{key:"dc_ar_uid",placeholder:"User ID"},{key:"dc_ar_rid",placeholder:"Role ID"}],()=>({guild_id:getInput("dc_ar_gid"),user_id:getInput("dc_ar_uid"),role_id:getInput("dc_ar_rid")}),Award)}
        {renderInputAction("Remove Role","discord-api","remove_member_role",[{key:"dc_rmr_gid",placeholder:"Server ID"},{key:"dc_rmr_uid",placeholder:"User ID"},{key:"dc_rmr_rid",placeholder:"Role ID"}],()=>({guild_id:getInput("dc_rmr_gid"),user_id:getInput("dc_rmr_uid"),role_id:getInput("dc_rmr_rid")}),UserMinus)}
        {renderInputAction("Kick","discord-api","kick_member",[{key:"dc_kick_gid",placeholder:"Server ID"},{key:"dc_kick_uid",placeholder:"User ID"}],()=>({guild_id:getInput("dc_kick_gid"),user_id:getInput("dc_kick_uid")}),UserMinus)}
        {renderInputAction("Ban","discord-api","ban_member",[{key:"dc_ban_gid",placeholder:"Server ID"},{key:"dc_ban_uid",placeholder:"User ID"}],()=>({guild_id:getInput("dc_ban_gid"),user_id:getInput("dc_ban_uid")}),Shield)}
        {renderInputAction("Unban","discord-api","unban_member",[{key:"dc_unban_gid",placeholder:"Server ID"},{key:"dc_unban_uid",placeholder:"User ID"}],()=>({guild_id:getInput("dc_unban_gid"),user_id:getInput("dc_unban_uid")}),UserPlus)}
        {renderInputAction("Ban List","discord-api","get_bans",[{key:"dc_bans_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_bans_gid"),limit:100}),Shield)}
      </TabsContent>
      <TabsContent value="roles" className="space-y-2 mt-3">
        {renderInputAction("List Roles","discord-api","get_roles",[{key:"dc_roles_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_roles_gid")}),Shield)}
        {renderInputAction("Create Role","discord-api","create_role",[{key:"dc_cr_gid",placeholder:"Server ID"},{key:"dc_cr_name",placeholder:"Role name"}],()=>({guild_id:getInput("dc_cr_gid"),name:getInput("dc_cr_name")}),Shield)}
        {renderInputAction("Modify Role","discord-api","modify_role",[{key:"dc_mr_gid",placeholder:"Server ID"},{key:"dc_mr_rid",placeholder:"Role ID"},{key:"dc_mr_name",placeholder:"New name"}],()=>({guild_id:getInput("dc_mr_gid"),role_id:getInput("dc_mr_rid"),name:getInput("dc_mr_name")}),Settings)}
        {renderInputAction("Delete Role","discord-api","delete_role",[{key:"dc_dr_gid",placeholder:"Server ID"},{key:"dc_dr_rid",placeholder:"Role ID"}],()=>({guild_id:getInput("dc_dr_gid"),role_id:getInput("dc_dr_rid")}),Trash2)}
      </TabsContent>
      <TabsContent value="channels" className="space-y-2 mt-3">
        {renderInputAction("Get Channel","discord-api","get_channel",[{key:"dc_ch_id",placeholder:"Channel ID"}],()=>({channel_id:getInput("dc_ch_id")}),Hash)}
        {renderInputAction("Modify Channel","discord-api","modify_channel",[{key:"dc_mch_id",placeholder:"Channel ID"},{key:"dc_mch_name",placeholder:"Name"},{key:"dc_mch_topic",placeholder:"Topic"}],()=>({channel_id:getInput("dc_mch_id"),name:getInput("dc_mch_name"),topic:getInput("dc_mch_topic")}),Settings)}
        {renderInputAction("Delete Channel","discord-api","delete_channel",[{key:"dc_dch_id",placeholder:"Channel ID"}],()=>({channel_id:getInput("dc_dch_id")}),Trash2)}
        {renderInputAction("Create Invite","discord-api","create_invite",[{key:"dc_ci_ch",placeholder:"Channel ID"}],()=>({channel_id:getInput("dc_ci_ch")}),Link2)}
      </TabsContent>
      <TabsContent value="threads" className="space-y-2 mt-3">
        {renderInputAction("Create Thread","discord-api","create_thread",[{key:"dc_thr_ch",placeholder:"Channel ID"},{key:"dc_thr_name",placeholder:"Thread name"}],()=>({channel_id:getInput("dc_thr_ch"),name:getInput("dc_thr_name")}),Layers)}
        {renderInputAction("Thread from Msg","discord-api","create_thread_from_message",[{key:"dc_tfm_ch",placeholder:"Channel ID"},{key:"dc_tfm_msg",placeholder:"Message ID"},{key:"dc_tfm_name",placeholder:"Thread name"}],()=>({channel_id:getInput("dc_tfm_ch"),message_id:getInput("dc_tfm_msg"),name:getInput("dc_tfm_name")}),Layers)}
        {renderInputAction("Active Threads","discord-api","get_active_threads",[{key:"dc_at_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_at_gid")}),Layers)}
        {renderInputAction("Join Thread","discord-api","join_thread",[{key:"dc_jt_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("dc_jt_id")}),UserPlus)}
        {renderInputAction("Leave Thread","discord-api","leave_thread",[{key:"dc_lt_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("dc_lt_id")}),UserMinus)}
      </TabsContent>
      <TabsContent value="webhooks" className="space-y-2 mt-3">
        {renderInputAction("Server Webhooks","discord-api","get_guild_webhooks",[{key:"dc_wh_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_wh_gid")}),Zap)}
        {renderInputAction("Channel Webhooks","discord-api","get_channel_webhooks",[{key:"dc_cwh_ch",placeholder:"Channel ID"}],()=>({channel_id:getInput("dc_cwh_ch")}),Zap)}
        {renderInputAction("Create Webhook","discord-api","create_webhook",[{key:"dc_cwh2_ch",placeholder:"Channel ID"},{key:"dc_cwh2_name",placeholder:"Name"}],()=>({channel_id:getInput("dc_cwh2_ch"),name:getInput("dc_cwh2_name")}),Zap)}
        {renderInputAction("Execute Webhook","discord-api","execute_webhook",[{key:"dc_ewh_id",placeholder:"Webhook ID"},{key:"dc_ewh_token",placeholder:"Token"},{key:"dc_ewh_content",placeholder:"Message"}],()=>({webhook_id:getInput("dc_ewh_id"),webhook_token:getInput("dc_ewh_token"),content:getInput("dc_ewh_content")}),Send)}
        {renderInputAction("Delete Webhook","discord-api","delete_webhook",[{key:"dc_dwh_id",placeholder:"Webhook ID"}],()=>({webhook_id:getInput("dc_dwh_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="events" className="space-y-2 mt-3">
        {renderInputAction("Events","discord-api","get_guild_events",[{key:"dc_ev_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_ev_gid")}),Clock)}
        {renderInputAction("Create Event","discord-api","create_guild_event",[{key:"dc_cev_gid",placeholder:"Server ID"},{key:"dc_cev_name",placeholder:"Name"},{key:"dc_cev_start",placeholder:"Start (ISO)"},{key:"dc_cev_loc",placeholder:"Location"}],()=>({guild_id:getInput("dc_cev_gid"),name:getInput("dc_cev_name"),start_time:getInput("dc_cev_start"),location:getInput("dc_cev_loc")}),Clock)}
        {renderInputAction("Emojis","discord-api","get_guild_emojis",[{key:"dc_em_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_em_gid")}),Star)}
        {renderInputAction("AutoMod Rules","discord-api","get_automod_rules",[{key:"dc_am_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_am_gid")}),Shield)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Announcement","social-ai-responder","generate_caption",[{key:"ai_dc_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_dc_topic"),platform:"discord",include_cta:true}),Brain)}
        {renderInputAction("AI Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_dc_msg",placeholder:"Message to reply..."}],()=>({message_text:getInput("ai_dc_msg"),sender_name:"member"}),Zap)}
        {renderInputAction("AI Welcome","social-ai-responder","generate_caption",[{key:"ai_dc_welcome",placeholder:"Server theme"}],()=>({topic:`Write a Discord welcome message with rules for: ${getInput("ai_dc_welcome")}`,platform:"discord",include_cta:false}),UserPlus)}
        {renderInputAction("AI Server Rules","social-ai-responder","generate_caption",[{key:"ai_dc_rules",placeholder:"Community type"}],()=>({topic:`Write 10 Discord server rules for: ${getInput("ai_dc_rules")}`,platform:"discord",include_cta:false}),Flag)}
        {renderInputAction("AI Engagement","social-ai-responder","generate_caption",[{key:"ai_dc_engage",placeholder:"Niche"}],()=>({topic:`Generate 5 Discord engagement activities for: ${getInput("ai_dc_engage")}`,platform:"discord",include_cta:false}),Star)}
      </TabsContent>
    </Tabs>
  );

  const renderFacebookContent = () => (
    <Tabs defaultValue="pages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"pages",l:"Pages",icon:Globe},{v:"posts",l:"Posts",icon:FileText},{v:"publish",l:"Publish",icon:Send},{v:"comments",l:"Comments",icon:MessageSquare},{v:"groups",l:"Groups",icon:Users},{v:"inbox",l:"Inbox",icon:MessageCircle},{v:"insights",l:"Insights",icon:BarChart3},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="pages" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Profile","facebook-api","get_profile",{},Users)}
          {renderActionButton("My Pages","facebook-api","get_pages",{limit:25},Globe)}
        </div>
        {renderInputAction("Get Page","facebook-api","get_page",[{key:"fb_pg_id",placeholder:"Page ID"}],()=>({page_id:getInput("fb_pg_id")}),Eye)}
        {renderInputAction("Get User","facebook-api","get_user",[{key:"fb_uid",placeholder:"User ID"}],()=>({user_id:getInput("fb_uid")}),Users)}
        {renderInputAction("Search Pages","facebook-api","search_pages",[{key:"fb_sp_q",placeholder:"Search query"}],()=>({query:getInput("fb_sp_q"),limit:10}),Search)}
      </TabsContent>
      <TabsContent value="posts" className="space-y-2 mt-3">
        {renderActionButton("My Feed","facebook-api","get_feed",{limit:25},FileText)}
        {renderInputAction("Page Feed","facebook-api","get_feed",[{key:"fb_pf_id",placeholder:"Page ID"}],()=>({page_id:getInput("fb_pf_id"),limit:25}),FileText)}
        {renderInputAction("Get Post","facebook-api","get_post",[{key:"fb_gp_id",placeholder:"Post ID"}],()=>({post_id:getInput("fb_gp_id")}),Eye)}
        {renderInputAction("Delete Post","facebook-api","delete_post",[{key:"fb_dp_id",placeholder:"Post ID"}],()=>({post_id:getInput("fb_dp_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Text Post","facebook-api","create_post",[{key:"fb_cp_msg",placeholder:"Message"},{key:"fb_cp_pid",placeholder:"Page ID (opt)"}],()=>({message:getInput("fb_cp_msg"),page_id:getInput("fb_cp_pid")||undefined}),Send)}
        {renderInputAction("Link Post","facebook-api","create_post",[{key:"fb_lp_msg",placeholder:"Message"},{key:"fb_lp_link",placeholder:"URL"},{key:"fb_lp_pid",placeholder:"Page ID (opt)"}],()=>({message:getInput("fb_lp_msg"),link:getInput("fb_lp_link"),page_id:getInput("fb_lp_pid")||undefined}),Link2)}
        {renderInputAction("Photo Post","facebook-api","create_photo_post",[{key:"fb_pp_url",placeholder:"Image URL"},{key:"fb_pp_cap",placeholder:"Caption"},{key:"fb_pp_pid",placeholder:"Page ID (opt)"}],()=>({image_url:getInput("fb_pp_url"),caption:getInput("fb_pp_cap"),page_id:getInput("fb_pp_pid")||undefined}),Image)}
        {renderInputAction("Video Post","facebook-api","create_video_post",[{key:"fb_vp_url",placeholder:"Video URL"},{key:"fb_vp_desc",placeholder:"Description"},{key:"fb_vp_pid",placeholder:"Page ID (opt)"}],()=>({video_url:getInput("fb_vp_url"),description:getInput("fb_vp_desc"),page_id:getInput("fb_vp_pid")||undefined}),Video)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments","facebook-api","get_comments",[{key:"fb_gc_oid",placeholder:"Post/Object ID"}],()=>({object_id:getInput("fb_gc_oid"),limit:50}),MessageSquare)}
        {renderInputAction("Post Comment","facebook-api","post_comment",[{key:"fb_pc_oid",placeholder:"Post ID"},{key:"fb_pc_msg",placeholder:"Comment..."}],()=>({object_id:getInput("fb_pc_oid"),message:getInput("fb_pc_msg")}),Send)}
        {renderInputAction("Delete Comment","facebook-api","delete_comment",[{key:"fb_dc_id",placeholder:"Comment ID"}],()=>({comment_id:getInput("fb_dc_id")}),Trash2)}
        {renderInputAction("Hide Comment","facebook-api","hide_comment",[{key:"fb_hc_id",placeholder:"Comment ID"}],()=>({comment_id:getInput("fb_hc_id")}),EyeOff)}
        {renderInputAction("Get Reactions","facebook-api","get_reactions",[{key:"fb_gr_oid",placeholder:"Post/Object ID"}],()=>({object_id:getInput("fb_gr_oid"),limit:50}),Heart)}
      </TabsContent>
      <TabsContent value="groups" className="space-y-2 mt-3">
        {renderActionButton("My Groups","facebook-api","get_groups",{limit:25},Users)}
        {renderInputAction("Group Feed","facebook-api","get_group_feed",[{key:"fb_gf_id",placeholder:"Group ID"}],()=>({group_id:getInput("fb_gf_id"),limit:25}),FileText)}
        {renderInputAction("Post to Group","facebook-api","post_to_group",[{key:"fb_pg_gid",placeholder:"Group ID"},{key:"fb_pg_msg",placeholder:"Message"}],()=>({group_id:getInput("fb_pg_gid"),message:getInput("fb_pg_msg")}),Send)}
        {renderInputAction("Events","facebook-api","get_events",[{key:"fb_ev_pid",placeholder:"Page ID (opt)"}],()=>({page_id:getInput("fb_ev_pid")||undefined}),Calendar)}
        {renderInputAction("Albums","facebook-api","get_albums",[{key:"fb_al_pid",placeholder:"Page ID (opt)"}],()=>({page_id:getInput("fb_al_pid")||undefined}),Image)}
        {renderInputAction("Album Photos","facebook-api","get_album_photos",[{key:"fb_ap_id",placeholder:"Album ID"}],()=>({album_id:getInput("fb_ap_id"),limit:25}),Image)}
      </TabsContent>
      <TabsContent value="inbox" className="space-y-2 mt-3">
        {renderInputAction("Page Conversations","facebook-api","get_conversations",[{key:"fb_cv_pid",placeholder:"Page ID"}],()=>({page_id:getInput("fb_cv_pid"),limit:20}),MessageCircle)}
        {renderInputAction("Messages","facebook-api","get_conversation_messages",[{key:"fb_cm_cid",placeholder:"Conversation ID"}],()=>({conversation_id:getInput("fb_cm_cid"),limit:20}),MessageSquare)}
        {renderInputAction("Send Page Message","facebook-api","send_page_message",[{key:"fb_sm_pid",placeholder:"Page ID"},{key:"fb_sm_rid",placeholder:"Recipient ID"},{key:"fb_sm_msg",placeholder:"Message"}],()=>({page_id:getInput("fb_sm_pid"),recipient_id:getInput("fb_sm_rid"),message:getInput("fb_sm_msg")}),Send)}
      </TabsContent>
      <TabsContent value="insights" className="space-y-2 mt-3">
        {renderInputAction("Page Insights","facebook-api","get_page_insights",[{key:"fb_pi_pid",placeholder:"Page ID"}],()=>({page_id:getInput("fb_pi_pid")}),BarChart3)}
        {renderInputAction("Post Insights","facebook-api","get_post_insights",[{key:"fb_poi_pid",placeholder:"Post ID"}],()=>({post_id:getInput("fb_poi_pid")}),TrendingUp)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Post","social-ai-responder","generate_caption",[{key:"ai_fb_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_fb_topic"),platform:"facebook",include_cta:true}),Brain)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_fb_cmt",placeholder:"Comment text..."}],()=>({message_text:getInput("ai_fb_cmt"),sender_name:"user"}),Zap)}
        {renderInputAction("AI DM Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_fb_dm",placeholder:"Incoming message..."}],()=>({message_text:getInput("ai_fb_dm"),sender_name:"visitor"}),Send)}
        {renderInputAction("AI Ad Copy","social-ai-responder","generate_caption",[{key:"ai_fb_ad",placeholder:"Product/service"}],()=>({topic:`Write Facebook ad copy with headline, primary text, and description for: ${getInput("ai_fb_ad")}`,platform:"facebook",include_cta:true}),Megaphone)}
        {renderInputAction("AI Group Post","social-ai-responder","generate_caption",[{key:"ai_fb_grp",placeholder:"Group topic"}],()=>({topic:`Write an engaging Facebook group post that sparks discussion about: ${getInput("ai_fb_grp")}`,platform:"facebook",include_cta:false}),Users)}
        {renderInputAction("AI Hashtag Strategy","social-ai-responder","generate_caption",[{key:"ai_fb_ht",placeholder:"Niche"}],()=>({topic:`Generate 15 Facebook hashtags for maximum reach in: ${getInput("ai_fb_ht")}`,platform:"facebook",include_cta:false}),Hash)}
      </TabsContent>
    </Tabs>
  );

  const renderLinkedInContent = () => (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"profile",l:"Profile",icon:Users},{v:"posts",l:"Posts",icon:FileText},{v:"publish",l:"Publish",icon:Send},{v:"engage",l:"Engage",icon:Heart},{v:"comments",l:"Comments",icon:MessageSquare},{v:"org",l:"Organization",icon:Briefcase},{v:"messaging",l:"Messages",icon:MessageCircle},{v:"search",l:"Search",icon:Search},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="profile" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Profile","linkedin-api","get_profile",{},Users)}
          {renderActionButton("Full Profile","linkedin-api","get_me",{},Eye)}
          {renderActionButton("Connections","linkedin-api","get_connections",{limit:50},UserPlus)}
        </div>
      </TabsContent>
      <TabsContent value="posts" className="space-y-2 mt-3">
        {renderActionButton("My Posts","linkedin-api","get_posts",{limit:20},FileText)}
        {renderInputAction("Delete Post","linkedin-api","delete_post",[{key:"li_del_urn",placeholder:"Post URN"}],()=>({post_urn:getInput("li_del_urn")}),Trash2)}
      </TabsContent>
      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Text Post","linkedin-api","create_text_post",[{key:"li_text",placeholder:"What do you want to talk about?"}],()=>({text:getInput("li_text")}),Send)}
        {renderInputAction("Article Post","linkedin-api","create_article_post",[{key:"li_art_text",placeholder:"Commentary"},{key:"li_art_url",placeholder:"Article URL"},{key:"li_art_title",placeholder:"Title"}],()=>({text:getInput("li_art_text"),article_url:getInput("li_art_url"),title:getInput("li_art_title")}),Link2)}
        {renderInputAction("Image Post","linkedin-api","create_image_post",[{key:"li_img_text",placeholder:"Caption"},{key:"li_img_url",placeholder:"Image URL"}],()=>({text:getInput("li_img_text"),image_url:getInput("li_img_url")}),Image)}
      </TabsContent>
      <TabsContent value="engage" className="space-y-2 mt-3">
        {renderInputAction("React (LIKE)","linkedin-api","react_to_post",[{key:"li_react_urn",placeholder:"Post URN"}],()=>({post_urn:getInput("li_react_urn"),reaction_type:"LIKE"}),Heart)}
        {renderInputAction("React (CELEBRATE)","linkedin-api","react_to_post",[{key:"li_cele_urn",placeholder:"Post URN"}],()=>({post_urn:getInput("li_cele_urn"),reaction_type:"PRAISE"}),Star)}
        {renderInputAction("React (SUPPORT)","linkedin-api","react_to_post",[{key:"li_supp_urn",placeholder:"Post URN"}],()=>({post_urn:getInput("li_supp_urn"),reaction_type:"EMPATHY"}),Heart)}
        {renderInputAction("Remove Reaction","linkedin-api","delete_reaction",[{key:"li_unreact_urn",placeholder:"Post URN"}],()=>({post_urn:getInput("li_unreact_urn")}),Heart)}
        {renderInputAction("Get Reactions","linkedin-api","get_reactions",[{key:"li_gr_urn",placeholder:"Post URN"}],()=>({post_urn:getInput("li_gr_urn"),limit:20}),TrendingUp)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments","linkedin-api","get_comments",[{key:"li_gc_urn",placeholder:"Post URN"}],()=>({post_urn:getInput("li_gc_urn"),limit:20}),MessageSquare)}
        {renderInputAction("Add Comment","linkedin-api","create_comment",[{key:"li_cc_urn",placeholder:"Post URN"},{key:"li_cc_text",placeholder:"Comment..."}],()=>({post_urn:getInput("li_cc_urn"),text:getInput("li_cc_text")}),Send)}
        {renderInputAction("Delete Comment","linkedin-api","delete_comment",[{key:"li_dc_urn",placeholder:"Post URN"},{key:"li_dc_cid",placeholder:"Comment ID"}],()=>({post_urn:getInput("li_dc_urn"),comment_id:getInput("li_dc_cid")}),Trash2)}
      </TabsContent>
      <TabsContent value="org" className="space-y-2 mt-3">
        {renderInputAction("Get Organization","linkedin-api","get_organization",[{key:"li_org_id",placeholder:"Organization ID"}],()=>({org_id:getInput("li_org_id")}),Briefcase)}
        {renderInputAction("Org Followers","linkedin-api","get_organization_followers",[{key:"li_of_id",placeholder:"Organization ID"}],()=>({org_id:getInput("li_of_id")}),Users)}
        {renderInputAction("Org Posts","linkedin-api","get_organization_posts",[{key:"li_op_id",placeholder:"Organization ID"}],()=>({org_id:getInput("li_op_id"),limit:20}),FileText)}
        {renderInputAction("Post as Org","linkedin-api","create_org_post",[{key:"li_cop_id",placeholder:"Organization ID"},{key:"li_cop_text",placeholder:"Post text"}],()=>({org_id:getInput("li_cop_id"),text:getInput("li_cop_text")}),Send)}
        {renderInputAction("Share Stats","linkedin-api","get_share_statistics",[{key:"li_ss_org",placeholder:"Organization ID (opt)"}],()=>({org_id:getInput("li_ss_org")||undefined}),BarChart3)}
      </TabsContent>
      <TabsContent value="messaging" className="space-y-2 mt-3">
        {renderActionButton("Conversations","linkedin-api","get_conversations",{limit:20},MessageCircle)}
        {renderInputAction("Send Message","linkedin-api","send_message",[{key:"li_msg_to",placeholder:"Recipient Person ID"},{key:"li_msg_text",placeholder:"Message"}],()=>({recipient_id:getInput("li_msg_to"),text:getInput("li_msg_text")}),Send)}
      </TabsContent>
      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search People","linkedin-api","search_people",[{key:"li_sp_q",placeholder:"Keywords"}],()=>({query:getInput("li_sp_q"),limit:10}),Search)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Post","social-ai-responder","generate_caption",[{key:"ai_li_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_li_topic"),platform:"linkedin",include_cta:true}),Brain)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_li_cmt",placeholder:"Comment text..."}],()=>({message_text:getInput("ai_li_cmt"),sender_name:"connection"}),Zap)}
        {renderInputAction("AI Article Outline","social-ai-responder","generate_caption",[{key:"ai_li_article",placeholder:"Article topic"}],()=>({topic:`Write a professional LinkedIn article outline with sections for: ${getInput("ai_li_article")}`,platform:"linkedin",include_cta:true}),FileText)}
        {renderInputAction("AI InMail","social-ai-responder","generate_caption",[{key:"ai_li_inmail",placeholder:"Purpose of outreach"}],()=>({topic:`Write a professional LinkedIn InMail/connection request for: ${getInput("ai_li_inmail")}`,platform:"linkedin",include_cta:false}),Send)}
        {renderInputAction("AI Headline","social-ai-responder","generate_caption",[{key:"ai_li_headline",placeholder:"Your role/expertise"}],()=>({topic:`Write 5 compelling LinkedIn headline options for someone who: ${getInput("ai_li_headline")}`,platform:"linkedin",include_cta:false}),Users)}
        {renderInputAction("AI Content Calendar","social-ai-responder","generate_caption",[{key:"ai_li_cal",placeholder:"Industry/niche"}],()=>({topic:`Create a 7-day LinkedIn content calendar with post types and hooks for: ${getInput("ai_li_cal")}`,platform:"linkedin",include_cta:false}),Calendar)}
      </TabsContent>
    </Tabs>
  );

  const renderPlatformContent = (platformId: string) => {
    switch (platformId) {
      case "instagram": return renderInstagramContent();
      case "twitter": return renderTwitterContent();
      case "reddit": return renderRedditContent();
      case "telegram": return renderTelegramContent();
      case "tiktok": return renderTikTokContent();
      case "snapchat": return renderSnapchatContent();
      case "threads": return renderThreadsContent();
      case "whatsapp": return renderWhatsAppContent();
      case "signal": return renderSignalContent();
      case "youtube": return renderYouTubeContent();
      case "pinterest": return renderPinterestContent();
      case "discord": return renderDiscordContent();
      case "facebook": return renderFacebookContent();
      case "linkedin": return renderLinkedInContent();
      default: return null;
    }
  };

  return (
    <div className="space-y-4" style={{ zoom: 1.5, transformOrigin: "top left" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Social Networks API Hub</h3>
          <Badge variant="outline" className="text-[10px] text-foreground border-border">14 platforms</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {platforms.map(p => {
          const connected = isConnected(p.id);
          const logo = platformLogos[p.id];
          return (
            <Card key={p.id} className={`transition-all duration-200 cursor-pointer border ${
              connected
                ? `${p.borderColor} bg-card hover:bg-accent/10`
                : "border-border bg-card/50 hover:bg-card/80 opacity-70 hover:opacity-90"
            }`}>
              <button
                onClick={() => handlePlatformClick(p.id)}
                className="w-full p-5 flex items-center gap-4 transition-colors rounded-xl"
              >
                <div className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 ${connected ? p.bgColor : "bg-muted/30"}`}>
                  {logo}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-base font-semibold text-foreground">{p.name}</p>
                  <p className={`text-xs mt-0.5 ${connected ? "text-green-400" : "text-muted-foreground"}`}>
                    {connected ? "Connected · Full API · AI Automation Ready" : "Not connected — Click to set up in Connect tab"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {connected ? (
                    <Badge className="bg-green-500/15 text-green-400 text-[10px] border border-green-500/30 gap-1.5 px-2.5 py-1">
                      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px] border-border gap-1.5 px-2.5 py-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />Offline
                    </Badge>
                  )}
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedPlatform === p.id ? "rotate-90" : ""}`} />
                </div>
              </button>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!expandedPlatform} onOpenChange={(open) => { if (!open) setExpandedPlatform(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden border-border text-foreground" style={{ zoom: 1, background: "hsl(222, 30%, 8%)", color: "hsl(0, 0%, 95%)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground">
              {expandedPlatform && (() => {
                const p = platforms.find(pl => pl.id === expandedPlatform);
                if (!p) return null;
                const logo = platformLogos[p.id];
                return (<><div className={`h-9 w-9 rounded-lg flex items-center justify-center ${p.bgColor}`}>{logo}</div><span>{p.name} — Full API Control Center</span></>);
              })()}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] pr-2">
            {expandedPlatform && renderPlatformContent(expandedPlatform)}
            
            {/* Visual API Response */}
            {result && (
              <div className="mt-4 space-y-3">
                <div className="bg-muted/30 border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                      <p className="text-xs font-semibold text-foreground">Response</p>
                      <Badge variant="outline" className="text-[9px] h-4 border-border text-muted-foreground">
                        {Array.isArray(result) ? `${result.length} items` : Array.isArray(result?.data) ? `${result.data.length} items` : "object"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-foreground hover:bg-muted/50" onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success("Copied"); }}>
                        <Copy className="h-3 w-3 mr-1" />Copy
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-foreground hover:bg-muted/50" onClick={() => setResult(null)}>
                        <Trash2 className="h-3 w-3 mr-1" />Clear
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="max-h-[250px]">
                    {renderVisualResponse(result)}
                  </ScrollArea>
                </div>
                
                <details className="group">
                  <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                    Raw API Response (JSON)
                  </summary>
                  <pre className="mt-2 text-[10px] text-muted-foreground bg-muted/20 border border-border rounded-lg p-3 overflow-auto max-h-[200px] whitespace-pre-wrap break-all font-mono">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialNetworksTab;
