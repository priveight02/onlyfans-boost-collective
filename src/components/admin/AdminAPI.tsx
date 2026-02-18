import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code2, Copy, Check, Search, Globe, Lock, Zap, Database, ChevronDown, ChevronRight,
  Server, Shield, BookOpen, Terminal, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  params?: { name: string; type: string; required?: boolean; description: string }[];
  body?: { name: string; type: string; required?: boolean; description: string }[];
  example_response?: string;
}

interface EndpointGroup {
  name: string;
  icon: string;
  description: string;
  endpoints: Endpoint[];
}

const API_GROUPS: EndpointGroup[] = [
  {
    name: "Accounts",
    icon: "👤",
    description: "Manage creator/model accounts in the Platform",
    endpoints: [
      { method: "GET", path: "/v1/accounts", description: "List all managed accounts with optional filters", params: [
        { name: "status", type: "string", description: "Filter by status (active, paused, inactive)" },
        { name: "tier", type: "string", description: "Filter by tier (starter, pro, vip, elite)" },
        { name: "search", type: "string", description: "Search by username or display name" },
        { name: "limit", type: "number", description: "Max results (default 50)" },
        { name: "offset", type: "number", description: "Pagination offset" },
      ] },
      { method: "GET", path: "/v1/accounts/:id", description: "Get a single account by ID" },
      { method: "GET", path: "/v1/accounts/:id/activities", description: "Get account activity log" },
      { method: "GET", path: "/v1/accounts/:id/conversations", description: "Get DM conversations for account" },
      { method: "GET", path: "/v1/accounts/:id/scripts", description: "Get scripts assigned to account" },
      { method: "GET", path: "/v1/accounts/:id/personas", description: "Get persona profiles for account" },
      { method: "GET", path: "/v1/accounts/:id/fans", description: "Get fan emotional profiles" },
      { method: "GET", path: "/v1/accounts/:id/financials", description: "Get financial records" },
      { method: "GET", path: "/v1/accounts/:id/auto-respond", description: "Get auto-respond state" },
      { method: "GET", path: "/v1/accounts/:id/threads", description: "Get message threads" },
      { method: "GET", path: "/v1/accounts/:id/keywords", description: "Get keyword delay rules" },
      { method: "GET", path: "/v1/accounts/:id/connections", description: "Get social connections for account" },
      { method: "GET", path: "/v1/accounts/:id/bio-links", description: "Get bio links for account" },
      { method: "GET", path: "/v1/accounts/:id/content", description: "Get content calendar items" },
      { method: "GET", path: "/v1/accounts/:id/workflows", description: "Get automation workflows" },
      { method: "POST", path: "/v1/accounts", description: "Create a new managed account", body: [
        { name: "username", type: "string", required: true, description: "Unique username" },
        { name: "display_name", type: "string", description: "Display name" },
        { name: "platform", type: "string", description: "Platform (default: onlyfans)" },
        { name: "tier", type: "string", description: "Account tier" },
      ] },
      { method: "PATCH", path: "/v1/accounts/:id", description: "Update an account" },
      { method: "DELETE", path: "/v1/accounts/:id", description: "Delete an account permanently" },
    ],
  },
  {
    name: "Scripts & Storylines",
    icon: "📝",
    description: "Chat scripts, steps, and storyline flows",
    endpoints: [
      { method: "GET", path: "/v1/scripts", description: "List all scripts with steps", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "status", type: "string", description: "Filter by status" },
        { name: "category", type: "string", description: "Filter by category" },
      ] },
      { method: "GET", path: "/v1/scripts/:id", description: "Get script with all steps" },
      { method: "GET", path: "/v1/scripts/:id/steps", description: "Get steps for a script" },
      { method: "GET", path: "/v1/scripts/:id/analytics", description: "Get script performance analytics" },
      { method: "POST", path: "/v1/scripts", description: "Create script with optional steps" },
      { method: "POST", path: "/v1/scripts/:id/generate", description: "AI-generate script content", body: [
        { name: "prompt", type: "string", required: true, description: "Generation prompt" },
        { name: "style", type: "string", description: "Writing style (flirty, professional, casual)" },
      ] },
      { method: "PATCH", path: "/v1/scripts/:id", description: "Update script metadata" },
      { method: "DELETE", path: "/v1/scripts/:id", description: "Delete script and all steps" },
    ],
  },
  {
    name: "AI Conversations",
    icon: "💬",
    description: "AI DM conversations, messages, and auto-respond",
    endpoints: [
      { method: "GET", path: "/v1/conversations", description: "List all DM conversations", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "platform", type: "string", description: "Filter by platform" },
        { name: "status", type: "string", description: "Filter by status" },
        { name: "folder", type: "string", description: "Filter by folder" },
        { name: "ai_enabled", type: "boolean", description: "Filter AI-enabled only" },
      ] },
      { method: "GET", path: "/v1/conversations/:id", description: "Get conversation details" },
      { method: "GET", path: "/v1/conversations/:id/messages", description: "Get all messages in conversation" },
      { method: "POST", path: "/v1/conversations", description: "Create a new conversation" },
      { method: "POST", path: "/v1/conversations/:id/messages", description: "Send message to conversation" },
      { method: "PATCH", path: "/v1/conversations/:id", description: "Update conversation (toggle AI, folder, status)" },
      { method: "DELETE", path: "/v1/conversations/:id", description: "Delete conversation and all messages" },
    ],
  },
  {
    name: "DM Messages",
    icon: "✉️",
    description: "Direct access to AI DM messages across all conversations",
    endpoints: [
      { method: "GET", path: "/v1/dm-messages", description: "List DM messages", params: [
        { name: "conversation_id", type: "uuid", description: "Filter by conversation" },
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "sender_type", type: "string", description: "Filter by sender (ai, fan, human)" },
      ] },
      { method: "GET", path: "/v1/dm-messages/:id", description: "Get single message" },
      { method: "POST", path: "/v1/dm-messages", description: "Create a DM message directly" },
      { method: "DELETE", path: "/v1/dm-messages/:id", description: "Delete a message" },
    ],
  },
  {
    name: "Auto-Respond",
    icon: "🤖",
    description: "AI auto-respond state per account",
    endpoints: [
      { method: "GET", path: "/v1/auto-respond", description: "List all auto-respond states", params: [{ name: "account_id", type: "uuid", description: "Filter by account" }] },
      { method: "GET", path: "/v1/auto-respond/:account_id", description: "Get auto-respond state for account" },
      { method: "POST", path: "/v1/auto-respond", description: "Create/upsert auto-respond config" },
      { method: "PATCH", path: "/v1/auto-respond/:account_id", description: "Toggle auto-respond on/off, update keywords" },
    ],
  },
  {
    name: "Keywords & Delays",
    icon: "🔑",
    description: "AI keyword trigger rules and automated responses",
    endpoints: [
      { method: "GET", path: "/v1/keywords", description: "List keyword rules", params: [{ name: "account_id", type: "uuid", description: "Filter by account" }] },
      { method: "GET", path: "/v1/keywords/:id", description: "Get keyword rule" },
      { method: "POST", path: "/v1/keywords", description: "Create keyword rule" },
      { method: "PATCH", path: "/v1/keywords/:id", description: "Update keyword rule" },
      { method: "DELETE", path: "/v1/keywords/:id", description: "Delete keyword rule" },
    ],
  },
  {
    name: "Conversation Learnings",
    icon: "📚",
    description: "AI conversation learning outcomes and strategy tracking",
    endpoints: [
      { method: "GET", path: "/v1/conversation-learnings", description: "List conversation learnings", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "strategy_type", type: "string", description: "Filter by strategy type" },
        { name: "outcome", type: "string", description: "Filter by outcome" },
      ] },
      { method: "POST", path: "/v1/conversation-learnings", description: "Log a new learning outcome" },
    ],
  },
  {
    name: "AI Learnings",
    icon: "🧠",
    description: "AI-learned strategies, winning patterns, and behavior models",
    endpoints: [
      { method: "GET", path: "/v1/learnings", description: "Get learned strategies", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "behavior_type", type: "string", description: "Filter by behavior type" },
      ] },
      { method: "POST", path: "/v1/learnings", description: "Create or update learned strategy" },
    ],
  },
  {
    name: "Followers & Discovery",
    icon: "🔍",
    description: "Fetched/discovered followers, bulk outreach targets",
    endpoints: [
      { method: "GET", path: "/v1/followers", description: "List discovered followers", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "source", type: "string", description: "Filter by source (discovered, dm_scan)" },
        { name: "gender", type: "string", description: "Filter by gender" },
        { name: "search", type: "string", description: "Search by username or name" },
        { name: "limit", type: "number", description: "Max results" },
        { name: "offset", type: "number", description: "Pagination offset" },
      ] },
      { method: "GET", path: "/v1/followers/:id", description: "Get follower details" },
      { method: "POST", path: "/v1/followers", description: "Batch upsert followers (supports arrays)" },
      { method: "DELETE", path: "/v1/followers/:id", description: "Delete follower record" },
    ],
  },
  {
    name: "Message Threads",
    icon: "📨",
    description: "Messaging threads with assignment and priority",
    endpoints: [
      { method: "GET", path: "/v1/threads", description: "List message threads", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "status", type: "string", description: "Filter by status" },
        { name: "priority", type: "string", description: "Filter by priority" },
        { name: "assigned_chatter", type: "uuid", description: "Filter by assigned chatter" },
      ] },
      { method: "GET", path: "/v1/threads/:id", description: "Get thread details" },
      { method: "POST", path: "/v1/threads", description: "Create message thread" },
      { method: "PATCH", path: "/v1/threads/:id", description: "Update thread (assign, prioritize)" },
    ],
  },
  {
    name: "Social Connections",
    icon: "🔗",
    description: "Platform OAuth connections and tokens",
    endpoints: [
      { method: "GET", path: "/v1/social-connections", description: "List all social connections", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "platform", type: "string", description: "Filter by platform" },
        { name: "is_connected", type: "boolean", description: "Filter connected only" },
      ] },
      { method: "GET", path: "/v1/social-connections/:id", description: "Get connection details" },
      { method: "POST", path: "/v1/social-connections", description: "Create/upsert social connection" },
      { method: "PATCH", path: "/v1/social-connections/:id", description: "Update connection token or metadata" },
      { method: "DELETE", path: "/v1/social-connections/:id", description: "Disconnect platform" },
    ],
  },
  {
    name: "Social Posts",
    icon: "📱",
    description: "Social media posts management and publishing",
    endpoints: [
      { method: "GET", path: "/v1/social-posts", description: "List social posts", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "platform", type: "string", description: "Filter by platform" },
        { name: "status", type: "string", description: "Filter by status (draft, scheduled, published)" },
      ] },
      { method: "GET", path: "/v1/social-posts/:id", description: "Get post details" },
      { method: "POST", path: "/v1/social-posts", description: "Create social post" },
      { method: "POST", path: "/v1/social-posts/:id/publish", description: "Publish a draft/scheduled post" },
      { method: "PATCH", path: "/v1/social-posts/:id", description: "Update post" },
      { method: "DELETE", path: "/v1/social-posts/:id", description: "Delete post" },
    ],
  },
  {
    name: "Social Comment Replies",
    icon: "💬",
    description: "Comment replies tracking and AI-generated responses",
    endpoints: [
      { method: "GET", path: "/v1/comment-replies", description: "List comment replies", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "platform", type: "string", description: "Filter by platform" },
      ] },
      { method: "POST", path: "/v1/comment-replies", description: "Store a comment reply" },
      { method: "DELETE", path: "/v1/comment-replies/:id", description: "Delete reply record" },
    ],
  },
  {
    name: "Social Analytics",
    icon: "📊",
    description: "Social media analytics, metrics, and insights",
    endpoints: [
      { method: "GET", path: "/v1/social-analytics", description: "Get analytics data", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "platform", type: "string", description: "Filter by platform" },
        { name: "metric_type", type: "string", description: "Filter by metric type" },
        { name: "from", type: "date", description: "Start date (ISO format)" },
        { name: "to", type: "date", description: "End date (ISO format)" },
      ] },
      { method: "POST", path: "/v1/social-analytics", description: "Store analytics snapshot" },
    ],
  },
  {
    name: "Community Posts",
    icon: "📰",
    description: "User-generated community posts, likes, comments, and saves",
    endpoints: [
      { method: "GET", path: "/v1/posts", description: "List posts", params: [{ name: "user_id", type: "uuid", description: "Filter by user" }] },
      { method: "GET", path: "/v1/posts/:id", description: "Get post details" },
      { method: "GET", path: "/v1/posts/:id/comments", description: "Get post comments" },
      { method: "GET", path: "/v1/posts/:id/likes", description: "Get post likes" },
      { method: "GET", path: "/v1/posts/:id/saves", description: "Get post saves" },
      { method: "POST", path: "/v1/posts", description: "Create a post" },
      { method: "DELETE", path: "/v1/posts/:id", description: "Delete post with all engagement" },
    ],
  },
  {
    name: "Post Comments",
    icon: "💭",
    description: "Direct access to post comments",
    endpoints: [
      { method: "GET", path: "/v1/post-comments", description: "List all comments", params: [{ name: "post_id", type: "uuid", description: "Filter by post" }] },
      { method: "POST", path: "/v1/post-comments", description: "Create comment" },
      { method: "DELETE", path: "/v1/post-comments/:id", description: "Delete comment" },
    ],
  },
  {
    name: "Follows & Requests",
    icon: "👥",
    description: "Follow requests management",
    endpoints: [
      { method: "GET", path: "/v1/follows", description: "List follow requests", params: [
        { name: "status", type: "string", description: "Filter by status (pending, accepted, rejected)" },
        { name: "requester_id", type: "uuid", description: "Filter by requester" },
        { name: "target_id", type: "uuid", description: "Filter by target" },
      ] },
      { method: "PATCH", path: "/v1/follows/:id", description: "Accept/reject follow request" },
      { method: "DELETE", path: "/v1/follows/:id", description: "Delete follow request" },
    ],
  },
  {
    name: "User Ranks",
    icon: "🏆",
    description: "XP, tiers, and gamification ranks",
    endpoints: [
      { method: "GET", path: "/v1/ranks", description: "List all user ranks", params: [{ name: "rank_tier", type: "string", description: "Filter by tier" }] },
      { method: "GET", path: "/v1/ranks/:user_id", description: "Get rank for user" },
      { method: "PATCH", path: "/v1/ranks/:user_id", description: "Update XP or rank data" },
    ],
  },
  {
    name: "Personas",
    icon: "🎭",
    description: "Persona DNA profiles and consistency checks",
    endpoints: [
      { method: "GET", path: "/v1/personas", description: "List personas", params: [{ name: "account_id", type: "uuid", description: "Filter by account" }] },
      { method: "GET", path: "/v1/personas/:id", description: "Get persona details" },
      { method: "POST", path: "/v1/personas", description: "Create persona profile" },
      { method: "PATCH", path: "/v1/personas/:id", description: "Update persona" },
      { method: "DELETE", path: "/v1/personas/:id", description: "Delete persona" },
    ],
  },
  {
    name: "Consistency Checks",
    icon: "✅",
    description: "Persona consistency analysis results",
    endpoints: [
      { method: "GET", path: "/v1/consistency-checks", description: "List consistency checks", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "check_type", type: "string", description: "Filter by check type" },
      ] },
    ],
  },
  {
    name: "Fans & Psychology",
    icon: "❤️",
    description: "Fan emotional profiling and behavior tracking",
    endpoints: [
      { method: "GET", path: "/v1/fans", description: "List fan profiles", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "behavior_type", type: "string", description: "Filter by behavior type" },
        { name: "churn_risk_min", type: "number", description: "Min churn risk threshold" },
      ] },
      { method: "GET", path: "/v1/fans/:id", description: "Get fan profile" },
      { method: "POST", path: "/v1/fans", description: "Create fan profile" },
      { method: "PATCH", path: "/v1/fans/:id", description: "Update fan profile" },
      { method: "DELETE", path: "/v1/fans/:id", description: "Delete fan profile" },
    ],
  },
  {
    name: "Team",
    icon: "👨‍💼",
    description: "Team members management",
    endpoints: [
      { method: "GET", path: "/v1/team", description: "List all team members" },
      { method: "GET", path: "/v1/team/:id", description: "Get team member" },
      { method: "GET", path: "/v1/team/:id/performance", description: "Get team member performance stats" },
      { method: "POST", path: "/v1/team", description: "Add team member" },
      { method: "PATCH", path: "/v1/team/:id", description: "Update team member" },
      { method: "DELETE", path: "/v1/team/:id", description: "Remove team member" },
    ],
  },
  {
    name: "Contracts",
    icon: "📄",
    description: "Contracts and agreements",
    endpoints: [
      { method: "GET", path: "/v1/contracts", description: "List contracts", params: [{ name: "account_id", type: "uuid", description: "Filter by account" }] },
      { method: "GET", path: "/v1/contracts/:id", description: "Get contract" },
      { method: "POST", path: "/v1/contracts", description: "Create contract" },
      { method: "POST", path: "/v1/contracts/:id/sign", description: "Sign a contract" },
      { method: "PATCH", path: "/v1/contracts/:id", description: "Update contract" },
      { method: "DELETE", path: "/v1/contracts/:id", description: "Delete contract" },
    ],
  },
  {
    name: "Content Calendar",
    icon: "📅",
    description: "Content scheduling and management",
    endpoints: [
      { method: "GET", path: "/v1/content", description: "List content items", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "status", type: "string", description: "Filter by status" },
        { name: "platform", type: "string", description: "Filter by platform" },
        { name: "from", type: "date", description: "Scheduled after date" },
        { name: "to", type: "date", description: "Scheduled before date" },
      ] },
      { method: "GET", path: "/v1/content/:id", description: "Get content details" },
      { method: "POST", path: "/v1/content", description: "Create content item" },
      { method: "POST", path: "/v1/content/:id/publish", description: "Publish content now" },
      { method: "PATCH", path: "/v1/content/:id", description: "Update content item" },
      { method: "DELETE", path: "/v1/content/:id", description: "Delete content" },
    ],
  },
  {
    name: "Bio Links",
    icon: "🔗",
    description: "Bio link pages and click analytics",
    endpoints: [
      { method: "GET", path: "/v1/bio-links", description: "List bio links" },
      { method: "GET", path: "/v1/bio-links/:id", description: "Get bio link" },
      { method: "GET", path: "/v1/bio-links/:id/clicks", description: "Get click analytics" },
      { method: "POST", path: "/v1/bio-links", description: "Create bio link page" },
      { method: "PATCH", path: "/v1/bio-links/:id", description: "Update bio link" },
      { method: "DELETE", path: "/v1/bio-links/:id", description: "Delete bio link" },
    ],
  },
  {
    name: "Financials",
    icon: "💰",
    description: "Financial records and revenue tracking",
    endpoints: [
      { method: "GET", path: "/v1/financials", description: "List financial records", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "record_type", type: "string", description: "Filter by type" },
        { name: "from", type: "date", description: "Period start" },
        { name: "to", type: "date", description: "Period end" },
      ] },
      { method: "POST", path: "/v1/financials", description: "Create financial record" },
      { method: "PATCH", path: "/v1/financials/:id", description: "Update financial record" },
      { method: "DELETE", path: "/v1/financials/:id", description: "Delete financial record" },
    ],
  },
  {
    name: "Wallets & Credits",
    icon: "💳",
    description: "User credit wallets and transactions",
    endpoints: [
      { method: "GET", path: "/v1/wallets", description: "List all wallets" },
      { method: "GET", path: "/v1/wallets/:user_id", description: "Get wallet by user ID" },
      { method: "GET", path: "/v1/wallets/:user_id/transactions", description: "Get credit transaction history" },
      { method: "PATCH", path: "/v1/wallets/:user_id", description: "Update wallet balance" },
      { method: "POST", path: "/v1/wallets/:user_id/grant", description: "Grant credits to user" },
      { method: "POST", path: "/v1/wallets/:user_id/deduct", description: "Deduct credits from user" },
    ],
  },
  {
    name: "Credit Packages",
    icon: "🪙",
    description: "Credit package configuration",
    endpoints: [
      { method: "GET", path: "/v1/credit-packages", description: "List all credit packages" },
      { method: "POST", path: "/v1/credit-packages", description: "Create credit package" },
      { method: "PATCH", path: "/v1/credit-packages/:id", description: "Update package pricing/settings" },
      { method: "DELETE", path: "/v1/credit-packages/:id", description: "Deactivate credit package" },
    ],
  },
  {
    name: "Workflows & Automation",
    icon: "⚡",
    description: "Automation workflows and triggers",
    endpoints: [
      { method: "GET", path: "/v1/workflows", description: "List workflows", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "status", type: "string", description: "Filter by status (active, paused, draft)" },
        { name: "trigger_type", type: "string", description: "Filter by trigger type" },
      ] },
      { method: "GET", path: "/v1/workflows/:id", description: "Get workflow details" },
      { method: "GET", path: "/v1/workflows/:id/runs", description: "Get workflow run history" },
      { method: "POST", path: "/v1/workflows", description: "Create workflow" },
      { method: "POST", path: "/v1/workflows/:id/trigger", description: "Manually trigger a workflow" },
      { method: "PATCH", path: "/v1/workflows/:id", description: "Update workflow" },
      { method: "DELETE", path: "/v1/workflows/:id", description: "Delete workflow" },
    ],
  },
  {
    name: "AI Copilot",
    icon: "🤖",
    description: "Copilot conversations and generated content",
    endpoints: [
      { method: "GET", path: "/v1/copilot", description: "List copilot conversations", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "context_type", type: "string", description: "Filter by context type" },
      ] },
      { method: "GET", path: "/v1/copilot/:id", description: "Get conversation with messages" },
      { method: "POST", path: "/v1/copilot", description: "Start new copilot conversation" },
      { method: "POST", path: "/v1/copilot/:id/message", description: "Send message to copilot" },
      { method: "DELETE", path: "/v1/copilot/:id", description: "Delete copilot conversation" },
    ],
  },
  {
    name: "Generated Content",
    icon: "🎨",
    description: "AI-generated images, videos, and media",
    endpoints: [
      { method: "GET", path: "/v1/generated-content", description: "List generated content", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "content_type", type: "string", description: "Filter by type (image, video, audio)" },
      ] },
      { method: "POST", path: "/v1/generated-content/image", description: "Generate AI image" },
      { method: "POST", path: "/v1/generated-content/video", description: "Generate AI video" },
      { method: "DELETE", path: "/v1/generated-content/:id", description: "Delete generated content" },
    ],
  },
  {
    name: "Voices",
    icon: "🎙️",
    description: "AI voice profiles for copilot",
    endpoints: [
      { method: "GET", path: "/v1/voices", description: "List all voices" },
      { method: "GET", path: "/v1/voices/:id", description: "Get voice details" },
      { method: "POST", path: "/v1/voices", description: "Create voice profile" },
      { method: "POST", path: "/v1/voices/:id/generate", description: "Generate audio with voice" },
      { method: "DELETE", path: "/v1/voices/:id", description: "Delete voice" },
    ],
  },
  {
    name: "Chat Rooms",
    icon: "🏠",
    description: "Intranet chat rooms, messages, and members",
    endpoints: [
      { method: "GET", path: "/v1/chat-rooms", description: "List all chat rooms" },
      { method: "GET", path: "/v1/chat-rooms/:id", description: "Get chat room" },
      { method: "GET", path: "/v1/chat-rooms/:id/messages", description: "Get messages in room" },
      { method: "GET", path: "/v1/chat-rooms/:id/members", description: "Get room members" },
      { method: "POST", path: "/v1/chat-rooms", description: "Create chat room" },
      { method: "POST", path: "/v1/chat-rooms/:id/messages", description: "Send message to room" },
      { method: "POST", path: "/v1/chat-rooms/:id/members", description: "Add member to room" },
      { method: "DELETE", path: "/v1/chat-rooms/:id", description: "Delete room and all messages" },
      { method: "DELETE", path: "/v1/chat-rooms/:id/members/:memberId", description: "Remove member from room" },
    ],
  },
  {
    name: "User Profiles",
    icon: "🧑",
    description: "Platform user profiles and preferences",
    endpoints: [
      { method: "GET", path: "/v1/profiles", description: "List profiles", params: [{ name: "search", type: "string", description: "Search by username, name, email" }] },
      { method: "GET", path: "/v1/profiles/:user_id", description: "Get profile by user ID" },
      { method: "PATCH", path: "/v1/profiles/:user_id", description: "Update user profile" },
    ],
  },
  {
    name: "AI Models & Config",
    icon: "⚙️",
    description: "AI model registry, prompt templates, and safety rules",
    endpoints: [
      { method: "GET", path: "/v1/ai-models", description: "List all AI models" },
      { method: "GET", path: "/v1/ai-models/:id", description: "Get model details" },
      { method: "POST", path: "/v1/ai-models", description: "Register new AI model" },
      { method: "PATCH", path: "/v1/ai-models/:id", description: "Update model config or kill switch" },
      { method: "GET", path: "/v1/prompt-templates", description: "List prompt templates" },
      { method: "POST", path: "/v1/prompt-templates", description: "Create prompt template" },
      { method: "PATCH", path: "/v1/prompt-templates/:id", description: "Update template" },
      { method: "GET", path: "/v1/safety-rules", description: "List safety rules" },
      { method: "POST", path: "/v1/safety-rules", description: "Create safety rule" },
    ],
  },
  {
    name: "AI Requests Log",
    icon: "📋",
    description: "AI request history, usage tracking, and cost monitoring",
    endpoints: [
      { method: "GET", path: "/v1/ai-requests", description: "List AI requests", params: [
        { name: "model_id", type: "uuid", description: "Filter by model" },
        { name: "status", type: "string", description: "Filter by status" },
        { name: "safety_flagged", type: "boolean", description: "Filter flagged requests" },
        { name: "from", type: "date", description: "From date" },
        { name: "to", type: "date", description: "To date" },
      ] },
      { method: "GET", path: "/v1/ai-requests/:id", description: "Get request details" },
      { method: "GET", path: "/v1/ai-requests/stats", description: "Get aggregated AI usage stats" },
    ],
  },
  {
    name: "Feature Flags",
    icon: "🚩",
    description: "Feature flags, targeting rules, and experiments",
    endpoints: [
      { method: "GET", path: "/v1/feature-flags", description: "List all feature flags" },
      { method: "GET", path: "/v1/feature-flags/:id", description: "Get flag with rules" },
      { method: "POST", path: "/v1/feature-flags", description: "Create feature flag" },
      { method: "PATCH", path: "/v1/feature-flags/:id", description: "Update flag (toggle, rollout %)" },
      { method: "DELETE", path: "/v1/feature-flags/:id", description: "Archive feature flag" },
      { method: "GET", path: "/v1/experiments", description: "List experiments" },
      { method: "POST", path: "/v1/experiments", description: "Create experiment" },
      { method: "PATCH", path: "/v1/experiments/:id", description: "Start/stop experiment" },
    ],
  },
  {
    name: "Audit Logs",
    icon: "🔒",
    description: "Complete audit trail for all system actions",
    endpoints: [
      { method: "GET", path: "/v1/audit-logs", description: "List audit logs", params: [
        { name: "entity_type", type: "string", description: "Filter by entity type" },
        { name: "action", type: "string", description: "Filter by action" },
        { name: "actor_id", type: "uuid", description: "Filter by actor" },
        { name: "from", type: "date", description: "From date" },
        { name: "to", type: "date", description: "To date" },
      ] },
      { method: "GET", path: "/v1/audit-logs/:id", description: "Get full audit detail with before/after state" },
    ],
  },
  {
    name: "Incidents",
    icon: "🚨",
    description: "Incident management and postmortem tracking",
    endpoints: [
      { method: "GET", path: "/v1/incidents", description: "List incidents", params: [
        { name: "status", type: "string", description: "Filter by status" },
        { name: "severity", type: "string", description: "Filter by severity" },
      ] },
      { method: "GET", path: "/v1/incidents/:id", description: "Get incident with updates" },
      { method: "POST", path: "/v1/incidents", description: "Create incident" },
      { method: "POST", path: "/v1/incidents/:id/updates", description: "Post incident update" },
      { method: "PATCH", path: "/v1/incidents/:id", description: "Update/resolve incident" },
    ],
  },
  {
    name: "Workspace",
    icon: "🏢",
    description: "Workspace settings, invitations, and admin onboarding",
    endpoints: [
      { method: "GET", path: "/v1/workspace/invitations", description: "List workspace invitations" },
      { method: "POST", path: "/v1/workspace/invitations", description: "Send workspace invitation" },
      { method: "DELETE", path: "/v1/workspace/invitations/:id", description: "Revoke invitation" },
      { method: "GET", path: "/v1/workspace/onboarding-profiles", description: "List admin onboarding profiles" },
    ],
  },
  {
    name: "Site Visits",
    icon: "🌐",
    description: "Website visitor tracking",
    endpoints: [
      { method: "GET", path: "/v1/site-visits", description: "List site visits", params: [
        { name: "page_path", type: "string", description: "Filter by page path" },
        { name: "from", type: "date", description: "From date" },
        { name: "to", type: "date", description: "To date" },
      ] },
      { method: "GET", path: "/v1/site-visits/stats", description: "Get aggregated visit statistics" },
    ],
  },
  {
    name: "Profile Lookups",
    icon: "🔎",
    description: "Profile lookup history and snapshots",
    endpoints: [
      { method: "GET", path: "/v1/profile-lookups", description: "List lookup history", params: [{ name: "username", type: "string", description: "Filter by username" }] },
      { method: "POST", path: "/v1/profile-lookups", description: "Trigger new profile lookup" },
    ],
  },
  {
    name: "Device Sessions",
    icon: "📱",
    description: "User device sessions and security",
    endpoints: [
      { method: "GET", path: "/v1/device-sessions", description: "List device sessions", params: [{ name: "user_id", type: "uuid", description: "Filter by user" }] },
      { method: "DELETE", path: "/v1/device-sessions/:id", description: "Revoke a device session" },
    ],
  },
  {
    name: "Login Activity",
    icon: "🔐",
    description: "User login history and audit",
    endpoints: [
      { method: "GET", path: "/v1/login-activity", description: "List login activity", params: [{ name: "user_id", type: "uuid", description: "Filter by user" }] },
    ],
  },
  {
    name: "Admin Sessions & Logins",
    icon: "🛡️",
    description: "Admin sessions, login auditing, and user actions",
    endpoints: [
      { method: "GET", path: "/v1/admin-logins", description: "List admin login attempts", params: [{ name: "success", type: "boolean", description: "Filter by success" }] },
      { method: "GET", path: "/v1/admin-sessions", description: "List active admin sessions" },
      { method: "DELETE", path: "/v1/admin-sessions/:id", description: "Terminate admin session" },
      { method: "GET", path: "/v1/admin-actions", description: "List admin user actions", params: [
        { name: "action_type", type: "string", description: "Filter by action type" },
        { name: "target_user_id", type: "uuid", description: "Filter by target user" },
      ] },
    ],
  },
  {
    name: "Notifications",
    icon: "🔔",
    description: "User and admin notifications",
    endpoints: [
      { method: "GET", path: "/v1/notifications", description: "List notifications", params: [
        { name: "user_id", type: "uuid", description: "Filter by user" },
        { name: "is_read", type: "boolean", description: "Filter read/unread" },
        { name: "notification_type", type: "string", description: "Filter by type" },
      ] },
      { method: "PATCH", path: "/v1/notifications/:id", description: "Mark as read" },
      { method: "POST", path: "/v1/notifications", description: "Send notification to user" },
      { method: "POST", path: "/v1/notifications/bulk", description: "Send bulk notifications" },
    ],
  },
  {
    name: "Activities",
    icon: "📋",
    description: "Account activity log (standalone)",
    endpoints: [
      { method: "GET", path: "/v1/activities", description: "List all activities", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "activity_type", type: "string", description: "Filter by type" },
      ] },
      { method: "POST", path: "/v1/activities", description: "Log an activity" },
    ],
  },
  {
    name: "Support Tickets",
    icon: "🎫",
    description: "CRM help desk and support ticket management",
    endpoints: [
      { method: "GET", path: "/v1/support-tickets", description: "List support tickets", params: [
        { name: "status", type: "string", description: "Filter by status (open, in_progress, resolved)" },
        { name: "priority", type: "string", description: "Filter by priority" },
      ] },
      { method: "GET", path: "/v1/support-tickets/:id", description: "Get ticket details" },
      { method: "POST", path: "/v1/support-tickets", description: "Create support ticket" },
      { method: "PATCH", path: "/v1/support-tickets/:id", description: "Update ticket status" },
    ],
  },
  {
    name: "Stats",
    icon: "📈",
    description: "System-wide statistics overview across all tables",
    endpoints: [
      { method: "GET", path: "/v1/stats", description: "Get aggregated counts for all major tables" },
      { method: "GET", path: "/v1/stats/credits", description: "Get credit circulation statistics" },
      { method: "GET", path: "/v1/stats/revenue", description: "Get revenue summary" },
      { method: "GET", path: "/v1/stats/ai-usage", description: "Get AI usage breakdown" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  POST: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  PATCH: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  DELETE: "bg-red-500/15 text-red-300 border-red-500/20",
};

const AdminAPI = () => {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Accounts"]));

  const filteredGroups = useMemo(() => {
    if (!search) return API_GROUPS;
    const q = search.toLowerCase();
    return API_GROUPS.map(g => ({
      ...g,
      endpoints: g.endpoints.filter(e =>
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q)
      ),
    })).filter(g => g.endpoints.length > 0);
  }, [search]);

  const totalEndpoints = API_GROUPS.reduce((s, g) => s + g.endpoints.length, 0);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(""), 2000);
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const testHealthEndpoint = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${BASE_URL}/health`);
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
      toast.success("API is operational!");
    } catch (e) {
      setTestResult(JSON.stringify({ error: "Failed to reach API" }, null, 2));
      toast.error("API test failed");
    }
    setTesting(false);
  };

  const testAuthEndpoint = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not logged in"); setTesting(false); return; }
      const res = await fetch(`${BASE_URL}/v1/stats`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
      if (res.ok) toast.success("Authenticated request successful!");
      else toast.error(`Error ${res.status}`);
    } catch (e) {
      setTestResult(JSON.stringify({ error: "Request failed" }, null, 2));
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-accent" /> API Management
          </h1>
          <p className="text-xs text-white/40 mt-1">
            Full REST API — {totalEndpoints} endpoints across {API_GROUPS.length} resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-xs">
            <Server className="h-3 w-3 mr-1" /> v1.0.0
          </Badge>
          <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-xs">
            <Shield className="h-3 w-3 mr-1" /> Admin Only
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="docs" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="docs" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Documentation
          </TabsTrigger>
          <TabsTrigger value="playground" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Terminal className="h-3.5 w-3.5" /> Playground
          </TabsTrigger>
          <TabsTrigger value="quickstart" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Quick Start
          </TabsTrigger>
        </TabsList>

        {/* ── DOCS TAB ── */}
        <TabsContent value="docs" className="space-y-4">
          {/* Auth info */}
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lock className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-white/60 space-y-1">
                  <p className="font-semibold text-white/80">Authentication Required</p>
                  <p>All endpoints (except /health) require a valid admin JWT in the Authorization header.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="bg-white/5 px-2 py-1 rounded text-[11px] text-accent font-mono">
                      Authorization: Bearer {"<your-jwt-token>"}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-white/30 hover:text-white"
                      onClick={() => copyToClipboard('Authorization: Bearer <your-jwt-token>', 'auth-header')}
                    >
                      {copied === "auth-header" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Base URL */}
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-white/60">Base URL</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white/5 px-3 py-1.5 rounded text-xs text-emerald-300 font-mono">{BASE_URL}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-white/30 hover:text-white"
                    onClick={() => copyToClipboard(BASE_URL, 'base-url')}
                  >
                    {copied === "base-url" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search endpoints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
            />
          </div>

          {/* Endpoint groups */}
          <ScrollArea className="h-[calc(100vh-500px)] min-h-[400px]">
            <div className="space-y-3 pr-3">
              {filteredGroups.map((group) => (
                <Collapsible
                  key={group.name}
                  open={expandedGroups.has(group.name)}
                  onOpenChange={() => toggleGroup(group.name)}
                >
                  <Card className="bg-white/[0.02] border-white/[0.06] overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{group.icon}</span>
                          <span className="text-sm font-semibold text-white">{group.name}</span>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">
                            {group.endpoints.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/30 hidden sm:inline">{group.description}</span>
                          {expandedGroups.has(group.name) ? (
                            <ChevronDown className="h-4 w-4 text-white/30" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white/30" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
                        {group.endpoints.map((ep, i) => (
                          <div key={i} className="p-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${METHOD_COLORS[ep.method]} text-[10px] font-mono px-2 py-0.5 border`}>
                                {ep.method}
                              </Badge>
                              <code className="text-xs text-white/70 font-mono">{ep.path}</code>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-white/20 hover:text-white ml-auto"
                                onClick={() => copyToClipboard(`curl -X ${ep.method} "${BASE_URL}${ep.path}" -H "Authorization: Bearer <token>" -H "Content-Type: application/json"`, `ep-${i}`)}
                              >
                                {copied === `ep-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                            <p className="text-[11px] text-white/40">{ep.description}</p>
                            {ep.params && ep.params.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Query Parameters</span>
                                {ep.params.map((p, pi) => (
                                  <div key={pi} className="flex items-start gap-2 text-[11px]">
                                    <code className="text-purple-300 font-mono bg-white/5 px-1 rounded">{p.name}</code>
                                    <span className="text-white/25">{p.type}</span>
                                    {p.required && <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge>}
                                    <span className="text-white/40">{p.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {ep.body && ep.body.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Request Body</span>
                                {ep.body.map((b, bi) => (
                                  <div key={bi} className="flex items-start gap-2 text-[11px]">
                                    <code className="text-blue-300 font-mono bg-white/5 px-1 rounded">{b.name}</code>
                                    <span className="text-white/25">{b.type}</span>
                                    {b.required && <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge>}
                                    <span className="text-white/40">{b.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {ep.example_response && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Example Response</span>
                                <pre className="bg-black/30 rounded-lg p-2 text-[10px] text-emerald-300/80 font-mono overflow-x-auto">{ep.example_response}</pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── PLAYGROUND TAB ── */}
        <TabsContent value="playground" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-400" /> Health Check
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-white/40 mb-3">Test API connectivity (no auth required)</p>
                <Button onClick={testHealthEndpoint} disabled={testing} size="sm" className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 text-xs">
                  <Zap className="h-3 w-3 mr-1" /> Test Health
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" /> Authenticated Test
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-white/40 mb-3">Test with your current admin session (GET /v1/stats)</p>
                <Button onClick={testAuthEndpoint} disabled={testing} size="sm" className="bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 text-xs">
                  <Lock className="h-3 w-3 mr-1" /> Test Auth Request
                </Button>
              </CardContent>
            </Card>
          </div>

          {testResult && (
            <Card className="bg-black/30 border-white/[0.06]">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs text-white/60">Response</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-white/30 hover:text-white"
                    onClick={() => copyToClipboard(testResult, 'result')}
                  >
                    {copied === "result" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <pre className="text-[11px] text-emerald-300/80 font-mono overflow-x-auto whitespace-pre-wrap">{testResult}</pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── QUICKSTART TAB ── */}
        <TabsContent value="quickstart" className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">1. Get Your Auth Token</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <p className="text-[11px] text-white/50">Sign in to get a JWT token for API authentication:</p>
              <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-blue-300/80 font-mono overflow-x-auto">{`// JavaScript
const { data } = await supabase.auth.signInWithPassword({
  email: "admin@ozcagency.com",
  password: "your-password"
});
const token = data.session.access_token;`}</pre>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">2. Make API Calls</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div>
                <p className="text-[11px] text-white/50 mb-2">cURL example — List all accounts:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-amber-300/80 font-mono overflow-x-auto">{`curl -X GET "${BASE_URL}/v1/accounts?status=active&limit=10" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json"`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">Create an account:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-amber-300/80 font-mono overflow-x-auto">{`curl -X POST "${BASE_URL}/v1/accounts" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "new_model", "display_name": "New Model", "tier": "pro"}'`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">JavaScript / Fetch:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-emerald-300/80 font-mono overflow-x-auto">{`const res = await fetch("${BASE_URL}/v1/stats", {
  headers: {
    "Authorization": \`Bearer \${token}\`,
    "Content-Type": "application/json"
  }
});
const { data } = await res.json();
console.log(data);`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">Python example:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-purple-300/80 font-mono overflow-x-auto">{`import requests

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Get all active accounts
resp = requests.get(
    "${BASE_URL}/v1/accounts",
    headers=headers,
    params={"status": "active", "limit": 25}
)
accounts = resp.json()["data"]

# Batch update — loop with care
for acc in accounts:
    requests.patch(
        f"${BASE_URL}/v1/accounts/{acc['id']}",
        headers=headers,
        json={"notes": "Reviewed via API"}
    )`}</pre>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">3. Error Handling</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px] w-14 justify-center">200</Badge>
                  <span className="text-white/50">Success — data returned in response body</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-[10px] w-14 justify-center">201</Badge>
                  <span className="text-white/50">Created — resource successfully created</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[10px] w-14 justify-center">401</Badge>
                  <span className="text-white/50">Unauthorized — invalid or missing admin token</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[10px] w-14 justify-center">404</Badge>
                  <span className="text-white/50">Not found — resource or endpoint doesn't exist</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[10px] w-14 justify-center">500</Badge>
                  <span className="text-white/50">Server error — check request body and retry</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/15">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-[11px] text-white/60 space-y-1">
                  <p className="font-semibold text-amber-300">Security Notes</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>API is restricted to admin accounts only</li>
                    <li>Non-admin tokens are rejected with 401</li>
                    <li>All requests are logged and auditable</li>
                    <li>Never share your JWT token publicly</li>
                    <li>Tokens expire — refresh via auth session</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAPI;
