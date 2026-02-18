import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Code2, Copy, Check, Search, Globe, Lock, Zap, Database, ChevronDown, ChevronRight,
  Server, Shield, BookOpen, Terminal, Send, Loader2, Play, Key, Plus, Trash2,
  RefreshCw, Eye, EyeOff, Clock, AlertTriangle, Unlock,
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
}

interface EndpointGroup {
  name: string;
  description: string;
  endpoints: Endpoint[];
}

// User-level endpoint groups only (admin endpoints moved to AdminAPIManagement)
const API_GROUPS: EndpointGroup[] = [
  {
    name: "Accounts",
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
    description: "Direct access to post comments",
    endpoints: [
      { method: "GET", path: "/v1/post-comments", description: "List all comments", params: [{ name: "post_id", type: "uuid", description: "Filter by post" }] },
      { method: "POST", path: "/v1/post-comments", description: "Create comment" },
      { method: "DELETE", path: "/v1/post-comments/:id", description: "Delete comment" },
    ],
  },
  {
    name: "Follows & Requests",
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
    description: "XP, tiers, and gamification ranks",
    endpoints: [
      { method: "GET", path: "/v1/ranks", description: "List all user ranks", params: [{ name: "rank_tier", type: "string", description: "Filter by tier" }] },
      { method: "GET", path: "/v1/ranks/:user_id", description: "Get rank for user" },
      { method: "PATCH", path: "/v1/ranks/:user_id", description: "Update XP or rank data" },
    ],
  },
  {
    name: "Personas",
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
    name: "Workflows & Automation",
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
    description: "Platform user profiles and preferences",
    endpoints: [
      { method: "GET", path: "/v1/profiles", description: "List profiles", params: [{ name: "search", type: "string", description: "Search by username, name, email" }] },
      { method: "GET", path: "/v1/profiles/:user_id", description: "Get profile by user ID" },
      { method: "PATCH", path: "/v1/profiles/:user_id", description: "Update user profile" },
    ],
  },
  {
    name: "Activities",
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
    name: "Profile Lookups",
    description: "Profile lookup history and snapshots",
    endpoints: [
      { method: "GET", path: "/v1/profile-lookups", description: "List lookup history", params: [{ name: "username", type: "string", description: "Filter by username" }] },
      { method: "POST", path: "/v1/profile-lookups", description: "Trigger new profile lookup" },
    ],
  },
  {
    name: "My API Keys",
    description: "Manage your personal API keys for platform access",
    endpoints: [
      { method: "GET", path: "/v1/my/api-keys", description: "List your API keys" },
      { method: "POST", path: "/v1/my/api-keys", description: "Create a new API key", body: [
        { name: "name", type: "string", required: true, description: "Key name (e.g. 'Production', 'Development')" },
        { name: "scopes", type: "string[]", description: "Permissions: read, write, delete (default: read)" },
        { name: "rate_limit_rpm", type: "number", description: "Requests per minute limit (default: 60)" },
        { name: "expires_in_days", type: "number", description: "Expiration in days (optional, never expires if omitted)" },
      ] },
      { method: "PATCH", path: "/v1/my/api-keys/:id", description: "Update key name or rate limits" },
      { method: "DELETE", path: "/v1/my/api-keys/:id", description: "Revoke an API key permanently" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  POST: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  PATCH: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  DELETE: "bg-red-500/15 text-red-300 border-red-500/20",
};

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  rate_limit_rpm: number;
  rate_limit_daily: number;
  last_used_at: string | null;
  requests_today: number;
  requests_total: number;
  expires_at: string | null;
  created_at: string;
}

const AdminAPI = () => {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Accounts"]));

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [newKeyType, setNewKeyType] = useState<"secret" | "publishable">("secret");
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [creating, setCreating] = useState(false);

  // Playground state
  const [pgSearch, setPgSearch] = useState("");
  const [pgSelectedEndpoint, setPgSelectedEndpoint] = useState<(Endpoint & { group: string }) | null>(null);
  const [pgExpandedGroups, setPgExpandedGroups] = useState<Set<string>>(new Set());
  const [pgFieldValues, setPgFieldValues] = useState<Record<string, string>>({});
  const [pgBodyValues, setPgBodyValues] = useState<Record<string, string>>({});
  const [pgResponse, setPgResponse] = useState<string | null>(null);
  const [pgLoading, setPgLoading] = useState(false);
  const [pgStatusCode, setPgStatusCode] = useState<number | null>(null);
  const [pgLatency, setPgLatency] = useState<number | null>(null);
  const [pgApiKey, setPgApiKey] = useState("");

  const totalEndpoints = API_GROUPS.reduce((s, g) => s + g.endpoints.length, 0);

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

  const pgFilteredGroups = useMemo(() => {
    if (!pgSearch) return API_GROUPS;
    const q = pgSearch.toLowerCase();
    return API_GROUPS.map(g => ({
      ...g,
      endpoints: g.endpoints.filter(e =>
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q)
      ),
    })).filter(g => g.endpoints.length > 0);
  }, [pgSearch]);

  const loadApiKeys = async () => {
    setKeysLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("id,name,key_prefix,scopes,is_active,rate_limit_rpm,rate_limit_daily,last_used_at,requests_today,requests_total,expires_at,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load API keys");
    else setApiKeys((data || []) as ApiKeyRow[]);
    setKeysLoading(false);
  };

  useEffect(() => { loadApiKeys(); }, []);

  const generateApiKey = (type: "secret" | "publishable" = "secret") => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const prefix = type === "publishable" ? "ozc_pk_live_" : "ozc_sk_live_";
    let key = prefix;
    for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const hashKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) { toast.error("Key name is required"); return; }
    setCreating(true);
    try {
      const rawKey = generateApiKey(newKeyType);
      const keyHash = await hashKey(rawKey);
      const prefix = rawKey.substring(0, 16);
      const scopes = newKeyType === "publishable" ? ["read"] : (newKeyScopes.length > 0 ? newKeyScopes : ["read"]);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not authenticated"); setCreating(false); return; }

      const insertData: any = {
        user_id: user.id,
        name: newKeyName.trim(),
        key_prefix: prefix,
        key_hash: keyHash,
        scopes,
        rate_limit_rpm: newKeyType === "publishable" ? 120 : 60,
        rate_limit_daily: newKeyType === "publishable" ? 50000 : 10000,
        metadata: { key_type: newKeyType },
      };

      if (newKeyExpiry) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(newKeyExpiry));
        insertData.expires_at = expiresAt.toISOString();
      }

      const { error } = await supabase.from("api_keys").insert(insertData);
      if (error) throw error;

      setCreatedKey(rawKey);
      setShowKey(true);
      toast.success("API key created — copy it now, it won't be shown again!");
      loadApiKeys();
    } catch (e: any) {
      toast.error(e.message || "Failed to create key");
    }
    setCreating(false);
  };

  const revokeKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) toast.error("Failed to revoke key");
    else { toast.success("API key revoked & deleted"); loadApiKeys(); }
  };

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

  const togglePgGroup = (name: string) => {
    setPgExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const selectEndpoint = (ep: Endpoint, group: string) => {
    setPgSelectedEndpoint({ ...ep, group });
    setPgFieldValues({});
    setPgBodyValues({});
    setPgResponse(null);
    setPgStatusCode(null);
    setPgLatency(null);
  };

  const sendPlaygroundRequest = async () => {
    if (!pgSelectedEndpoint) return;

    // Validate API key
    if (!pgApiKey.trim()) {
      toast.error("API key is required. Enter your secret key (ozc_sk_live_...) to authenticate.");
      return;
    }
    if (!pgApiKey.startsWith("ozc_sk_live_") && !pgApiKey.startsWith("ozc_pk_live_") && !pgApiKey.startsWith("ozcpk_live_")) {
      toast.error("Invalid API key format. Keys must start with ozc_sk_live_ or ozc_pk_live_");
      return;
    }

    // Publishable keys can only do GET
    if (pgApiKey.startsWith("ozc_pk_live_") && pgSelectedEndpoint.method !== "GET") {
      toast.error("Publishable keys (pk) can only perform GET requests. Use a secret key (sk) for write operations.");
      return;
    }

    setPgLoading(true);
    setPgResponse(null);
    setPgStatusCode(null);
    setPgLatency(null);

    try {
      let path = pgSelectedEndpoint.path;
      const pathParamRegex = /:([a-zA-Z_]+)/g;
      let match;
      while ((match = pathParamRegex.exec(pgSelectedEndpoint.path)) !== null) {
        const paramName = match[1];
        const val = pgFieldValues[paramName] || pgBodyValues[paramName];
        if (val) path = path.replace(`:${paramName}`, val);
      }

      const queryParts: string[] = [];
      if (pgSelectedEndpoint.params) {
        for (const p of pgSelectedEndpoint.params) {
          const val = pgFieldValues[p.name];
          if (val) queryParts.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(val)}`);
        }
      }
      const queryStr = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      let bodyObj: any = undefined;
      if (["POST", "PATCH"].includes(pgSelectedEndpoint.method) && pgSelectedEndpoint.body) {
        bodyObj = {};
        for (const b of pgSelectedEndpoint.body) {
          const val = pgBodyValues[b.name];
          if (val !== undefined && val !== "") {
            try { bodyObj[b.name] = JSON.parse(val); } catch { bodyObj[b.name] = val; }
          }
        }
      }

      const startTime = Date.now();
      const res = await fetch(`${BASE_URL}${path}${queryStr}`, {
        method: pgSelectedEndpoint.method,
        headers: {
          "X-API-Key": pgApiKey.trim(),
          "Content-Type": "application/json",
        },
        ...(bodyObj && Object.keys(bodyObj).length > 0 ? { body: JSON.stringify(bodyObj) } : {}),
      });
      const latency = Date.now() - startTime;
      const data = await res.json();
      setPgStatusCode(res.status);
      setPgLatency(latency);
      setPgResponse(JSON.stringify(data, null, 2));
      if (res.ok) toast.success(`${res.status} OK — ${latency}ms`);
      else toast.error(`${res.status} Error`);
    } catch (e: any) {
      setPgResponse(JSON.stringify({ error: e.message }, null, 2));
      toast.error("Request failed");
    }
    setPgLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-accent" /> Platform API
          </h1>
          <p className="text-xs text-white/40 mt-1">
            REST API — {totalEndpoints} endpoints across {API_GROUPS.length} resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-xs">
            <Server className="h-3 w-3 mr-1" /> v1.0.0
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="keys" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5" /> My API Keys
          </TabsTrigger>
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

        {/* ── API KEYS TAB ── */}
        <TabsContent value="keys" className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Key className="h-4 w-4 text-accent" /> Your API Keys
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={loadApiKeys} disabled={keysLoading} className="h-7 text-xs border-white/10 text-white/60 hover:text-white gap-1.5">
                    <RefreshCw className={`h-3 w-3 ${keysLoading ? "animate-spin" : ""}`} /> Refresh
                  </Button>
                  <Button size="sm" onClick={() => { setShowCreateKey(true); setCreatedKey(null); setNewKeyName(""); setNewKeyScopes(["read"]); setNewKeyExpiry(""); setNewKeyType("secret"); setScopeDropdownOpen(false); }} className="h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                    <Plus className="h-3 w-3" /> Create Key
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <Key className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No API keys yet</p>
                  <p className="text-xs text-white/20 mt-1">Create your first key to start using the API</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${key.is_active ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                          {key.key_prefix.includes("pk") ? <Unlock className="h-3.5 w-3.5 text-blue-400" /> : <Lock className="h-3.5 w-3.5 text-amber-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{key.name}</span>
                            <code className="text-[10px] text-white/30 font-mono bg-white/5 px-1.5 rounded">{key.key_prefix}•••</code>
                            <Badge className={`text-[9px] ${key.key_prefix.includes("pk") ? "bg-blue-500/10 text-blue-300 border-blue-500/20" : "bg-amber-500/10 text-amber-300 border-amber-500/20"} border`}>
                              {key.key_prefix.includes("pk") ? "Publishable" : "Secret"}
                            </Badge>
                            <Badge className={`text-[9px] ${key.is_active ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-red-500/10 text-red-300 border-red-500/20"} border`}>
                              {key.is_active ? "Active" : "Revoked"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-white/25">Scopes: {key.scopes.join(", ") || "none"}</span>
                            <span className="text-[10px] text-white/25">{key.rate_limit_rpm} RPM</span>
                            <span className="text-[10px] text-white/25">{Number(key.requests_total).toLocaleString()} requests</span>
                            {key.expires_at && (
                              <span className="text-[10px] text-amber-400/60 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> Expires {new Date(key.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {key.is_active && (
                        <Button size="sm" variant="ghost" onClick={() => revokeKey(key.id)} className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1">
                          <Trash2 className="h-3 w-3" /> Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>


          {/* Create Key Dialog */}
          <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
            <DialogContent className="bg-[hsl(220,100%,8%)] border-white/10 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-accent" />
                  {createdKey ? "API Key Created" : "Create API Key"}
                </DialogTitle>
              </DialogHeader>
              {createdKey ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-300">Copy this key now — it will never be shown again.</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      value={showKey ? createdKey : "•".repeat(51)}
                      readOnly
                      className="bg-white/5 border-white/10 text-white font-mono text-xs pr-20"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowKey(!showKey)}>
                        {showKey ? <EyeOff className="h-3 w-3 text-white/40" /> : <Eye className="h-3 w-3 text-white/40" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(createdKey, "new-key")}>
                        {copied === "new-key" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-white/40" />}
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setShowCreateKey(false)} className="bg-accent hover:bg-accent/90 text-accent-foreground">Done</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Key Type Selection */}
                  <div>
                    <label className="text-xs text-white/60 mb-1.5 block">Key Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewKeyType("secret")}
                        className={`p-3 rounded-lg border text-left transition-all ${newKeyType === "secret" ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Lock className={`h-3.5 w-3.5 ${newKeyType === "secret" ? "text-amber-400" : "text-white/30"}`} />
                          <span className={`text-xs font-semibold ${newKeyType === "secret" ? "text-amber-300" : "text-white/50"}`}>Secret</span>
                        </div>
                        <p className="text-[10px] text-white/30">Full access — server-side only</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNewKeyType("publishable"); setNewKeyScopes(["read"]); }}
                        className={`p-3 rounded-lg border text-left transition-all ${newKeyType === "publishable" ? "border-blue-500/40 bg-blue-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Unlock className={`h-3.5 w-3.5 ${newKeyType === "publishable" ? "text-blue-400" : "text-white/30"}`} />
                          <span className={`text-xs font-semibold ${newKeyType === "publishable" ? "text-blue-300" : "text-white/50"}`}>Publishable</span>
                        </div>
                        <p className="text-[10px] text-white/30">Read-only — safe for clients</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Key Name</label>
                    <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. Production, Development, Mobile App" className="bg-white/5 border-white/10 text-white text-sm" />
                  </div>

                  {newKeyType === "secret" && (
                    <div>
                      <label className="text-xs text-white/60 mb-1.5 block">Scopes</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
                          className="flex items-center justify-between w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white h-10"
                        >
                          <span className="truncate text-white/70">
                            {newKeyScopes.length === 4 ? "All Permissions" : newKeyScopes.length === 0 ? "Select scopes..." : newKeyScopes.join(", ")}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                        </button>
                        {scopeDropdownOpen && (
                          <div className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-[hsl(220,100%,8%)] shadow-lg">
                            {[
                              { value: "all", label: "All Permissions", desc: "Full access — read, write, delete, admin" },
                              { value: "read", label: "Read", desc: "GET requests — view data" },
                              { value: "write", label: "Write", desc: "POST/PATCH requests — create & update" },
                              { value: "delete", label: "Delete", desc: "DELETE requests — remove data" },
                              { value: "admin", label: "Admin", desc: "Admin-level operations" },
                            ].map((scope) => {
                              const isAll = scope.value === "all";
                              const isAllSelected = newKeyScopes.length === 4;
                              const isChecked = isAll ? isAllSelected : newKeyScopes.includes(scope.value);
                              return (
                                <button
                                  key={scope.value}
                                  type="button"
                                  onClick={() => {
                                    if (isAll) {
                                      setNewKeyScopes(isAllSelected ? [] : ["read", "write", "delete", "admin"]);
                                    } else {
                                      setNewKeyScopes(prev =>
                                        prev.includes(scope.value) ? prev.filter(s => s !== scope.value) : [...prev, scope.value]
                                      );
                                    }
                                  }}
                                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                                >
                                  <div className={`mt-0.5 h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center ${isChecked ? "bg-accent border-accent" : "border-white/20"}`}>
                                    {isChecked && <Check className="h-3 w-3 text-accent-foreground" />}
                                  </div>
                                  <div>
                                    <span className="text-sm text-white font-medium">{scope.label}</span>
                                    <p className="text-[10px] text-white/40 mt-0.5">{scope.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                            <div className="border-t border-white/10 p-2">
                              <Button size="sm" onClick={() => setScopeDropdownOpen(false)} className="w-full h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground">
                                Done
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-white/30 mt-1">Select which operations this key can perform</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Expires in (days, leave empty for never)</label>
                    <Input value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)} type="number" placeholder="30" className="bg-white/5 border-white/10 text-white text-sm" />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setShowCreateKey(false)} className="text-white/60">Cancel</Button>
                    <Button onClick={createApiKey} disabled={creating} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                      {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Create {newKeyType === "publishable" ? "Publishable" : "Secret"} Key
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── DOCS TAB ── */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Key className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-xs text-white/60 space-y-1">
                  <p className="font-semibold text-white/80">API Key Authentication</p>
                  <p>All endpoints require a valid API key. Include it in every request header:</p>
                  <div className="space-y-2 mt-2">
                    <div>
                      <span className="text-[10px] text-amber-300 uppercase tracking-wider font-semibold">Secret Key (server-side)</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-white/5 px-2 py-1 rounded text-[11px] text-amber-300 font-mono">
                          X-API-Key: ozc_sk_live_••••••••••••••••
                        </code>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30 hover:text-white"
                          onClick={() => copyToClipboard('X-API-Key: ozc_sk_live_YOUR_SECRET_KEY', 'auth-sk')}>
                          {copied === "auth-sk" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold">Publishable Key (client-side, read-only)</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-white/5 px-2 py-1 rounded text-[11px] text-blue-300 font-mono">
                          X-API-Key: ozc_pk_live_••••••••••••••••
                        </code>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30 hover:text-white"
                          onClick={() => copyToClipboard('X-API-Key: ozc_pk_live_YOUR_PUBLISHABLE_KEY', 'auth-pk')}>
                          {copied === "auth-pk" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-white/60">Base URL</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white/5 px-3 py-1.5 rounded text-xs text-emerald-300 font-mono">{BASE_URL}</code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white"
                    onClick={() => copyToClipboard(BASE_URL, 'base-url')}>
                    {copied === "base-url" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder={`Search ${totalEndpoints} endpoints...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-500px)] min-h-[400px]">
            <div className="space-y-3 pr-3">
              {filteredGroups.map((group) => (
                <Collapsible key={group.name} open={expandedGroups.has(group.name)} onOpenChange={() => toggleGroup(group.name)}>
                  <Card className="bg-white/[0.02] border-white/[0.06] overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-semibold text-white">{group.name}</span>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{group.endpoints.length}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/30 hidden sm:inline">{group.description}</span>
                          {expandedGroups.has(group.name) ? <ChevronDown className="h-4 w-4 text-white/30" /> : <ChevronRight className="h-4 w-4 text-white/30" />}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
                        {group.endpoints.map((ep, i) => (
                          <div key={i} className="p-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${METHOD_COLORS[ep.method]} text-[10px] font-mono px-2 py-0.5 border`}>{ep.method}</Badge>
                              <code className="text-xs text-white/70 font-mono">{ep.path}</code>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/20 hover:text-white ml-auto"
                                onClick={() => copyToClipboard(`curl -X ${ep.method} "${BASE_URL}${ep.path}" -H "X-API-Key: ozc_sk_live_YOUR_KEY" -H "Content-Type: application/json"`, `ep-${group.name}-${i}`)}>
                                {copied === `ep-${group.name}-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
        <TabsContent value="playground" className="space-y-0">
          <div className="flex h-[calc(100vh-300px)] min-h-[500px] border border-white/[0.06] rounded-xl overflow-hidden bg-black/20">
            <div className="w-[320px] border-r border-white/[0.06] flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-white/[0.06]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <Input placeholder={`Search ${totalEndpoints} endpoints...`} value={pgSearch} onChange={(e) => setPgSearch(e.target.value)}
                    className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-8 text-xs" />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="py-1">
                  {pgFilteredGroups.map((group) => (
                    <Collapsible key={group.name} open={pgExpandedGroups.has(group.name)} onOpenChange={() => togglePgGroup(group.name)}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors text-left">
                          <span className="text-xs font-semibold text-white/70">{group.name}</span>
                          {pgExpandedGroups.has(group.name) ? <ChevronDown className="h-3 w-3 text-white/30" /> : <ChevronRight className="h-3 w-3 text-white/30" />}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {group.endpoints.map((ep, i) => {
                          const isSelected = pgSelectedEndpoint?.path === ep.path && pgSelectedEndpoint?.method === ep.method;
                          return (
                            <button key={i} onClick={() => selectEndpoint(ep, group.name)}
                              className={`w-full text-left px-3 py-2 transition-colors border-l-2 ${isSelected ? "bg-white/[0.05] border-l-accent" : "border-l-transparent hover:bg-white/[0.02]"}`}>
                              <div className="flex items-center gap-2">
                                <Badge className={`${METHOD_COLORS[ep.method]} text-[9px] font-mono px-1.5 py-0 border`}>{ep.method}</Badge>
                                <span className="text-[11px] text-white/50 truncate">{ep.description}</span>
                              </div>
                              <code className="text-[10px] text-white/30 font-mono mt-0.5 block truncate">{ep.path}</code>
                            </button>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.06]">
              <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">Configure Request</span>
                <Button size="sm" onClick={sendPlaygroundRequest} disabled={pgLoading || !pgSelectedEndpoint}
                  className="h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                  {pgLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Send
                </Button>
              </div>
              <ScrollArea className="flex-1">
                {pgSelectedEndpoint ? (
                  <div className="p-4 space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{pgSelectedEndpoint.description}</span>
                        <Badge className={`${METHOD_COLORS[pgSelectedEndpoint.method]} text-[10px] font-mono px-2 py-0.5 border`}>{pgSelectedEndpoint.method}</Badge>
                      </div>
                      <code className="text-[11px] text-white/40 font-mono">{pgSelectedEndpoint.path}</code>
                    </div>

                    {/* API Key Field — Always first */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <Key className="h-3 w-3 text-accent" /> Authentication
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-[11px] text-accent font-mono">X-API-Key</code>
                          <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge>
                          {pgApiKey && (
                            <Badge className={`text-[9px] border ${pgApiKey.includes("sk_live") ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : pgApiKey.includes("pk_live") ? "bg-blue-500/10 text-blue-300 border-blue-500/20" : "bg-white/5 text-white/30 border-white/10"}`}>
                              {pgApiKey.includes("sk_live") ? "Secret" : pgApiKey.includes("pk_live") ? "Publishable" : "Unknown"}
                            </Badge>
                          )}
                        </div>
                        <Input
                          value={pgApiKey}
                          onChange={(e) => setPgApiKey(e.target.value)}
                          type="password"
                          placeholder="ozc_sk_live_... or ozc_pk_live_..."
                          className="bg-white/5 border-white/10 text-white h-8 text-xs font-mono"
                        />
                        <p className="text-[9px] text-white/20 mt-1">Paste your secret or publishable key. Publishable keys are read-only (GET only).</p>
                      </div>
                    </div>

                    {(() => {
                      const pathParams = pgSelectedEndpoint.path.match(/:([a-zA-Z_]+)/g);
                      if (!pathParams) return null;
                      return (
                        <div className="space-y-2">
                          <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Path Parameters</span>
                          {pathParams.map(param => {
                            const name = param.slice(1);
                            return (
                              <div key={name}>
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-[11px] text-purple-300 font-mono">{name}</code>
                                  <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge>
                                </div>
                                <Input value={pgFieldValues[name] || ""} onChange={(e) => setPgFieldValues(p => ({ ...p, [name]: e.target.value }))}
                                  placeholder={name} className="bg-white/5 border-white/10 text-white h-8 text-xs font-mono" />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {pgSelectedEndpoint.params && pgSelectedEndpoint.params.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Query Parameters</span>
                        {pgSelectedEndpoint.params.map((p) => (
                          <div key={p.name}>
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-[11px] text-purple-300 font-mono">{p.name}</code>
                              {p.required ? <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge> : <span className="text-[9px] text-white/30 italic">optional</span>}
                            </div>
                            <Input value={pgFieldValues[p.name] || ""} onChange={(e) => setPgFieldValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                              placeholder={p.description} className="bg-white/5 border-white/10 text-white h-8 text-xs font-mono" />
                          </div>
                        ))}
                      </div>
                    )}

                    {pgSelectedEndpoint.body && pgSelectedEndpoint.body.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Request Body</span>
                        {pgSelectedEndpoint.body.map((b) => (
                          <div key={b.name}>
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-[11px] text-blue-300 font-mono">{b.name}</code>
                              {b.required ? <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge> : <span className="text-[9px] text-white/30 italic">optional</span>}
                            </div>
                            <Input value={pgBodyValues[b.name] || ""} onChange={(e) => setPgBodyValues(prev => ({ ...prev, [b.name]: e.target.value }))}
                              placeholder={b.description} className="bg-white/5 border-white/10 text-white h-8 text-xs font-mono" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/20">
                    <div className="text-center">
                      <Terminal className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Select an endpoint to get started</p>
                      <p className="text-[11px] text-white/15 mt-1">Browse the sidebar or search</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="w-[380px] flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">Response</span>
                <div className="flex items-center gap-2">
                  {pgStatusCode !== null && (
                    <Badge className={`text-[10px] ${pgStatusCode < 300 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : pgStatusCode < 500 ? "bg-amber-500/15 text-amber-300 border-amber-500/20" : "bg-red-500/15 text-red-300 border-red-500/20"} border`}>{pgStatusCode}</Badge>
                  )}
                  {pgLatency !== null && <span className="text-[10px] text-white/30">{pgLatency}ms</span>}
                  {pgResponse && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30 hover:text-white" onClick={() => copyToClipboard(pgResponse, 'pg-resp')}>
                      {copied === "pg-resp" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                {pgResponse ? (
                  <pre className="p-4 text-[11px] text-emerald-300/80 font-mono whitespace-pre-wrap break-all">{pgResponse}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/20">
                    <div className="text-center">
                      <Play className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Click Send to get a response</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* ── QUICKSTART TAB ── */}
        <TabsContent value="quickstart" className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" /> Getting Started with the Platform API
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-white/50 mb-3">
                The Platform API uses two types of API keys, similar to Stripe. Each key pair gives you a publishable key for client-side read-only access and a secret key for full server-side operations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300">Secret Key</span>
                  </div>
                  <code className="text-[10px] text-amber-300/70 font-mono block">ozc_sk_live_•••••••••••••••</code>
                  <p className="text-[10px] text-white/30 mt-1.5">Full read/write/delete access. Keep server-side only. Never expose in browser code, GitHub repos, or client bundles.</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                  <div className="flex items-center gap-2 mb-2">
                    <Unlock className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-300">Publishable Key</span>
                  </div>
                  <code className="text-[10px] text-blue-300/70 font-mono block">ozc_pk_live_•••••••••••••••</code>
                  <p className="text-[10px] text-white/30 mt-1.5">Read-only (GET requests). Safe to embed in frontend apps, mobile apps, and public-facing widgets.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">Step 1 — Create Your API Keys</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <p className="text-[11px] text-white/50">Go to the "My API Keys" tab, click "Create Key", choose Secret or Publishable, and copy it immediately. The raw key is shown only once.</p>
              <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-blue-300/80 font-mono overflow-x-auto">{`# Secret key — for your backend
ozc_sk_live_ABCDEFghijklmnopqrstuvwxyz1234567890ABCD

# Publishable key — for your frontend
ozc_pk_live_XYZabcdefghijklmnopqrstuvwxyz0987654321`}</pre>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">Step 2 — Make Your First API Call</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div>
                <p className="text-[11px] text-white/50 mb-2">cURL — List accounts using your secret key:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-amber-300/80 font-mono overflow-x-auto">{`curl -X GET "${BASE_URL}/v1/accounts?status=active&limit=10" \\
  -H "X-API-Key: ozc_sk_live_YOUR_SECRET_KEY" \\
  -H "Content-Type: application/json"`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">JavaScript / Fetch (server-side):</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-emerald-300/80 font-mono overflow-x-auto">{`const res = await fetch("${BASE_URL}/v1/accounts", {
  headers: {
    "X-API-Key": process.env.OZC_SECRET_KEY,
    "Content-Type": "application/json"
  }
});
const { data } = await res.json();
console.log(\`Found \${data.length} accounts\`);`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">JavaScript / Fetch (client-side with publishable key):</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-blue-300/80 font-mono overflow-x-auto">{`// Safe to use in browser — read-only access
const res = await fetch("${BASE_URL}/v1/accounts?limit=5", {
  headers: {
    "X-API-Key": "ozc_pk_live_YOUR_PUBLISHABLE_KEY",
    "Content-Type": "application/json"
  }
});
const { data } = await res.json();`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">Python:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-purple-300/80 font-mono overflow-x-auto">{`import requests
import os

headers = {
    "X-API-Key": os.environ["OZC_SECRET_KEY"],
    "Content-Type": "application/json"
}

resp = requests.get(
    "${BASE_URL}/v1/accounts",
    headers=headers,
    params={"status": "active", "limit": 50}
)
accounts = resp.json()["data"]
print(f"Loaded {len(accounts)} accounts")`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">Node.js (with axios):</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-cyan-300/80 font-mono overflow-x-auto">{`const axios = require("axios");

const client = axios.create({
  baseURL: "${BASE_URL}",
  headers: {
    "X-API-Key": process.env.OZC_SECRET_KEY,
    "Content-Type": "application/json",
  },
});

// List accounts
const { data } = await client.get("/v1/accounts", {
  params: { status: "active" }
});

// Create an account
await client.post("/v1/accounts", {
  username: "new_creator",
  display_name: "New Creator",
  platform: "onlyfans",
  tier: "pro"
});`}</pre>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">Step 3 — Understand Rate Limits & Errors</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="space-y-2 text-[11px]">
                <p className="text-white/50 mb-2">Every response includes rate limit headers:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-white/40 font-mono overflow-x-auto">{`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1710000000`}</pre>
              </div>
              <div className="space-y-2 text-[11px] mt-4">
                <p className="text-white/50 font-semibold">HTTP Status Codes</p>
                {[
                  { code: "200", color: "emerald", desc: "OK — Request succeeded, data in response body" },
                  { code: "201", color: "blue", desc: "Created — Resource successfully created" },
                  { code: "400", color: "amber", desc: "Bad Request — Invalid parameters or missing required fields" },
                  { code: "401", color: "amber", desc: "Unauthorized — Invalid, expired, or missing API key" },
                  { code: "403", color: "amber", desc: "Forbidden — API key lacks required scope for this operation" },
                  { code: "404", color: "red", desc: "Not Found — Resource or endpoint does not exist" },
                  { code: "429", color: "red", desc: "Too Many Requests — Rate limit exceeded (RPM or daily)" },
                  { code: "500", color: "red", desc: "Internal Server Error — Retry with exponential backoff" },
                ].map(({ code, color, desc }) => (
                  <div key={code} className="flex items-center gap-3">
                    <Badge className={`bg-${color}-500/10 text-${color}-300 border-${color}-500/20 text-[10px] w-14 justify-center`}>{code}</Badge>
                    <span className="text-white/50">{desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">Step 4 — Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ul className="text-[11px] text-white/50 space-y-2 list-disc pl-4">
                <li><strong className="text-white/70">Never hardcode secret keys</strong> — Use environment variables (<code className="bg-white/5 px-1 rounded font-mono text-[10px]">OZC_SECRET_KEY</code>)</li>
                <li><strong className="text-white/70">Use publishable keys for client apps</strong> — They're read-only and safe to expose</li>
                <li><strong className="text-white/70">Rotate keys regularly</strong> — Create new keys and revoke old ones without downtime</li>
                <li><strong className="text-white/70">Use scoped keys</strong> — Grant minimum required permissions per integration</li>
                <li><strong className="text-white/70">Handle rate limits gracefully</strong> — Implement exponential backoff on 429 responses</li>
                <li><strong className="text-white/70">Monitor usage</strong> — Check your key stats in the "My API Keys" tab regularly</li>
                <li><strong className="text-white/70">Set expiration dates</strong> — For temporary integrations, set key TTLs</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAPI;
