import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, MessageSquare, Image, DollarSign, Clock,
  GitBranch, Save, Copy, Zap, HelpCircle, Send, Film,
  ChevronDown, ChevronUp, GripVertical, ArrowDown, Eye,
  Sparkles, Loader2, Crown, Timer, BookOpen, Lightbulb,
  Download, FileSpreadsheet, FileText, AlertTriangle,
  Brain, CheckCircle2, TrendingUp, Shield, Target, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ScriptFlowView from "./ScriptFlowView";
import ExcelJS from "exceljs";

interface ScriptStep {
  id?: string;
  step_order: number;
  step_type: string;
  title: string;
  content: string;
  media_url: string;
  media_type: string;
  price: number;
  delay_minutes: number;
  condition_logic: any;
  conversion_rate: number;
  drop_off_rate: number;
  revenue_generated: number;
  impressions: number;
}

interface Script {
  id?: string;
  title: string;
  description: string;
  category: string;
  status: string;
  target_segment: string;
  version: number;
}

const CATEGORIES = ["onboarding", "retention", "upsell", "premium", "reactivation", "general"];
const SEGMENTS = ["all", "new_users", "active_users", "vip", "high_spenders", "inactive", "custom"];
const SCRIPT_LENGTHS = [
  { value: "very_short", label: "Very Short", desc: "5-7 steps, 2-3 media", icon: "⚡" },
  { value: "short", label: "Short", desc: "8-10 steps, 3-4 media", icon: "🔥" },
  { value: "medium", label: "Medium", desc: "12-16 steps, 4-5 media", icon: "📋" },
  { value: "long", label: "Long", desc: "18-22 steps, 5-7 media", icon: "📖" },
  { value: "very_long", label: "Very Long", desc: "25-35 steps, 7-10 media", icon: "📚" },
];

/* ── Script Templates ── */
const SCRIPT_TEMPLATES = [
  {
    name: "Morning Routine",
    description: "Casual morning content in bedroom/bathroom setting, 4 media items",
    icon: "☀️",
    category: "general",
    steps: [
      { step_type: "welcome", title: "Morning greeting", content: "Good morning {NAME}! Just woke up... 🥱", media_type: "", media_url: "", price: 0, delay_minutes: 0 },
      { step_type: "free_content", title: "Casual preview", content: "Just took this for you 😊", media_type: "image", media_url: "1 casual selfie in bed, messy hair, natural look", price: 0, delay_minutes: 2 },
      { step_type: "message", title: "Build rapport", content: "How did you sleep? I had the craziest dream last night 😂", media_type: "", media_url: "", price: 0, delay_minutes: 3 },
      { step_type: "ppv_content", title: "Getting ready 1", content: "Getting ready for the day... want to see? 😏", media_type: "image", media_url: "2 images - getting ready, same bedroom setting", price: 5, delay_minutes: 5 },
      { step_type: "condition", title: "Check response", content: "", media_type: "", media_url: "", price: 0, delay_minutes: 10, condition_logic: { condition: "Responded or purchased" } },
      { step_type: "followup_purchased", title: "Thank + tease", content: "Glad you liked it! 😘 Want to see what I'm wearing today?", media_type: "", media_url: "", price: 0, delay_minutes: 2 },
      { step_type: "ppv_content", title: "Full outfit reveal", content: "Here's the full look 💕", media_type: "mixed", media_url: "2 photos + 15s video - full outfit, same room", price: 10, delay_minutes: 3 },
      { step_type: "followup_ignored", title: "Re-engage", content: "Hey {NAME}, you missed my morning look! 😉", media_type: "image", media_url: "1 teaser image, cropped", price: 0, delay_minutes: 60 },
      { step_type: "ppv_content", title: "Premium set", content: "The complete morning set just for you ✨", media_type: "mixed", media_url: "3 images + 28s video - complete set, same setting", price: 20, delay_minutes: 5 },
    ],
  },
  {
    name: "Workout Session",
    description: "Post-workout content in gym/home gym, progressive 5 media items",
    icon: "💪",
    category: "retention",
    steps: [
      { step_type: "welcome", title: "Workout done", content: "Just finished my workout {NAME}! 💦", media_type: "", media_url: "", price: 0, delay_minutes: 0 },
      { step_type: "free_content", title: "Quick selfie", content: "Proof I actually went 😂", media_type: "image", media_url: "1 mirror selfie in gym clothes", price: 0, delay_minutes: 1 },
      { step_type: "question", title: "Engage", content: "Do you work out too? What's your routine?", media_type: "", media_url: "", price: 0, delay_minutes: 3 },
      { step_type: "ppv_content", title: "Workout clips", content: "Some clips from today 🏋️", media_type: "video", media_url: "Video 0:22 - workout highlights", price: 7, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Post-workout", content: "The post-workout glow 😏", media_type: "image", media_url: "3 images - post-workout, same gym", price: 12, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Exclusive set", content: "Full set - only for favorites ✨", media_type: "mixed", media_url: "4 images + 35s video", price: 25, delay_minutes: 3 },
    ],
  },
  {
    name: "Night Out Prep",
    description: "Getting ready for a night out, 4 media items",
    icon: "🌙",
    category: "upsell",
    steps: [
      { step_type: "welcome", title: "Evening", content: "Hey {NAME}! Getting ready to go out 🥂", media_type: "", media_url: "", price: 0, delay_minutes: 0 },
      { step_type: "free_content", title: "Outfit options", content: "Help me pick? 😊", media_type: "image", media_url: "1 image - holding up outfits", price: 0, delay_minutes: 2 },
      { step_type: "ppv_content", title: "Trying on", content: "Trying them on 😏", media_type: "image", media_url: "2 images - trying outfits", price: 5, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Final look", content: "What do you think? 🔥", media_type: "mixed", media_url: "2 images + 20s video", price: 12, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Exclusive BTS", content: "Full getting-ready experience 💕", media_type: "mixed", media_url: "3 images + 40s video", price: 20, delay_minutes: 5 },
    ],
  },
  {
    name: "Lazy Day",
    description: "Cozy at-home content, living room, 5 media items",
    icon: "🛋️",
    category: "retention",
    steps: [
      { step_type: "welcome", title: "Lazy vibes", content: "Laziest day ever {NAME} 🛋️", media_type: "", media_url: "", price: 0, delay_minutes: 0 },
      { step_type: "free_content", title: "Cozy preview", content: "Current mood 😴", media_type: "image", media_url: "1 cozy selfie on couch", price: 0, delay_minutes: 2 },
      { step_type: "ppv_content", title: "Cozy set", content: "Getting comfy... 😊", media_type: "image", media_url: "2 images - lounging, cozy", price: 5, delay_minutes: 8 },
      { step_type: "ppv_content", title: "Video", content: "Just for you 💕", media_type: "video", media_url: "Video 0:30 - personal message", price: 15, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Full set", content: "Complete lazy day collection ✨", media_type: "mixed", media_url: "4 images + 45s video", price: 25, delay_minutes: 3 },
    ],
  },
];

/* ── Step Type Color Map ── */
const STEP_TYPE_COLORS: Record<string, { bg: string; fg: string; emoji: string }> = {
  welcome: { bg: "00BCD4", fg: "FFFFFF", emoji: "👋" },
  message: { bg: "FFC107", fg: "000000", emoji: "💬" },
  free_content: { bg: "4CAF50", fg: "FFFFFF", emoji: "🎁" },
  ppv_content: { bg: "FF9800", fg: "FFFFFF", emoji: "💰" },
  question: { bg: "FFEB3B", fg: "000000", emoji: "❓" },
  condition: { bg: "2196F3", fg: "FFFFFF", emoji: "🔀" },
  followup_purchased: { bg: "E91E63", fg: "FFFFFF", emoji: "✅" },
  followup_ignored: { bg: "F44336", fg: "FFFFFF", emoji: "⏳" },
  delay: { bg: "9E9E9E", fg: "FFFFFF", emoji: "⏱️" },
};

/* ── Excel Export ── */
const exportToExcel = async (script: Script, steps: ScriptStep[]) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Uplyze Script Builder";
  wb.created = new Date();

  // ── OVERVIEW SHEET ──
  const overview = wb.addWorksheet("📋 Overview", { properties: { tabColor: { argb: "FF6A1B9A" } } });
  overview.columns = [
    { header: "", key: "label", width: 22 },
    { header: "", key: "value", width: 50 },
  ];
  const ovRows = [
    ["📋 SCRIPT", script.title],
    ["📝 Description", script.description || "—"],
    ["📂 Category", script.category],
    ["🎯 Target", script.target_segment],
    ["💰 Total Value", `$${steps.reduce((s, st) => s + (st.price || 0), 0)}`],
    ["📊 Steps", `${steps.length}`],
    ["🎁 Free Media", `${steps.filter(s => s.step_type === "free_content").length}`],
    ["💎 Paid Media", `${steps.filter(s => s.price > 0).length}`],
    ["📅 Generated", new Date().toLocaleString()],
  ];
  ovRows.forEach(([label, value]) => {
    const row = overview.addRow({ label, value });
    row.getCell(1).font = { bold: true, size: 12, color: { argb: "FF6A1B9A" } };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E5F5" } };
    row.getCell(2).font = { size: 12 };
    row.height = 28;
  });

  // ── SCRIPT SHEET ──
  const ws = wb.addWorksheet("📜 Script Steps", { properties: { tabColor: { argb: "FFE91E63" } } });
  ws.columns = [
    { header: "#", key: "num", width: 5 },
    { header: "Type", key: "type", width: 22 },
    { header: "Title", key: "title", width: 25 },
    { header: "💬 Message / Content", key: "content", width: 55 },
    { header: "📸 Media", key: "media_type", width: 12 },
    { header: "📎 Media Description", key: "media_desc", width: 40 },
    { header: "💰 Price", key: "price", width: 10 },
    { header: "⏱️ Delay", key: "delay", width: 10 },
    { header: "🧠 Psychology", key: "psychology", width: 30 },
  ];

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: "FFE91E63" } } };
  });

  steps.forEach((step, i) => {
    const colors = STEP_TYPE_COLORS[step.step_type] || STEP_TYPE_COLORS.message;
    const emoji = colors.emoji;

    // Detect psychology technique
    let psych = "";
    const c = (step.content || "").toLowerCase();
    if (c.includes("just for u") || c.includes("only for you") || c.includes("never send")) psych = "🔒 Exclusivity";
    else if (c.includes("hold on") || c.includes("brb") || c.includes("wait")) psych = "⏳ Anticipation Build";
    else if (c.includes("u there") || c.includes("miss")) psych = "🔄 Re-engagement";
    else if (step.step_type === "free_content") psych = "🎁 Reciprocity Trigger";
    else if (step.price > 100) psych = "💎 Premium Scarcity";
    else if (step.price > 0 && step.price <= 15) psych = "🚪 Payment Barrier Break";
    else if (step.price > 15 && step.price <= 50) psych = "📈 Sunk Cost Leverage";
    else if (step.price > 50) psych = "🔥 FOMO + Urgency";
    else if (step.step_type === "question") psych = "💬 Micro-commitment";
    else if (step.step_type === "condition") psych = "🔀 Branch Logic";

    const row = ws.addRow({
      num: i + 1,
      type: `${emoji} ${step.step_type.replace(/_/g, " ").toUpperCase()}`,
      title: step.title,
      content: step.content || "—",
      media_type: step.media_type ? `📸 ${step.media_type}` : "—",
      media_desc: step.media_url || "—",
      price: step.price > 0 ? `$${step.price}` : step.step_type === "free_content" ? "🎁 FREE" : "—",
      delay: step.delay_minutes > 0 ? `⏱️ ${step.delay_minutes}m` : "—",
      psychology: psych,
    });

    row.height = 35;
    row.alignment = { vertical: "middle", wrapText: true };

    // Color code the type cell
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colors.bg}` } };
    row.getCell(2).font = { bold: true, size: 10, color: { argb: `FF${colors.fg}` } };
    row.getCell(2).alignment = { vertical: "middle", horizontal: "center" };

    // Price cell coloring
    if (step.price > 100) {
      row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6F00" } };
      row.getCell(7).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    } else if (step.price > 0) {
      row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E0" } };
      row.getCell(7).font = { bold: true, size: 11, color: { argb: "FFE65100" } };
    } else if (step.step_type === "free_content") {
      row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
      row.getCell(7).font = { bold: true, color: { argb: "FF2E7D32" } };
    }

    // Content cell
    row.getCell(4).font = { size: 10 };
    row.getCell(4).alignment = { wrapText: true, vertical: "top" };

    // Psychology cell
    if (psych) {
      row.getCell(9).font = { italic: true, size: 10, color: { argb: "FF6A1B9A" } };
    }

    // Row border
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "thin", color: { argb: "FFE0E0E0" } } };
    });
  });

  // ── PRICING SHEET ──
  const pricing = wb.addWorksheet("💰 Pricing Ladder", { properties: { tabColor: { argb: "FFFF9800" } } });
  pricing.columns = [
    { header: "Step", key: "step", width: 8 },
    { header: "💰 Price", key: "price", width: 12 },
    { header: "Type", key: "type", width: 20 },
    { header: "🧠 Strategy", key: "strategy", width: 35 },
    { header: "📊 Running Total", key: "running", width: 15 },
  ];
  const pHeader = pricing.getRow(1);
  pHeader.height = 28;
  pHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6F00" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  let runningTotal = 0;
  const paidSteps = steps.filter(s => s.price > 0 || s.step_type === "free_content");
  paidSteps.forEach((step, i) => {
    runningTotal += step.price || 0;
    const strategies: Record<string, string> = {
      free_content: "🎁 Reciprocity — Give first, fan feels obligated",
    };
    let strat = strategies[step.step_type] || "";
    if (!strat && step.price <= 15) strat = "🚪 Break payment barrier — low commitment";
    else if (!strat && step.price <= 50) strat = "📈 Sunk cost — already invested, keep going";
    else if (!strat && step.price <= 110) strat = "🔥 Double stack — bundle perceived value";
    else if (!strat && step.price <= 200) strat = "💎 Premium scarcity — best saved for last";
    else if (!strat) strat = "👑 VIP exclusivity — ultimate status reward";

    const row = pricing.addRow({
      step: i + 1,
      price: step.price > 0 ? `$${step.price}` : "🎁 FREE",
      type: step.step_type.replace(/_/g, " "),
      strategy: strat,
      running: `$${runningTotal}`,
    });
    row.height = 28;

    if (step.price === 0) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
      row.getCell(2).font = { bold: true, color: { argb: "FF2E7D32" } };
    } else if (step.price > 100) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6F00" } };
      row.getCell(2).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    } else {
      row.getCell(2).font = { bold: true, size: 11, color: { argb: "FFE65100" } };
    }
    row.getCell(5).font = { bold: true, color: { argb: "FF1565C0" } };
    row.eachCell((cell) => { cell.border = { bottom: { style: "thin", color: { argb: "FFE0E0E0" } } }; });
  });

  // Total row
  const totalRow = pricing.addRow({ step: "", price: "", type: "", strategy: "TOTAL SCRIPT VALUE", running: `$${runningTotal}` });
  totalRow.height = 35;
  totalRow.getCell(4).font = { bold: true, size: 12 };
  totalRow.getCell(5).font = { bold: true, size: 14, color: { argb: "FFD84315" } };
  totalRow.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E0" } };

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(script.title || "script").replace(/[^a-zA-Z0-9._-]/g, "_")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Excel exported with colors & formatting!");
};

/* ── Other Export Utilities ── */
const exportToCSV = (script: Script, steps: ScriptStep[]) => {
  const headers = ["#", "Type", "Title", "Content", "Media Type", "Media Description", "Price ($)", "Delay (min)", "Psychology"];
  const rows = steps.map((s, i) => {
    let psych = "";
    const c = (s.content || "").toLowerCase();
    if (c.includes("just for u") || c.includes("only for you")) psych = "Exclusivity";
    else if (c.includes("hold on") || c.includes("brb")) psych = "Anticipation Build";
    else if (c.includes("u there") || c.includes("miss")) psych = "Re-engagement";
    else if (s.step_type === "free_content") psych = "Reciprocity Trigger";
    else if (s.price > 100) psych = "Premium Scarcity";
    else if (s.price > 0 && s.price <= 15) psych = "Payment Barrier Break";
    else if (s.price > 15 && s.price <= 50) psych = "Sunk Cost Leverage";
    else if (s.price > 50) psych = "FOMO + Urgency";
    else if (s.step_type === "question") psych = "Micro-commitment";
    else if (s.step_type === "condition") psych = "Branch Logic";
    return [
      i + 1, s.step_type.toUpperCase().replace(/_/g, " "), s.title,
      `"${(s.content || "").replace(/"/g, '""')}"`,
      s.media_type || "", `"${(s.media_url || "").replace(/"/g, '""')}"`,
      s.price || 0, s.delay_minutes || 0, psych,
    ];
  });
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadFile(`${script.title || "script"}.csv`, csv, "text/csv");
};

/* ── Google Sheets HTML Export (with colors) ── */
const STEP_COLORS_HTML: Record<string, { bg: string; fg: string }> = {
  welcome: { bg: "#00BCD4", fg: "#FFFFFF" },
  message: { bg: "#FFC107", fg: "#000000" },
  free_content: { bg: "#4CAF50", fg: "#FFFFFF" },
  ppv_content: { bg: "#FF9800", fg: "#FFFFFF" },
  question: { bg: "#FFEB3B", fg: "#000000" },
  condition: { bg: "#2196F3", fg: "#FFFFFF" },
  followup_purchased: { bg: "#E91E63", fg: "#FFFFFF" },
  followup_ignored: { bg: "#F44336", fg: "#FFFFFF" },
  delay: { bg: "#9E9E9E", fg: "#FFFFFF" },
};

const exportToGoogleSheetsHTML = (script: Script, steps: ScriptStep[]) => {
  const totalValue = steps.reduce((s, st) => s + (st.price || 0), 0);
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #1A1A2E; color: #FFFFFF; font-weight: bold; padding: 10px 8px; border: 1px solid #333; text-align: center; font-size: 12px; }
  td { padding: 8px 6px; border: 1px solid #E0E0E0; vertical-align: top; font-size: 11px; }
  .overview-label { background: #F3E5F5; color: #6A1B9A; font-weight: bold; font-size: 13px; padding: 8px; }
  .overview-value { font-size: 13px; padding: 8px; }
  .price-free { background: #E8F5E9; color: #2E7D32; font-weight: bold; }
  .price-low { background: #FFF3E0; color: #E65100; font-weight: bold; }
  .price-high { background: #FF6F00; color: #FFFFFF; font-weight: bold; font-size: 13px; }
  .psych { color: #6A1B9A; font-style: italic; }
  .total-row { background: #FFF3E0; }
  .total-label { font-weight: bold; font-size: 13px; }
  .total-value { font-weight: bold; font-size: 15px; color: #D84315; }
</style></head><body>`;

  // Overview table
  html += `<h2 style="color:#6A1B9A;">📋 ${script.title}</h2>`;
  html += `<table style="width:400px; margin-bottom:20px;">`;
  const ovData = [
    ["📋 Script", script.title],
    ["📝 Description", script.description || "—"],
    ["📂 Category", script.category],
    ["🎯 Target", script.target_segment],
    ["💰 Total Value", `$${totalValue}`],
    ["📊 Steps", `${steps.length}`],
    ["🎁 Free Media", `${steps.filter(s => s.step_type === "free_content").length}`],
    ["💎 Paid Media", `${steps.filter(s => s.price > 0).length}`],
    ["📅 Generated", new Date().toLocaleString()],
  ];
  ovData.forEach(([label, value]) => {
    html += `<tr><td class="overview-label">${label}</td><td class="overview-value">${value}</td></tr>`;
  });
  html += `</table>`;

  // Steps table
  html += `<table><tr><th>#</th><th>Type</th><th>Title</th><th>💬 Message</th><th>📸 Media</th><th>📎 Description</th><th>💰 Price</th><th>⏱️ Delay</th><th>🧠 Psychology</th></tr>`;
  steps.forEach((step, i) => {
    const colors = STEP_COLORS_HTML[step.step_type] || { bg: "#FFC107", fg: "#000000" };
    const emoji = STEP_TYPE_COLORS[step.step_type]?.emoji || "📌";
    let psych = "";
    const c = (step.content || "").toLowerCase();
    if (c.includes("just for u") || c.includes("only for you")) psych = "🔒 Exclusivity";
    else if (c.includes("hold on") || c.includes("brb")) psych = "⏳ Anticipation Build";
    else if (c.includes("u there") || c.includes("miss")) psych = "🔄 Re-engagement";
    else if (step.step_type === "free_content") psych = "🎁 Reciprocity Trigger";
    else if (step.price > 100) psych = "💎 Premium Scarcity";
    else if (step.price > 0 && step.price <= 15) psych = "🚪 Payment Barrier Break";
    else if (step.price > 15 && step.price <= 50) psych = "📈 Sunk Cost Leverage";
    else if (step.price > 50) psych = "🔥 FOMO + Urgency";
    else if (step.step_type === "question") psych = "💬 Micro-commitment";
    else if (step.step_type === "condition") psych = "🔀 Branch Logic";

    let priceClass = "";
    let priceText = "—";
    if (step.step_type === "free_content") { priceClass = "price-free"; priceText = "🎁 FREE"; }
    else if (step.price > 100) { priceClass = "price-high"; priceText = `$${step.price}`; }
    else if (step.price > 0) { priceClass = "price-low"; priceText = `$${step.price}`; }

    html += `<tr>
      <td style="text-align:center; font-weight:bold;">${i + 1}</td>
      <td style="background:${colors.bg}; color:${colors.fg}; font-weight:bold; text-align:center;">${emoji} ${step.step_type.replace(/_/g, " ").toUpperCase()}</td>
      <td>${step.title || "—"}</td>
      <td style="max-width:300px;">${(step.content || "—").replace(/\n/g, "<br>")}</td>
      <td>${step.media_type ? `📸 ${step.media_type}` : "—"}</td>
      <td>${step.media_url || "—"}</td>
      <td class="${priceClass}">${priceText}</td>
      <td>${step.delay_minutes > 0 ? `⏱️ ${step.delay_minutes}m` : "—"}</td>
      <td class="psych">${psych}</td>
    </tr>`;
  });

  // Total row
  html += `<tr class="total-row"><td colspan="6"></td><td class="total-label" colspan="2">TOTAL VALUE</td><td class="total-value">$${totalValue}</td></tr>`;
  html += `</table></body></html>`;

  downloadFile(`${script.title || "script"}-sheets.xls`, html, "application/vnd.ms-excel");
  toast.success("Google Sheets export with colors & formatting!");
};

const exportToText = (script: Script, steps: ScriptStep[]) => {
  let text = `📋 SCRIPT: ${script.title}\n`;
  text += `📝 ${script.description || ""}\n`;
  text += `📂 Category: ${script.category} | 🎯 Target: ${script.target_segment}\n`;
  text += `💰 Total Value: $${steps.reduce((s, st) => s + (st.price || 0), 0)}\n`;
  text += "═".repeat(60) + "\n\n";
  steps.forEach((s, i) => {
    const typeLabel = s.step_type.toUpperCase().replace(/_/g, " ");
    const emoji = STEP_TYPE_COLORS[s.step_type]?.emoji || "📌";
    text += `${emoji} [${i + 1}] ${typeLabel}${s.price > 0 ? ` — 💰$${s.price}` : s.step_type === "free_content" ? " — 🎁 FREE" : ""}\n`;
    if (s.title) text += `    📌 Title: ${s.title}\n`;
    if (s.content) text += `    💬 Message: ${s.content}\n`;
    if (s.media_url) text += `    📸 Media: ${s.media_type ? `(${s.media_type}) ` : ""}${s.media_url}\n`;
    if (s.delay_minutes > 0) text += `    ⏱️ Wait ${s.delay_minutes} min\n`;
    if (s.step_type === "condition") text += `    🔀 Branch: ${s.condition_logic?.condition || "Check response"}\n`;
    text += "\n";
  });
  text += "═".repeat(60) + "\n";
  text += `💰 TOTAL SCRIPT VALUE: $${steps.reduce((s, st) => s + (st.price || 0), 0)}\n`;
  downloadFile(`${script.title || "script"}.txt`, text, "text/plain");
};

const exportToMarkdown = (script: Script, steps: ScriptStep[]) => {
  const totalValue = steps.reduce((s, st) => s + (st.price || 0), 0);
  let md = `# 📋 ${script.title}\n\n`;
  md += `> ${script.description || ""}\n\n`;
  md += `| 📂 Category | 🎯 Target | 💰 Total Value | 📊 Steps | 🎁 Free | 💎 Paid |\n`;
  md += `|---|---|---|---|---|---|\n`;
  md += `| ${script.category} | ${script.target_segment} | **$${totalValue}** | ${steps.length} | ${steps.filter(s => s.step_type === "free_content").length} | ${steps.filter(s => s.price > 0).length} |\n\n`;
  md += "---\n\n";
  md += "## 📜 Script Flow\n\n";
  md += "| # | Type | Title | 💬 Message | 📸 Media | 📎 Description | 💰 Price | ⏱️ Delay | 🧠 Psychology |\n";
  md += "|---|------|-------|---------|-------|-------------|-------|-------|-------------|\n";
  steps.forEach((s, i) => {
    const emoji = STEP_TYPE_COLORS[s.step_type]?.emoji || "📌";
    let psych = "";
    const c = (s.content || "").toLowerCase();
    if (c.includes("just for u") || c.includes("only for you")) psych = "🔒 Exclusivity";
    else if (c.includes("hold on") || c.includes("brb")) psych = "⏳ Anticipation";
    else if (s.step_type === "free_content") psych = "🎁 Reciprocity";
    else if (s.price > 100) psych = "💎 Premium Scarcity";
    else if (s.price > 0 && s.price <= 15) psych = "🚪 Barrier Break";
    else if (s.price > 15 && s.price <= 50) psych = "📈 Sunk Cost";
    else if (s.price > 50) psych = "🔥 FOMO";
    else if (s.step_type === "question") psych = "💬 Micro-commit";
    else if (s.step_type === "condition") psych = "🔀 Branch";
    const priceLabel = s.price > 0 ? `💰 $${s.price}` : s.step_type === "free_content" ? "🎁 FREE" : "—";
    md += `| ${i + 1} | ${emoji} ${s.step_type.replace(/_/g, " ").toUpperCase()} | ${s.title || "—"} | ${(s.content || "—").substring(0, 60).replace(/\|/g, "\\|")} | ${s.media_type || "—"} | ${(s.media_url || "—").substring(0, 35).replace(/\|/g, "\\|")} | ${priceLabel} | ${s.delay_minutes > 0 ? `⏱️ ${s.delay_minutes}m` : "—"} | ${psych} |\n`;
  });
  md += "\n---\n\n";
  md += "## 📖 Detailed Steps\n\n";
  steps.forEach((s, i) => {
    const emoji = STEP_TYPE_COLORS[s.step_type]?.emoji || "📌";
    const priceLabel = s.price > 0 ? ` — 💰 $${s.price}` : s.step_type === "free_content" ? " — 🎁 FREE" : "";
    md += `### ${emoji} Step ${i + 1}: ${s.step_type.toUpperCase().replace(/_/g, " ")}${priceLabel}\n\n`;
    if (s.title) md += `**${s.title}**\n\n`;
    if (s.content) md += `> ${s.content.replace(/\n/g, "\n> ")}\n\n`;
    if (s.media_url) md += `📎 **Media (${s.media_type || "unspecified"}):** *${s.media_url}*\n\n`;
    if (s.delay_minutes > 0) md += `⏱️ *Wait ${s.delay_minutes} minutes*\n\n`;
    if (s.step_type === "condition") md += `🔀 **Branch:** ${s.condition_logic?.condition || "Check response"}\n\n`;
    md += "---\n\n";
  });
  md += `## 💰 Pricing Summary\n\n`;
  md += `| # | Type | Price | Running Total |\n`;
  md += `|---|------|-------|---------------|\n`;
  let running = 0;
  steps.filter(s => s.price > 0 || s.step_type === "free_content").forEach((s, i) => {
    running += s.price || 0;
    md += `| ${i + 1} | ${s.step_type.replace(/_/g, " ")} | ${s.price > 0 ? `$${s.price}` : "🎁 FREE"} | **$${running}** |\n`;
  });
  md += `\n**Total Script Value: $${totalValue}**\n`;
  downloadFile(`${script.title || "script"}.md`, md, "text/markdown");
};

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const ScriptBuilder = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showGenOptions, setShowGenOptions] = useState(false);
  const [viewMode, setViewMode] = useState<"flow" | "edit">("flow");
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [newScript, setNewScript] = useState<Script>({
    title: "", description: "", category: "general", status: "draft", target_segment: "all", version: 1,
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingQuality, setGeneratingQuality] = useState<"fast" | "premium" | null>(null);

  // Generation options
  const [generateRealMessages, setGenerateRealMessages] = useState(true);
  const [scriptLength, setScriptLength] = useState("medium");
  const [includeConditions, setIncludeConditions] = useState(true);
  const [includeFollowups, setIncludeFollowups] = useState(true);
  const [includeDelays, setIncludeDelays] = useState(true);
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [messageTone, setMessageTone] = useState<"innocent" | "bold" | "aggressive_innocent" | "submissive" | "bratty" | "dynamic_shift">("innocent");
  const [enableDynamicShift, setEnableDynamicShift] = useState(false);
  const [enableExclusivity, setEnableExclusivity] = useState(true);
  const [enableTypoSimulation, setEnableTypoSimulation] = useState(false);
  const [enableFreeFirst, setEnableFreeFirst] = useState(true);
  const [enableMaxConversion, setEnableMaxConversion] = useState(true);
  const [enableEmoji, setEnableEmoji] = useState(false);
  const [enableReEngagement, setEnableReEngagement] = useState(true);
  const [enableVoiceNoteHints, setEnableVoiceNoteHints] = useState(false);
  const [adaptivePricing, setAdaptivePricing] = useState(true);
  const [enableFormalLongMessages, setEnableFormalLongMessages] = useState(false);
  // NEW Psychology & Story Options
  const [enableMindBuilding, setEnableMindBuilding] = useState(true);
  const [enableStoryArc, setEnableStoryArc] = useState(true);
  const [enableExclusivityPsychology, setEnableExclusivityPsychology] = useState(true);
  const [enableFantasyProjection, setEnableFantasyProjection] = useState(false);
  const [enableEmotionalAnchoring, setEnableEmotionalAnchoring] = useState(true);

  // Editable pricing tiers
  const [pricingTiers, setPricingTiers] = useState([
    { step: 1, label: "Free bait", min: 0, max: 0 },
    { step: 2, label: "Entry PPV", min: 8, max: 15 },
    { step: 3, label: "Mid tier", min: 25, max: 49 },
    { step: 4, label: "Double stack", min: 70, max: 105 },
    { step: 5, label: "Premium", min: 145, max: 200 },
    { step: 6, label: "VIP only", min: 410, max: 410 },
  ]);
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  // AI Script Analysis
  const [analyzingScriptId, setAnalyzingScriptId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [appliedImprovements, setAppliedImprovements] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const [genTimer, setGenTimer] = useState(0);
  const [genEstimate, setGenEstimate] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadScripts();

    // Realtime sync for scripts
    const channel = supabase
      .channel('scripts-builder-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scripts' }, () => {
        loadScripts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'script_steps' }, (payload) => {
        // If steps changed for currently selected script, reload them
        const scriptId = (payload.new as any)?.script_id || (payload.old as any)?.script_id;
        if (selectedScript && scriptId === selectedScript.id) {
          loadSteps(scriptId);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedScript?.id]);
  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  const loadScripts = async () => {
    const { data } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
    setScripts(data || []);
  };

  const loadSteps = async (scriptId: string) => {
    const { data } = await supabase.from("script_steps").select("*").eq("script_id", scriptId).order("step_order");
    setSteps((data || []).map(s => ({
      ...s,
      conversion_rate: Number(s.conversion_rate) || 0,
      drop_off_rate: Number(s.drop_off_rate) || 0,
      revenue_generated: Number(s.revenue_generated) || 0,
      price: Number(s.price) || 0,
      delay_minutes: s.delay_minutes || 0,
      impressions: s.impressions || 0,
    })));
  };

  const selectScript = async (script: any) => {
    setSelectedScript(script);
    await loadSteps(script.id);
    setEditingStep(null);
  };

  const createScript = async () => {
    if (!newScript.title.trim()) return toast.error("Script title is required");
    const { data, error } = await supabase.from("scripts").insert({
      title: newScript.title, description: newScript.description,
      category: newScript.category, target_segment: newScript.target_segment,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Script created");
    setShowNewDialog(false);
    setNewScript({ title: "", description: "", category: "general", status: "draft", target_segment: "all", version: 1 });
    await loadScripts();
    if (data) selectScript(data);
  };

  const applyTemplate = async (template: typeof SCRIPT_TEMPLATES[0]) => {
    const { data, error } = await supabase.from("scripts").insert({
      title: template.name, description: template.description,
      category: template.category, target_segment: "all",
    }).select().single();
    if (error) return toast.error(error.message);

    if (data && template.steps.length > 0) {
      await supabase.from("script_steps").insert(
        template.steps.map((s, i) => ({
          script_id: data.id, step_order: i, step_type: s.step_type,
          title: s.title, content: s.content, media_url: s.media_url, media_type: s.media_type,
          price: s.price, delay_minutes: s.delay_minutes,
          condition_logic: s.step_type === "condition" ? (s as any).condition_logic || {} : {},
        }))
      );
    }
    toast.success(`Template "${template.name}" applied!`);
    setShowTemplates(false);
    await loadScripts();
    if (data) selectScript(data);
  };

  const addStep = (type: string = "message") => {
    setSteps(prev => [...prev, {
      step_order: prev.length, step_type: type, title: "", content: "",
      media_url: "", media_type: "", price: 0, delay_minutes: 0,
      condition_logic: {}, conversion_rate: 0, drop_off_rate: 0,
      revenue_generated: 0, impressions: 0,
    }]);
    setEditingStep(steps.length);
    setViewMode("edit");
  };

  const updateStep = (index: number, field: string, value: any) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i })));
    setEditingStep(null);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === steps.length - 1)) return;
    const newSteps = [...steps];
    const target = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, step_order: i })));
  };

  const reorderSteps = (fromIndex: number, toIndex: number) => {
    const newSteps = [...steps];
    const [moved] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, moved);
    setSteps(newSteps.map((s, i) => ({ ...s, step_order: i })));
  };

  const duplicateStep = (index: number) => {
    const step = { ...steps[index], id: undefined, step_order: steps.length };
    setSteps(prev => [...prev, step].map((s, i) => ({ ...s, step_order: i })));
  };

  const saveScript = async () => {
    if (!selectedScript?.id) return;
    setSaving(true);
    try {
      await supabase.from("script_steps").delete().eq("script_id", selectedScript.id);
      if (steps.length > 0) {
        const { error } = await supabase.from("script_steps").insert(
          steps.map(s => ({
            script_id: selectedScript.id!, step_order: s.step_order, step_type: s.step_type,
            title: s.title || `Step ${s.step_order + 1}`, content: s.content,
            media_url: s.media_url, media_type: s.media_type, price: s.price,
            delay_minutes: s.delay_minutes, condition_logic: s.condition_logic,
          }))
        );
        if (error) throw error;
      }
      await supabase.from("scripts").update({
        title: selectedScript.title, description: selectedScript.description,
        category: selectedScript.category, target_segment: selectedScript.target_segment,
      }).eq("id", selectedScript.id);
      toast.success("Script saved");
      await loadScripts();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const cloneScript = async () => {
    if (!selectedScript?.id) return;
    const { data, error } = await supabase.from("scripts").insert({
      title: `${selectedScript.title} (Copy)`, description: selectedScript.description,
      category: selectedScript.category, target_segment: selectedScript.target_segment,
      parent_script_id: selectedScript.id, version: (selectedScript.version || 1) + 1,
    }).select().single();
    if (error) return toast.error(error.message);
    if (steps.length > 0 && data) {
      await supabase.from("script_steps").insert(
        steps.map(s => ({
          script_id: data.id, step_order: s.step_order, step_type: s.step_type,
          title: s.title, content: s.content, media_url: s.media_url, media_type: s.media_type,
          price: s.price, delay_minutes: s.delay_minutes, condition_logic: s.condition_logic,
        }))
      );
    }
    toast.success("Script cloned");
    await loadScripts();
    if (data) selectScript(data);
  };

  const generateScript = async (quality: "fast" | "premium") => {
    setGenerating(true);
    setGeneratingQuality(quality);
    const estimateMap: Record<string, number> = { very_short: 6, short: 8, medium: 12, long: 18, very_long: 25 };
    const estimate = (estimateMap[scriptLength] || 12) * (quality === "premium" ? 2 : 1);
    setGenEstimate(estimate);
    setGenTimer(0);
    timerRef.current = setInterval(() => setGenTimer(prev => prev + 1), 1000);

    try {
      const category = selectedScript?.category || newScript.category || "general";
      const segment = selectedScript?.target_segment || newScript.target_segment || "new_users";

      const { data, error } = await supabase.functions.invoke("generate-script", {
        body: {
          category, target_segment: segment, quality,
          generate_real_messages: generateRealMessages,
          script_length: scriptLength,
          include_conditions: includeConditions,
          include_followups: includeFollowups,
          include_delays: includeDelays,
          include_questions: includeQuestions,
          message_tone: enableDynamicShift ? "dynamic_shift" : messageTone,
          enable_exclusivity: enableExclusivity,
          enable_typo_simulation: enableTypoSimulation,
          enable_free_first: enableFreeFirst,
          enable_max_conversion: enableMaxConversion,
          enable_emoji: enableEmoji,
          enable_re_engagement: enableReEngagement,
          enable_voice_note_hints: enableVoiceNoteHints,
          adaptive_pricing: adaptivePricing,
          pricing_tiers: pricingTiers,
          // New psychology options
          enable_mind_building: enableMindBuilding,
          enable_story_arc: enableStoryArc,
          enable_exclusivity_psychology: enableExclusivityPsychology,
          enable_fantasy_projection: enableFantasyProjection,
          enable_emotional_anchoring: enableEmotionalAnchoring,
          enable_formal_long_messages: enableFormalLongMessages,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { data: newScriptData, error: createErr } = await supabase.from("scripts").insert({
        title: data.title || `AI ${quality === "premium" ? "Premium" : "Fast"} Script`,
        description: data.description || "",
        category,
        target_segment: segment,
      }).select().single();
      if (createErr) throw createErr;

      if (data.steps?.length > 0 && newScriptData) {
        const { error: stepsErr } = await supabase.from("script_steps").insert(
          data.steps.map((s: any, i: number) => ({
            script_id: newScriptData.id, step_order: i, step_type: s.step_type || "message",
            title: s.title || `Step ${i + 1}`, content: s.content || "",
            media_url: s.media_url && s.media_url !== "" ? s.media_url : null, 
            media_type: s.media_type && s.media_type !== "none" && s.media_type !== "" ? s.media_type : null,
            price: typeof s.price === "number" ? s.price : parseFloat(s.price) || 0, 
            delay_minutes: typeof s.delay_minutes === "number" ? Math.round(s.delay_minutes) : parseInt(s.delay_minutes) || 0,
            condition_logic: s.condition_logic && typeof s.condition_logic === "object" ? s.condition_logic : {},
          }))
        );
        if (stepsErr) {
          console.error("Steps insert error:", stepsErr);
          toast.error("Script created but steps failed to save: " + stepsErr.message);
        }
      }

      await loadScripts();
      if (newScriptData) {
        await selectScript(newScriptData);
        setViewMode("flow");
      }

      toast.success(`${quality === "premium" ? "👑 Premium" : "⚡ Fast"} script saved to library!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate script");
    } finally {
      setGenerating(false);
      setGeneratingQuality(null);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const deleteScript = async (scriptId: string) => {
    try {
      await supabase.from("script_steps").delete().eq("script_id", scriptId);
      await supabase.from("automation_workflows").delete().eq("script_id", scriptId);
      await supabase.from("scripts").delete().eq("id", scriptId);
      if (selectedScript?.id === scriptId) { setSelectedScript(null); setSteps([]); }
      toast.success("Script deleted permanently");
      setShowDeleteConfirm(null);
      await loadScripts();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteAllScripts = async () => {
    try {
      const ids = scripts.map(s => s.id);
      if (ids.length === 0) return;
      for (const id of ids) {
        await supabase.from("script_steps").delete().eq("script_id", id);
        await supabase.from("automation_workflows").delete().eq("script_id", id);
      }
      await supabase.from("scripts").delete().in("id", ids);
      setSelectedScript(null); setSteps([]);
      toast.success(`All ${ids.length} scripts deleted permanently`);
      setShowDeleteAll(false);
      await loadScripts();
    } catch (e: any) { toast.error(e.message); }
  };

  const updatePricingTier = (index: number, field: "min" | "max", value: number) => {
    setPricingTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const totalPricingTarget = pricingTiers.reduce((s, t) => s + t.max, 0);

  const analyzeScript = async (script: any) => {
    setAnalyzingScriptId(script.id);
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setShowAnalysisDialog(true);
    setAppliedImprovements(new Set());

    try {
      // Load steps for this specific script
      const { data: scriptSteps } = await supabase
        .from("script_steps")
        .select("*")
        .eq("script_id", script.id)
        .order("step_order");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/script-intelligence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: "deep_script_analysis",
            scripts: [script],
            steps: scriptSteps || [],
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        if (resp.status === 429) toast.error("Rate limit exceeded. Please wait and try again.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error(err.error || "Analysis failed");
        setAnalysisLoading(false);
        return;
      }

      const result = await resp.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        setAnalysisResult(result);
        toast.success("AI analysis complete");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze script");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const applyImprovement = async (improvement: any) => {
    if (!selectedScript?.id && !analyzingScriptId) return;
    const targetScriptId = selectedScript?.id || analyzingScriptId;
    setApplyingId(improvement.id);

    try {
      // Load current steps
      const { data: currentSteps } = await supabase
        .from("script_steps")
        .select("*")
        .eq("script_id", targetScriptId)
        .order("step_order");

      if (!currentSteps) throw new Error("Could not load steps");

      // Apply each change
      for (const change of improvement.changes || []) {
        const step = currentSteps[change.step_index];
        if (!step) continue;

        await supabase
          .from("script_steps")
          .update({ [change.field]: change.new_value })
          .eq("id", step.id);
      }

      // Reload steps if this is the selected script
      if (selectedScript?.id === targetScriptId) {
        await selectScript(selectedScript);
      }

      setAppliedImprovements(prev => new Set([...prev, improvement.id]));
      toast.success(`Applied: ${improvement.title}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to apply improvement");
    } finally {
      setApplyingId(null);
    }
  };

  const totalPrice = steps.reduce((s, step) => s + (step.price || 0), 0);
  const paidSteps = steps.filter(s => s.price > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Script Builder</h2>
          <p className="text-xs text-white/40">Design structured content scripts with progressive pricing & psychology</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => generateScript("fast")} disabled={generating}
            className="gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0">
            {generatingQuality === "fast" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {generatingQuality === "fast" ? "Generating..." : "⚡ Fast"}
          </Button>
          <Button size="sm" onClick={() => generateScript("premium")} disabled={generating}
            className="gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-0">
            {generatingQuality === "premium" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
            {generatingQuality === "premium" ? "Generating..." : "👑 Premium"}
          </Button>

          {/* Gen Options */}
          <Dialog open={showGenOptions} onOpenChange={setShowGenOptions}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white text-[10px] h-8">
                <Sparkles className="h-3 w-3" /> Options
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white max-w-6xl max-h-[90vh] overflow-y-auto p-8">
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-6 w-6 text-purple-400" /> Generation Options</DialogTitle></DialogHeader>
              <div className="grid grid-cols-4 gap-6 mt-6">
                {/* COLUMN 1: Script Setup */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider border-b border-white/10 pb-2">📐 Script Setup</h3>
                  <div>
                    <Label className="text-xs text-white/50 mb-2 block">Script Length</Label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {SCRIPT_LENGTHS.map(l => (
                        <button key={l.value} onClick={() => setScriptLength(l.value)}
                          className={`p-3 rounded-lg text-left transition-all border flex items-center gap-3 ${
                            scriptLength === l.value ? "bg-accent/20 border-accent/40 text-white" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                          }`}>
                          <span className="text-lg">{l.icon}</span>
                          <div>
                            <span className="text-xs font-semibold block">{l.label}</span>
                            <span className="text-[10px] block text-white/30">{l.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-white/50 mb-2 block">Include in Script</Label>
                    <div className="space-y-1.5">
                      {[
                        { id: "real", label: "Real messages (vs placeholders)", checked: generateRealMessages, set: setGenerateRealMessages },
                        { id: "conditions", label: "Condition branches", checked: includeConditions, set: setIncludeConditions },
                        { id: "followups", label: "Follow-ups (bought/ignored)", checked: includeFollowups, set: setIncludeFollowups },
                        { id: "delays", label: "Timing delays", checked: includeDelays, set: setIncludeDelays },
                        { id: "questions", label: "Engagement questions", checked: includeQuestions, set: setIncludeQuestions },
                      ].map(opt => (
                        <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]">
                          <Checkbox checked={opt.checked} onCheckedChange={(v) => opt.set(v === true)} />
                          <span className="text-xs text-white/60">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Tone & Psychology */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider border-b border-white/10 pb-2">🎭 Tone & Psychology</h3>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <Switch id="opt-dynamic" checked={enableDynamicShift} onCheckedChange={(v) => { setEnableDynamicShift(v); if (v) setMessageTone("dynamic_shift"); }} />
                    <div className="flex-1">
                      <Label htmlFor="opt-dynamic" className="text-xs text-white cursor-pointer font-semibold flex items-center gap-1.5">
                        🎭 Dynamic Tone Shift
                        <Badge variant="outline" className="text-[8px] border-purple-500/30 text-purple-300">REC</Badge>
                      </Label>
                      <p className="text-[10px] text-white/40 mt-0.5">Innocent → Bold → Submissive → Bold finale</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-white/50 mb-2 block">
                      Manual Tone {enableDynamicShift && <span className="text-purple-400 text-[10px]">(overridden)</span>}
                    </Label>
                    <div className={`grid grid-cols-1 gap-1.5 ${enableDynamicShift ? "opacity-30 pointer-events-none" : ""}`}>
                      {[
                        { key: "innocent", icon: "🥺", label: "Innocent", desc: "Shy, sweet" },
                        { key: "aggressive_innocent", icon: "😈", label: "Spicy", desc: "Bold + casual" },
                        { key: "bold", icon: "🔥", label: "Bold", desc: "Confident, direct" },
                        { key: "submissive", icon: "🫣", label: "Submissive", desc: "Needy, devoted" },
                        { key: "bratty", icon: "💅", label: "Bratty", desc: "Tease, push-pull" },
                      ].map(t => (
                        <button key={t.key} onClick={() => setMessageTone(t.key as any)}
                          className={`p-2 rounded-lg text-left transition-all border flex items-center gap-2 ${
                            messageTone === t.key ? "bg-accent/20 border-accent/40 text-white" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                          }`}>
                          <span className="text-base">{t.icon}</span>
                          <div>
                            <span className="text-xs font-semibold">{t.label}</span>
                            <span className="text-[9px] text-white/30 ml-1">{t.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Emoji & Exclusivity */}
                  {[
                    { id: "opt-exclusivity", icon: "✨", label: "Exclusivity & Pauses", desc: "\"Hold on 2 mins\", \"just took this for u\"", checked: enableExclusivity, set: setEnableExclusivity, gradient: "from-amber-500/10 to-orange-500/10", border: "border-amber-500/20" },
                    { id: "opt-emoji", icon: "😍", label: "Emoji & Reactions", desc: "Natural emoji throughout messages", checked: enableEmoji, set: setEnableEmoji, gradient: "from-pink-500/10 to-rose-500/10", border: "border-pink-500/20" },
                  ].map(opt => (
                    <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${opt.gradient} border ${opt.border}`}>
                      <Switch id={opt.id} checked={opt.checked} onCheckedChange={opt.set} />
                      <div className="flex-1">
                        <Label htmlFor={opt.id} className="text-xs text-white cursor-pointer font-semibold">{opt.icon} {opt.label}</Label>
                        <p className="text-[10px] text-white/40 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* COLUMN 3: Mind Games & Story */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider border-b border-white/10 pb-2">🧠 Mind Games & Story</h3>
                  {[
                    { id: "opt-mind", icon: "🧠", label: "Mind Building", desc: "Progressive mental investment. Fan builds a mental image of you — each step deepens the imagined intimacy.", checked: enableMindBuilding, set: setEnableMindBuilding, gradient: "from-violet-500/15 to-indigo-500/15", border: "border-violet-500/25" },
                    { id: "opt-story", icon: "📖", label: "Story Arc Narrative", desc: "Script follows a narrative arc: Setup → Rising Tension → Climax → Resolution. Fan stays for the story.", checked: enableStoryArc, set: setEnableStoryArc, gradient: "from-cyan-500/15 to-blue-500/15", border: "border-cyan-500/25" },
                    { id: "opt-excl-psych", icon: "👑", label: "VIP Exclusivity Psychology", desc: "\"You're the only one\", \"I've never done this before\", \"This stays between us\" — makes fan feel chosen.", checked: enableExclusivityPsychology, set: setEnableExclusivityPsychology, gradient: "from-amber-500/15 to-yellow-500/15", border: "border-amber-500/25" },
                    { id: "opt-fantasy", icon: "💭", label: "Fantasy Projection", desc: "Guide the fan to imagine themselves IN the scenario. \"Imagine you were here with me rn...\" Creates emotional attachment.", checked: enableFantasyProjection, set: setEnableFantasyProjection, gradient: "from-pink-500/15 to-red-500/15", border: "border-pink-500/25" },
                    { id: "opt-anchor", icon: "⚓", label: "Emotional Anchoring", desc: "Link purchases to positive emotions. \"This one's special because...\", \"I made this thinking of you\". Creates Pavlovian buying habits.", checked: enableEmotionalAnchoring, set: setEnableEmotionalAnchoring, gradient: "from-emerald-500/15 to-teal-500/15", border: "border-emerald-500/25" },
                  ].map(opt => (
                    <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${opt.gradient} border ${opt.border}`}>
                      <Switch id={opt.id} checked={opt.checked} onCheckedChange={opt.set} />
                      <div className="flex-1">
                        <Label htmlFor={opt.id} className="text-xs text-white cursor-pointer font-semibold">{opt.icon} {opt.label}</Label>
                        <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{opt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* COLUMN 4: Conversion & Pricing */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider border-b border-white/10 pb-2">💰 Conversion & Pricing</h3>
                  {[
                    { id: "opt-freefirst", icon: "🎁", label: "Free Content First", desc: "1-2 free media before PPV. Reciprocity.", checked: enableFreeFirst, set: setEnableFreeFirst },
                    { id: "opt-maxconv", icon: "💰", label: "Max Conversion Mode", desc: "Sunk cost, FOMO, urgency, anchoring.", checked: enableMaxConversion, set: setEnableMaxConversion },
                    { id: "opt-typo", icon: "✏️", label: "Typo Simulation", desc: "Natural typos + *correction.", checked: enableTypoSimulation, set: setEnableTypoSimulation },
                    { id: "opt-reengage", icon: "🔄", label: "Re-Engagement Loops", desc: "Auto follow-ups if fan goes quiet.", checked: enableReEngagement, set: setEnableReEngagement },
                    { id: "opt-voice", icon: "🎤", label: "Voice Note Hints", desc: "Reference voice msgs for intimacy.", checked: enableVoiceNoteHints, set: setEnableVoiceNoteHints },
                    { id: "opt-formal-long", icon: "📝", label: "Longer Formal Messages", desc: "Longer, more detailed messages instead of short texting style.", checked: enableFormalLongMessages, set: setEnableFormalLongMessages },
                  ].map(opt => (
                    <div key={opt.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <Switch id={opt.id} checked={opt.checked} onCheckedChange={opt.set} />
                      <div className="flex-1">
                        <Label htmlFor={opt.id} className="text-xs text-white cursor-pointer font-semibold">{opt.icon} {opt.label}</Label>
                        <p className="text-[10px] text-white/40 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  ))}

                  {/* Adaptive Pricing Toggle */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <Switch id="opt-adaptive" checked={adaptivePricing} onCheckedChange={setAdaptivePricing} />
                    <div className="flex-1">
                      <Label htmlFor="opt-adaptive" className="text-xs text-white cursor-pointer font-semibold">📊 Adaptive Pricing</Label>
                      <p className="text-[10px] text-white/40 mt-0.5">Auto-adjust ladder by script length</p>
                    </div>
                  </div>

                  {/* Editable Pricing Tiers */}
                  <div className="space-y-2">
                    <Label className="text-xs text-white/50 flex items-center justify-between">
                      <span>💰 Pricing Ladder</span>
                      <span className="text-amber-400 font-bold">Target: ${totalPricingTarget}</span>
                    </Label>
                    {pricingTiers.map((tier, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[10px] text-white/40 w-14 shrink-0 font-medium">{tier.label}</span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[9px] text-white/30">$</span>
                          <Input type="number" value={tier.min} onChange={e => updatePricingTier(i, "min", parseInt(e.target.value) || 0)}
                            className="bg-white/5 border-white/10 text-white text-xs h-7 w-16 p-1 text-center" />
                          <span className="text-[9px] text-white/30">—</span>
                          <Input type="number" value={tier.max} onChange={e => updatePricingTier(i, "max", parseInt(e.target.value) || 0)}
                            className="bg-white/5 border-white/10 text-white text-xs h-7 w-16 p-1 text-center" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Templates */}
          <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white text-[10px] h-8">
                <BookOpen className="h-3 w-3" /> Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-sm">Script Templates</DialogTitle></DialogHeader>
              <div className="grid gap-2">
                {SCRIPT_TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => applyTemplate(t)}
                    className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{t.icon}</span>
                      <span className="font-semibold text-sm text-white">{t.name}</span>
                      <Badge variant="outline" className="text-[9px] border-white/10 text-white/40 ml-auto">{t.steps.length} steps</Badge>
                      <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-400">
                        ${t.steps.reduce((sum, s) => sum + s.price, 0)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-white/40">{t.description}</p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-accent hover:bg-accent/80 h-8"><Plus className="h-3.5 w-3.5" /> New</Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white">
              <DialogHeader><DialogTitle>Create New Script</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Script title" value={newScript.title} onChange={e => setNewScript(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                <Input placeholder="Description" value={newScript.description} onChange={e => setNewScript(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newScript.category} onValueChange={v => setNewScript(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                      {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newScript.target_segment} onValueChange={v => setNewScript(p => ({ ...p, target_segment: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                      {SEGMENTS.map(s => <SelectItem key={s} value={s} className="text-white">{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createScript} className="w-full bg-accent hover:bg-accent/80">Create Script</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Generation Loading */}
      {generating && (
        <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse flex items-center justify-center">
                  {generatingQuality === "premium" ? <Crown className="h-5 w-5 text-white" /> : <Zap className="h-5 w-5 text-white" />}
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 animate-spin" style={{ borderTopColor: "transparent" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {generatingQuality === "premium" ? "Generating Premium Script..." : "Generating Fast Script..."}
                </p>
                <p className="text-xs text-white/40">
                  {SCRIPT_LENGTHS.find(l => l.value === scriptLength)?.desc} • Auto-saves to library
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <Progress value={Math.min((genTimer / genEstimate) * 100, 95)} className="h-1.5 flex-1" />
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Timer className="h-3 w-3" />
                    <span className="text-[10px] font-mono">{genTimer}s / ~{genEstimate}s</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Script list sidebar */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-xs">Scripts ({scripts.length})</CardTitle>
              {scripts.length > 0 && (
                <button onClick={() => setShowDeleteAll(true)} className="text-red-400/50 hover:text-red-400 transition-colors" title="Delete all scripts">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[600px] overflow-y-auto p-2">
            {scripts.map(s => (
              <div key={s.id} className={`relative group w-full text-left p-2.5 rounded-lg transition-all text-xs ${
                selectedScript?.id === s.id ? "bg-accent/20 border border-accent/30" : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06]"
              }`}>
                <button onClick={() => selectScript(s)} className="w-full text-left">
                  <p className="font-medium text-white truncate pr-12">{s.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{s.category}</Badge>
                    <Badge variant="outline" className={`text-[9px] ${s.status === "active" ? "border-emerald-500/20 text-emerald-400" : "border-white/10 text-white/40"}`}>{s.status}</Badge>
                  </div>
                </button>
                {showDeleteConfirm === s.id ? (
                  <div className="absolute right-1 top-1 flex items-center gap-1 bg-red-950/90 border border-red-500/30 rounded-lg p-1.5 z-10">
                    <span className="text-[9px] text-red-300 mr-1">Delete?</span>
                    <button onClick={() => deleteScript(s.id)} className="text-[9px] bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded">Yes</button>
                    <button onClick={() => setShowDeleteConfirm(null)} className="text-[9px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded">No</button>
                  </div>
                ) : (
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); analyzeScript(s); }}
                      className="p-1 rounded-md text-purple-400/60 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                      title="AI Script Analysis"
                    >
                      {analysisLoading && analyzingScriptId === s.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Brain className="h-3 w-3" />
                      )}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(s.id); }}
                      className="p-1 rounded-md text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete script">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {scripts.length === 0 && <p className="text-white/30 text-xs text-center py-4">No scripts yet</p>}
          </CardContent>
        </Card>

        {/* Delete All Confirmation Dialog */}
        <Dialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
          <DialogContent className="bg-[hsl(220,40%,13%)] border-red-500/20 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" /> Delete All Scripts
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-white/60">This will permanently delete all {scripts.length} scripts and their steps. This action cannot be undone.</p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setShowDeleteAll(false)} className="flex-1 bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white">Cancel</Button>
              <Button onClick={deleteAllScripts} className="flex-1 bg-red-600 hover:bg-red-500 text-white border-0">Delete All</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Script Analysis Dialog */}
        <Dialog open={showAnalysisDialog} onOpenChange={(open) => { setShowAnalysisDialog(open); if (!open) setAnalysisResult(null); }}>
          <DialogContent className="bg-[hsl(220,40%,10%)] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Brain className="h-5 w-5 text-purple-400" />
                AI Script Analysis
                {analysisLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-400 ml-2" />}
              </DialogTitle>
            </DialogHeader>

            {analysisLoading && !analysisResult && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative">
                  <Brain className="h-12 w-12 text-purple-400/30" />
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400 absolute -top-1 -right-1" />
                </div>
                <p className="text-white/50 text-sm">AI is deeply analyzing your script...</p>
                <p className="text-white/30 text-[10px]">Evaluating psychology, pricing, tone, conversion potential...</p>
              </div>
            )}

            {analysisResult && !analysisResult.error && (
              <div className="space-y-4">
                {/* Score & Summary */}
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${
                      analysisResult.score >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                      analysisResult.score >= 60 ? "bg-amber-500/20 text-amber-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {analysisResult.score}
                    </div>
                    <span className="text-[9px] text-white/30">Score</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/70 leading-relaxed">{analysisResult.summary}</p>
                  </div>
                </div>

                {/* Conversion Prediction */}
                {analysisResult.conversion_prediction && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] text-center">
                      <p className="text-[9px] text-white/30 mb-1">Current Conversion</p>
                      <p className="text-lg font-bold text-white/60">{analysisResult.conversion_prediction.current_estimated}%</p>
                    </div>
                    <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-center">
                      <p className="text-[9px] text-emerald-400/60 mb-1">After Improvements</p>
                      <p className="text-lg font-bold text-emerald-400">{analysisResult.conversion_prediction.after_improvements}%</p>
                    </div>
                    <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/20 text-center">
                      <p className="text-[9px] text-purple-400/60 mb-1">Revenue Uplift</p>
                      <p className="text-lg font-bold text-purple-400">+{analysisResult.conversion_prediction.revenue_uplift_percent}%</p>
                    </div>
                  </div>
                )}

                {/* Pricing Analysis */}
                {analysisResult.pricing_analysis && (
                  <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-semibold text-white">Pricing Analysis</span>
                      <Badge variant="outline" className={`text-[9px] ml-auto ${
                        analysisResult.pricing_analysis.ladder_rating === "smooth" ? "border-emerald-500/20 text-emerald-400" : "border-amber-500/20 text-amber-400"
                      }`}>
                        {analysisResult.pricing_analysis.ladder_rating}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-white/40">Current: <span className="text-white font-semibold">${analysisResult.pricing_analysis.current_total}</span></span>
                      <ArrowDown className="h-3 w-3 text-white/20 -rotate-90" />
                      <span className="text-emerald-400/70">Recommended: <span className="text-emerald-400 font-semibold">${analysisResult.pricing_analysis.recommended_total}</span></span>
                    </div>
                    <p className="text-[10px] text-white/40 mt-1">{analysisResult.pricing_analysis.notes}</p>
                  </div>
                )}

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Strengths</p>
                    {(analysisResult.strengths || []).map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-[10px] text-white/60">{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Weaknesses</p>
                    {(analysisResult.weaknesses || []).map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-red-500/5 rounded-lg border border-red-500/10">
                        <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                        <span className="text-[10px] text-white/60">{w}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Psychology Breakdown */}
                {analysisResult.psychology_breakdown?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1 mb-2"><Brain className="h-3 w-3" /> Psychology Breakdown</p>
                    <div className="grid grid-cols-1 gap-1">
                      {analysisResult.psychology_breakdown.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg">
                          <span className="text-[9px] text-white/30 font-mono w-8 shrink-0">#{p.step_index + 1}</span>
                          <span className="text-[10px] text-white/70 flex-1">{p.technique}</span>
                          <Badge variant="outline" className={`text-[8px] ${
                            p.effectiveness === "strong" ? "border-emerald-500/20 text-emerald-400" :
                            p.effectiveness === "moderate" ? "border-amber-500/20 text-amber-400" :
                            p.effectiveness === "weak" ? "border-red-500/20 text-red-400" :
                            "border-white/10 text-white/30"
                          }`}>
                            {p.effectiveness}
                          </Badge>
                          <span className="text-[9px] text-white/30 max-w-[200px] truncate">{p.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvements - The clickable ones */}
                {analysisResult.improvements?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <Target className="h-3 w-3" /> Improvements — Click to Apply
                    </p>
                    <div className="space-y-2">
                      {analysisResult.improvements.map((imp: any) => {
                        const isApplied = appliedImprovements.has(imp.id);
                        const isApplying = applyingId === imp.id;
                        return (
                          <div key={imp.id} className={`p-3 rounded-xl border transition-all ${
                            isApplied
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-white/[0.03] border-white/[0.08] hover:border-purple-500/30 hover:bg-purple-500/5"
                          }`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-white">{imp.title}</span>
                                  <Badge variant="outline" className={`text-[8px] ${
                                    imp.impact === "high" ? "border-red-500/20 text-red-400" :
                                    imp.impact === "medium" ? "border-amber-500/20 text-amber-400" :
                                    "border-white/10 text-white/30"
                                  }`}>
                                    {imp.impact} impact
                                  </Badge>
                                  <Badge variant="outline" className="text-[8px] border-white/10 text-white/30">
                                    {imp.category}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-white/50 leading-relaxed">{imp.description}</p>
                                {imp.changes?.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {imp.changes.map((c: any, ci: number) => (
                                      <div key={ci} className="flex items-center gap-2 text-[9px]">
                                        <span className="text-white/30 font-mono">Step {c.step_index + 1}</span>
                                        <span className="text-white/20">→</span>
                                        <span className="text-white/30">{c.field}:</span>
                                        <span className="text-red-400/50 line-through truncate max-w-[150px]">
                                          {typeof c.old_value === "string" ? c.old_value.substring(0, 40) : String(c.old_value)}
                                        </span>
                                        <span className="text-white/20">→</span>
                                        <span className="text-emerald-400/70 truncate max-w-[150px]">
                                          {typeof c.new_value === "string" ? c.new_value.substring(0, 40) : String(c.new_value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                disabled={isApplied || isApplying}
                                onClick={() => applyImprovement(imp)}
                                className={`shrink-0 h-8 text-[10px] gap-1 ${
                                  isApplied
                                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                                    : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0"
                                }`}
                              >
                                {isApplying ? (
                                  <><Loader2 className="h-3 w-3 animate-spin" /> Applying...</>
                                ) : isApplied ? (
                                  <><CheckCircle2 className="h-3 w-3" /> Applied</>
                                ) : (
                                  <><Zap className="h-3 w-3" /> Apply</>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Apply All button */}
                    {analysisResult.improvements.some((imp: any) => !appliedImprovements.has(imp.id)) && (
                      <Button
                        onClick={async () => {
                          for (const imp of analysisResult.improvements) {
                            if (!appliedImprovements.has(imp.id)) {
                              await applyImprovement(imp);
                            }
                          }
                        }}
                        disabled={!!applyingId}
                        className="w-full mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 h-10 gap-2 text-sm font-semibold"
                      >
                        <Sparkles className="h-4 w-4" />
                        Apply All Remaining Improvements
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {analysisResult?.error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-400">{analysisResult.error}</p>
                <p className="text-[10px] text-white/30 mt-1">Try again — AI might return better structured results.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Builder area */}
        <div className="lg:col-span-3 space-y-4">
          {selectedScript ? (
            <>
              {/* Script header */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 mr-4">
                      <Input value={selectedScript.title}
                        onChange={e => setSelectedScript(p => p ? { ...p, title: e.target.value } : p)}
                        className="bg-transparent border-none text-white font-semibold text-base p-0 h-auto focus-visible:ring-0" />
                      <Input value={selectedScript.description || ""}
                        onChange={e => setSelectedScript(p => p ? { ...p, description: e.target.value } : p)}
                        placeholder="Add description..." className="bg-transparent border-none text-white/40 text-xs p-0 h-auto mt-1 focus-visible:ring-0" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                        <button onClick={() => setViewMode("flow")} className={`px-2 py-1 text-[10px] rounded-md transition-all ${viewMode === "flow" ? "bg-accent text-white" : "text-white/40 hover:text-white"}`}>
                          <Eye className="h-3 w-3 inline mr-1" />Canvas
                        </button>
                        <button onClick={() => setViewMode("edit")} className={`px-2 py-1 text-[10px] rounded-md transition-all ${viewMode === "edit" ? "bg-accent text-white" : "text-white/40 hover:text-white"}`}>
                          <Zap className="h-3 w-3 inline mr-1" />Detail
                        </button>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-400">
                        <DollarSign className="h-2.5 w-2.5 mr-0.5" />${totalPrice}
                      </Badge>

                      {/* Export dropdown */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 text-white/40 hover:text-white text-[10px] gap-1">
                            <Download className="h-3 w-3" /> Export
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white max-w-xs">
                          <DialogHeader><DialogTitle className="text-sm">Export Script</DialogTitle></DialogHeader>
                          <div className="space-y-2">
                            <button onClick={() => exportToExcel(selectedScript, steps)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                              <div className="text-left">
                                <p className="text-xs font-semibold text-white">📊 Excel (Colors + Emojis)</p>
                                <p className="text-[10px] text-white/40">Full color-coded spreadsheet with psychology labels</p>
                              </div>
                            </button>
                            <button onClick={() => exportToGoogleSheetsHTML(selectedScript, steps)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-yellow-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all">
                              <FileSpreadsheet className="h-5 w-5 text-yellow-400" />
                              <div className="text-left">
                                <p className="text-xs font-semibold text-white">📊 Google Sheets (Colors)</p>
                                <p className="text-[10px] text-white/40">Color-coded .xls with psychology labels</p>
                              </div>
                            </button>
                            <button onClick={() => exportToCSV(selectedScript, steps)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all">
                              <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                              <div className="text-left">
                                <p className="text-xs font-semibold text-white">📋 Plain CSV</p>
                                <p className="text-[10px] text-white/40">Raw data for import/analysis</p>
                              </div>
                            </button>
                            <button onClick={() => exportToText(selectedScript, steps)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all">
                              <FileText className="h-5 w-5 text-blue-400" />
                              <div className="text-left">
                                <p className="text-xs font-semibold text-white">📝 Plain Text / Notes</p>
                                <p className="text-[10px] text-white/40">With emojis, formatted for Apple Notes</p>
                              </div>
                            </button>
                            <button onClick={() => exportToMarkdown(selectedScript, steps)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                              <FileText className="h-5 w-5 text-purple-400" />
                              <div className="text-left">
                                <p className="text-xs font-semibold text-white">📄 Word / Notion / Docs</p>
                                <p className="text-[10px] text-white/40">Rich formatted with pricing table & psychology</p>
                              </div>
                            </button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button size="sm" variant="ghost" onClick={cloneScript} className="h-7 text-white/40 hover:text-white text-[10px] gap-1">
                        <Copy className="h-3 w-3" /> Clone
                      </Button>
                      <Button size="sm" onClick={saveScript} disabled={saving} className="h-7 bg-accent hover:bg-accent/80 text-[10px] gap-1">
                        <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedScript.category} onValueChange={v => setSelectedScript(p => p ? { ...p, category: v } : p)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] w-32"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                        {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-white text-xs">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selectedScript.target_segment} onValueChange={v => setSelectedScript(p => p ? { ...p, target_segment: v } : p)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] w-36"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                        {SEGMENTS.map(s => <SelectItem key={s} value={s} className="text-white text-xs">{s.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Flow / Edit View */}
              {viewMode === "flow" ? (
                <ScriptFlowView
                  steps={steps}
                  onEditStep={(i) => { setEditingStep(i); setViewMode("edit"); }}
                  onAddStep={addStep}
                  onRemoveStep={removeStep}
                  onMoveStep={moveStep}
                  onDuplicateStep={duplicateStep}
                  onUpdateStep={updateStep}
                  onReorderSteps={reorderSteps}
                />
              ) : (
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <StepEditor key={i} step={step} index={i}
                      isExpanded={editingStep === i}
                      onToggle={() => setEditingStep(editingStep === i ? null : i)}
                      onUpdate={(field, value) => updateStep(i, field, value)}
                      onRemove={() => removeStep(i)}
                      onMoveUp={() => moveStep(i, "up")}
                      onMoveDown={() => moveStep(i, "down")}
                      onDuplicate={() => duplicateStep(i)} />
                  ))}
                  <StepAddButtons onAdd={addStep} />
                </div>
              )}

              {/* Pricing ladder */}
              {paidSteps.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-xs flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-amber-400" /> Pricing Ladder
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      {paidSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="text-center p-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                            <p className="text-[9px] text-white/30">Step {step.step_order + 1}</p>
                            <p className="text-sm font-bold text-amber-400">${step.price}</p>
                          </div>
                          {i < paidSteps.length - 1 && <ArrowDown className="h-3 w-3 text-white/15 -rotate-90" />}
                        </div>
                      ))}
                      <div className="ml-auto text-right">
                        <p className="text-[9px] text-white/30">Total Value</p>
                        <p className="text-lg font-bold text-white">${totalPrice}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="py-16 text-center space-y-4">
                <Zap className="h-8 w-8 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Select a script, use a template, or generate one with AI</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" onClick={() => setShowTemplates(true)} variant="outline" className="gap-1.5 bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white">
                    <BookOpen className="h-3.5 w-3.5" /> Templates
                  </Button>
                  <Button size="sm" onClick={() => generateScript("fast")} disabled={generating}
                    className="gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                    <Zap className="h-3.5 w-3.5" /> Generate Fast
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Step Type Config ── */
const STEP_TYPES = [
  { value: "welcome", label: "Welcome Message", icon: Send, color: "bg-cyan-500", textColor: "text-cyan-900" },
  { value: "message", label: "Message", icon: MessageSquare, color: "bg-yellow-400", textColor: "text-yellow-900" },
  { value: "free_content", label: "Free Content", icon: Image, color: "bg-green-500", textColor: "text-green-900" },
  { value: "ppv_content", label: "PPV Content", icon: Film, color: "bg-green-400", textColor: "text-green-900" },
  { value: "question", label: "Question", icon: HelpCircle, color: "bg-yellow-300", textColor: "text-yellow-900" },
  { value: "condition", label: "Condition Branch", icon: GitBranch, color: "bg-blue-400", textColor: "text-blue-900" },
  { value: "followup_purchased", label: "Follow-up (Purchased)", icon: Send, color: "bg-pink-300", textColor: "text-pink-900" },
  { value: "followup_ignored", label: "Follow-up (Ignored)", icon: Send, color: "bg-red-500", textColor: "text-white" },
  { value: "delay", label: "Delay / Wait", icon: Clock, color: "bg-gray-400", textColor: "text-gray-900" },
];

const getStepConfig = (type: string) => STEP_TYPES.find(s => s.value === type) || STEP_TYPES[1];

/* ── Step Add Buttons ── */
const StepAddButtons = ({ onAdd }: { onAdd: (type: string) => void }) => (
  <div className="flex flex-wrap gap-1.5 p-3 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
    <p className="text-[10px] text-white/30 w-full mb-1">Add step:</p>
    {STEP_TYPES.map(t => (
      <button key={t.value} onClick={() => onAdd(t.value)}
        className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${t.color}/20 text-white/60 hover:text-white border border-white/5 hover:border-white/10`}>
        {t.label}
      </button>
    ))}
  </div>
);

/* ── Step Editor ── */
const StepEditor = ({ step, index, isExpanded, onToggle, onUpdate, onRemove, onMoveUp, onMoveDown, onDuplicate }: {
  step: any; index: number; isExpanded: boolean;
  onToggle: () => void; onUpdate: (field: string, value: any) => void;
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void; onDuplicate: () => void;
}) => {
  const cfg = getStepConfig(step.step_type);

  return (
    <div>
      <Card className={`bg-white/5 backdrop-blur-sm border-white/10 transition-all ${isExpanded ? "ring-1 ring-accent/30" : ""}`}>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={onToggle}>
            <GripVertical className="h-3.5 w-3.5 text-white/20 shrink-0" />
            <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${cfg.color} ${cfg.textColor} shrink-0`}>
              {cfg.label}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/30 font-mono">#{index + 1}</span>
                <span className="text-xs font-medium text-white truncate">{step.title || step.content || "Untitled"}</span>
              </div>
            </div>
            {step.price > 0 && <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-400 shrink-0">${step.price}</Badge>}
            {step.delay_minutes > 0 && <Badge variant="outline" className="text-[9px] border-white/10 text-white/30 shrink-0"><Clock className="h-2 w-2 mr-0.5" />{step.delay_minutes}m</Badge>}
            <div className="flex gap-0.5">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={e => { e.stopPropagation(); onMoveUp(); }}><ChevronUp className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={e => { e.stopPropagation(); onMoveDown(); }}><ChevronDown className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={e => { e.stopPropagation(); onDuplicate(); }}><Copy className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400/50 hover:text-red-400" onClick={e => { e.stopPropagation(); onRemove(); }}><Trash2 className="h-3 w-3" /></Button>
            </div>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
          </div>

          {isExpanded && (
            <div className="px-3 pb-3 pt-0 border-t border-white/5 space-y-3">
              <div className="grid grid-cols-2 gap-2 pt-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Step Title</label>
                  <Input value={step.title} onChange={e => onUpdate("title", e.target.value)} placeholder="e.g. Welcome Message" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Step Type</label>
                  <Select value={step.step_type} onValueChange={v => onUpdate("step_type", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10 max-h-60">
                      {STEP_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value} className="text-white text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${t.color}`} />
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/40 block mb-1">Content / Message</label>
                <Textarea value={step.content} onChange={e => onUpdate("content", e.target.value)}
                  placeholder="Message text, caption, or instructions..."
                  className="min-h-[60px] bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20 resize-none" />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Price ($)</label>
                  <Input type="number" value={step.price} onChange={e => onUpdate("price", parseFloat(e.target.value) || 0)} className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Delay (min)</label>
                  <Input type="number" value={step.delay_minutes} onChange={e => onUpdate("delay_minutes", parseInt(e.target.value) || 0)} className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Media Type</label>
                  <Select value={step.media_type || "none"} onValueChange={v => onUpdate("media_type", v === "none" ? "" : v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                      <SelectItem value="none" className="text-white text-xs">None</SelectItem>
                      <SelectItem value="image" className="text-white text-xs">Image(s)</SelectItem>
                      <SelectItem value="video" className="text-white text-xs">Video(s)</SelectItem>
                      <SelectItem value="mixed" className="text-white text-xs">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Media Desc.</label>
                  <Input value={step.media_url} onChange={e => onUpdate("media_url", e.target.value)} placeholder="e.g. 2 selfies" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
              </div>

              {step.step_type === "condition" && (
                <div className="p-2 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <p className="text-[10px] text-blue-400 font-medium mb-1">Branching Condition</p>
                  <Input value={step.condition_logic?.condition || ""} onChange={e => onUpdate("condition_logic", { ...step.condition_logic, condition: e.target.value })}
                    placeholder="e.g. Responded to message" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {index < 99 && (
        <div className="flex justify-center py-1">
          <ArrowDown className="h-3 w-3 text-white/15" />
        </div>
      )}
    </div>
  );
};

export default ScriptBuilder;
