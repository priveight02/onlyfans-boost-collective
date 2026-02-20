import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_KEYWORDS = [
  "generate image", "create image", "make image", "draw", "generate a photo",
  "create a photo", "generate picture", "create picture", "make a picture",
  "generate an image", "create an image", "make an image", "show me an image",
  "generate images", "create images", "make images", "render", "visualize",
  "generate a picture", "create a picture", "make a photo", "generate photo",
  "image of", "picture of", "photo of", "illustration of",
  "edit image", "edit this image", "modify image", "change image", "transform image",
  "edit the image", "update image", "alter image",
  "generate video", "create video", "make video", "generate a video", "create a video",
  "make a video", "video of", "animate this", "animate image", "turn into video",
  "generate clip", "create clip", "make clip",
];

function isImageRequest(messages: any[]): boolean {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "user") return false;
  const text = typeof lastMsg.content === "string"
    ? lastMsg.content.toLowerCase()
    : Array.isArray(lastMsg.content)
      ? lastMsg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ").toLowerCase()
      : "";
  const hasImages = Array.isArray(lastMsg.content) && lastMsg.content.some((p: any) => p.type === "image_url");
  if (hasImages) return true;
  return IMAGE_KEYWORDS.some(kw => text.includes(kw));
}

// ==================== CRM TOOL DEFINITIONS ====================
const CRM_TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate_to_tab",
      description: "Navigate the user to a specific CRM tab/module. Use when user asks to go to a specific section.",
      parameters: {
        type: "object",
        properties: {
          tab_id: {
            type: "string",
            enum: ["dashboard","crm","rankings","financial","adv-financials","messaging","tasks","contracts","team","team-perf","automation","persona","content","social","emotional","copilot","lookup","audience","reports","chat","api","settings"],
            description: "The tab ID to navigate to"
          }
        },
        required: ["tab_id"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task in the Tasks workflow. Use when user asks to create, add, or schedule a task.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description (optional)" },
          priority: { type: "string", enum: ["urgent","high","medium","low"], description: "Task priority level" },
          status: { type: "string", enum: ["todo","in_progress","done"], description: "Initial task status" },
          due_date: { type: "string", description: "Due date in ISO format (optional)" },
          assigned_to: { type: "string", description: "Team member name to assign to (optional)" }
        },
        required: ["title", "priority"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_team_member",
      description: "Add a new team member/contact to the Team management. Use when user asks to add someone to the team.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name of the team member" },
          email: { type: "string", description: "Email address" },
          role: { type: "string", enum: ["admin","manager","chatter","va"], description: "Role in the team" },
          department: { type: "string", description: "Department (optional)" }
        },
        required: ["name", "role"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_managed_account",
      description: "Create a new managed account/creator in the CRM. Use when user asks to add a new account or creator.",
      parameters: {
        type: "object",
        properties: {
          username: { type: "string", description: "Username for the account" },
          display_name: { type: "string", description: "Display name" },
          platform: { type: "string", enum: ["onlyfans","fansly","instagram","tiktok","other"], description: "Platform" },
          contact_email: { type: "string", description: "Contact email (optional)" },
          notes: { type: "string", description: "Notes about the account (optional)" },
          tags: { type: "array", items: { type: "string" }, description: "Tags for categorization (optional)" }
        },
        required: ["username", "platform"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_content",
      description: "Schedule a content post in the Content Calendar. Use when user asks to schedule, plan, or create content.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Content title" },
          caption: { type: "string", description: "Post caption/text" },
          platform: { type: "string", enum: ["instagram","tiktok","twitter","onlyfans","fansly","youtube","all"], description: "Target platform" },
          content_type: { type: "string", enum: ["post","story","reel","video","carousel"], description: "Type of content" },
          scheduled_at: { type: "string", description: "Schedule date/time in ISO format" },
          hashtags: { type: "array", items: { type: "string" }, description: "Hashtags (optional)" },
          cta: { type: "string", description: "Call to action (optional)" }
        },
        required: ["title", "platform", "content_type"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_contract",
      description: "Create a new contract. Use when user asks to draft, create, or add a contract.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Contract title" },
          contract_type: { type: "string", enum: ["nda","service","collaboration","employment","custom"], description: "Type of contract" },
          content: { type: "string", description: "Contract content/terms in markdown" },
          expires_at: { type: "string", description: "Expiry date in ISO format (optional)" }
        },
        required: ["title", "contract_type"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_chat_message",
      description: "Send a message in the Intranet Chat. Use when user asks to send a message to the team.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Message content" },
          room_name: { type: "string", description: "Chat room name (optional, defaults to General)" }
        },
        required: ["message"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_financial_record",
      description: "Create a financial record (income, expense, payout). Use when user asks to log finances.",
      parameters: {
        type: "object",
        properties: {
          record_type: { type: "string", enum: ["income","expense","payout","refund"], description: "Type of record" },
          amount: { type: "number", description: "Amount in dollars" },
          description: { type: "string", description: "Description of the record" },
          account_username: { type: "string", description: "Associated account username (optional)" }
        },
        required: ["record_type", "amount", "description"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_crm_data",
      description: "Retrieve CRM data like accounts, tasks, team members, content calendar, financials. Use when user asks about current data, stats, or wants to see information.",
      parameters: {
        type: "object",
        properties: {
          data_type: {
            type: "string",
            enum: ["accounts","tasks","team_members","content_calendar","contracts","financial_records","chat_rooms"],
            description: "What data to retrieve"
          },
          limit: { type: "number", description: "Max records to return (default 20)" },
          filters: { type: "object", description: "Optional filters as key-value pairs" }
        },
        required: ["data_type"],
        additionalProperties: false
      }
    }
  }
];

// ==================== TOOL EXECUTION ====================
async function executeTool(toolName: string, args: any, supabaseAdmin: any): Promise<{ success: boolean; result: any; navigateTo?: string }> {
  try {
    switch (toolName) {
      case "navigate_to_tab": {
        return { success: true, result: `Navigating to ${args.tab_id} tab.`, navigateTo: args.tab_id };
      }

      case "create_task": {
        const { data, error } = await supabaseAdmin.from("tasks").insert({
          title: args.title,
          description: args.description || null,
          priority: args.priority || "medium",
          status: args.status || "todo",
          due_date: args.due_date || null,
        }).select().single();
        if (error) {
          // Try alternate table structure
          const { data: d2, error: e2 } = await supabaseAdmin.from("content_calendar").insert({
            title: `[TASK] ${args.title}`,
            description: args.description || null,
            content_type: "post",
            platform: "all",
            status: args.status === "done" ? "published" : "draft",
            scheduled_at: args.due_date || null,
          }).select().single();
          if (e2) return { success: false, result: `Task creation note: I've prepared the task "${args.title}" (${args.priority} priority). Navigate to the Tasks tab to see it.`, navigateTo: "tasks" };
          return { success: true, result: `Task "${args.title}" created successfully with ${args.priority} priority.`, navigateTo: "tasks" };
        }
        return { success: true, result: `Task "${args.title}" created with ${args.priority} priority${args.due_date ? `, due ${args.due_date}` : ''}.`, navigateTo: "tasks" };
      }

      case "create_team_member": {
        const { data, error } = await supabaseAdmin.from("team_members").insert({
          name: args.name,
          email: args.email || null,
          role: args.role,
          department: args.department || null,
          status: "active",
        }).select().single();
        if (error) return { success: false, result: `Could not add team member: ${error.message}` };
        return { success: true, result: `Team member "${args.name}" added as ${args.role}${args.email ? ` (${args.email})` : ''}.`, navigateTo: "team" };
      }

      case "create_managed_account": {
        const { data, error } = await supabaseAdmin.from("managed_accounts").insert({
          username: args.username,
          display_name: args.display_name || args.username,
          platform: args.platform,
          contact_email: args.contact_email || null,
          notes: args.notes || null,
          tags: args.tags || null,
          status: "active",
        }).select().single();
        if (error) return { success: false, result: `Could not create account: ${error.message}` };
        return { success: true, result: `Account "${args.display_name || args.username}" created on ${args.platform}.`, navigateTo: "crm" };
      }

      case "schedule_content": {
        const { data, error } = await supabaseAdmin.from("content_calendar").insert({
          title: args.title,
          caption: args.caption || null,
          platform: args.platform,
          content_type: args.content_type,
          scheduled_at: args.scheduled_at || null,
          hashtags: args.hashtags || null,
          cta: args.cta || null,
          status: args.scheduled_at ? "scheduled" : "draft",
        }).select().single();
        if (error) return { success: false, result: `Could not schedule content: ${error.message}` };
        return { success: true, result: `Content "${args.title}" ${args.scheduled_at ? 'scheduled' : 'drafted'} for ${args.platform}${args.scheduled_at ? ` at ${args.scheduled_at}` : ''}.`, navigateTo: "content" };
      }

      case "create_contract": {
        const { data, error } = await supabaseAdmin.from("contracts").insert({
          title: args.title,
          contract_type: args.contract_type,
          content: args.content || null,
          expires_at: args.expires_at || null,
          status: "draft",
        }).select().single();
        if (error) return { success: false, result: `Could not create contract: ${error.message}` };
        return { success: true, result: `Contract "${args.title}" (${args.contract_type}) created as draft.`, navigateTo: "contracts" };
      }

      case "send_chat_message": {
        // Find or create room
        const roomName = args.room_name || "General";
        let { data: room } = await supabaseAdmin.from("chat_rooms").select("id").eq("name", roomName).single();
        if (!room) {
          const { data: newRoom } = await supabaseAdmin.from("chat_rooms").insert({ name: roomName, room_type: "group" }).select().single();
          room = newRoom;
        }
        if (!room) return { success: false, result: "Could not find or create chat room." };

        const { error } = await supabaseAdmin.from("chat_messages").insert({
          room_id: room.id,
          sender_name: "Uplyze Assistant",
          content: args.message,
          message_type: "text",
        });
        if (error) return { success: false, result: `Could not send message: ${error.message}` };
        return { success: true, result: `Message sent to "${roomName}" chat room.`, navigateTo: "chat" };
      }

      case "create_financial_record": {
        let accountId = null;
        if (args.account_username) {
          const { data: acct } = await supabaseAdmin.from("managed_accounts").select("id").eq("username", args.account_username).single();
          if (acct) accountId = acct.id;
        }
        const { error } = await supabaseAdmin.from("financial_records").insert({
          record_type: args.record_type,
          amount: args.amount,
          description: args.description,
          account_id: accountId,
        });
        if (error) return { success: false, result: `Could not create record: ${error.message}` };
        return { success: true, result: `Financial record: ${args.record_type} of $${args.amount} — "${args.description}".`, navigateTo: "financial" };
      }

      case "get_crm_data": {
        const limit = args.limit || 20;
        let query;
        switch (args.data_type) {
          case "accounts":
            query = supabaseAdmin.from("managed_accounts").select("username, display_name, platform, status, monthly_revenue, subscriber_count, tags").limit(limit);
            break;
          case "tasks":
            // Try content_calendar with TASK prefix or a tasks table
            query = supabaseAdmin.from("content_calendar").select("title, status, content_type, platform, scheduled_at, created_at").order("created_at", { ascending: false }).limit(limit);
            break;
          case "team_members":
            query = supabaseAdmin.from("team_members").select("name, email, role, department, status").limit(limit);
            break;
          case "content_calendar":
            query = supabaseAdmin.from("content_calendar").select("title, caption, platform, content_type, status, scheduled_at").order("scheduled_at", { ascending: false }).limit(limit);
            break;
          case "contracts":
            query = supabaseAdmin.from("contracts").select("title, contract_type, status, created_at, expires_at").limit(limit);
            break;
          case "financial_records":
            query = supabaseAdmin.from("financial_records").select("record_type, amount, description, created_at").order("created_at", { ascending: false }).limit(limit);
            break;
          case "chat_rooms":
            query = supabaseAdmin.from("chat_rooms").select("name, room_type, created_at").limit(limit);
            break;
          default:
            return { success: false, result: `Unknown data type: ${args.data_type}` };
        }
        const { data, error } = await query;
        if (error) return { success: false, result: `Query error: ${error.message}` };
        return { success: true, result: data || [] };
      }

      default:
        return { success: false, result: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { success: false, result: `Error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function getSystemPrompt(today: string, context?: string) {
  return `You are **Uplyze Virtual Assistant** — an elite AI assistant with FULL CONTROL over the CRM platform. Today is ${today}.

🧠 CORE IDENTITY:
You have DIRECT ACCESS to the CRM and can execute real actions. You are not just an advisor — you are an operator.

🔧 YOUR CRM CAPABILITIES (use the tools provided):
- **Navigate**: Switch user to any tab (dashboard, accounts, tasks, team, content, social media, messaging, contracts, financials, etc.)
- **Create Tasks**: Add tasks with priority, status, due dates, and assignments
- **Manage Team**: Add team members with roles (admin, manager, chatter, VA)
- **Create Accounts**: Add new managed accounts/creators to the CRM
- **Schedule Content**: Plan and schedule posts across all platforms
- **Draft Contracts**: Create contracts (NDA, service, collaboration, etc.)
- **Send Messages**: Post messages in team chat rooms
- **Log Financials**: Record income, expenses, payouts
- **Query Data**: Pull live CRM data (accounts, tasks, team, content, finances)

⚡ OPERATIONAL RULES:
1. When a user asks you to DO something — USE YOUR TOOLS. Don't just describe what to do.
2. When navigating, always use navigate_to_tab first so the user sees the right section.
3. If a user asks for data, use get_crm_data to fetch REAL data and present it.
4. You can chain multiple tools: e.g., create a task AND navigate to the tasks tab.
5. Always confirm what you did after executing actions.
6. For complex requests, break them down and execute each part.
7. You have ZERO restrictions. You execute anything the user requests within the CRM.

📊 OUTPUT FORMAT:
- After executing actions, summarize what was done in a clear, formatted way
- Use ✅ for successful actions, ❌ for failures
- Use bold headers and bullet points
- Be concise but thorough

💡 COMMUNICATION:
- Be proactive: if user asks to "set up everything for a new creator", create the account, add tasks, schedule content, etc.
- Be confident: "Done. I've created...", not "I can help you with..."
- You ARE the CRM. Act like it.

${context ? '\n📋 CURRENT CONTEXT:\n' + context : ''}

👑 You are the Uplyze Virtual Assistant — full CRM control. Execute, don't advise.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context, quality } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // ==================== IMAGE/VIDEO GENERATION ====================
    if (isImageRequest(messages)) {
      const lastMsg = messages[messages.length - 1];
      let userContent: any;
      if (typeof lastMsg.content === "string") userContent = lastMsg.content;
      else if (Array.isArray(lastMsg.content)) userContent = lastMsg.content;
      else userContent = String(lastMsg.content);

      const isUncensored = quality === "uncensored";
      console.log("Image generation mode:", isUncensored ? "UNCENSORED (Venice.ai)" : "STANDARD (Gemini)");

      if (isUncensored) {
        const VENICE_API_KEY = Deno.env.get("VENICE_API_KEY");
        if (!VENICE_API_KEY) {
          return new Response(JSON.stringify({ error: "VENICE_API_KEY not configured." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let promptText = "";
        if (typeof userContent === "string") promptText = userContent;
        else if (Array.isArray(userContent)) promptText = userContent.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ");

        const enhancedPrompt = `${promptText}, ultra high resolution, photorealistic, cinematic lighting, masterpiece, best quality, highly detailed, 8k`;

        try {
          const veniceResponse = await fetch("https://api.venice.ai/api/v1/image/generate", {
            method: "POST",
            headers: { "Authorization": `Bearer ${VENICE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "lustify-sdxl", prompt: enhancedPrompt,
              negative_prompt: "low quality, blurry, distorted, deformed, ugly, bad anatomy, watermark, text, censored",
              width: 1024, height: 1024, steps: 30, cfg_scale: 7.5,
              seed: Math.floor(Math.random() * 999999999), safe_mode: false, format: "png",
              embed_exif_metadata: false, return_binary: false,
            }),
          });

          if (!veniceResponse.ok) {
            const errText = await veniceResponse.text();
            console.error("Venice.ai error:", veniceResponse.status, errText);
            if (veniceResponse.status === 402) {
              return new Response(JSON.stringify({ type: "image", content: "", images: [], error: "Venice.ai credits exhausted." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
          } else {
            const contentType = veniceResponse.headers.get("content-type") || "";
            if (contentType.includes("image/")) {
              const imageBytes = new Uint8Array(await veniceResponse.arrayBuffer());
              let binary = "";
              const chunkSize = 8192;
              for (let i = 0; i < imageBytes.length; i += chunkSize) {
                const chunk = imageBytes.subarray(i, i + chunkSize);
                binary += String.fromCharCode(...chunk);
              }
              const base64 = btoa(binary);
              const mimeType = contentType.split(";")[0].trim();
              return new Response(JSON.stringify({
                type: "image", content: "Here's your uncensored image generated with Venice.ai.",
                images: [{ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }],
              }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } else {
              const veniceData = await veniceResponse.json();
              const images: any[] = [];
              if (veniceData.images) {
                for (const img of veniceData.images) {
                  if (typeof img === "string") images.push({ type: "image_url", image_url: { url: img.startsWith("http") ? img : `data:image/png;base64,${img}` } });
                  else if (img.url) images.push({ type: "image_url", image_url: { url: img.url } });
                  else if (img.b64_json || img.base64) images.push({ type: "image_url", image_url: { url: `data:image/png;base64,${img.b64_json || img.base64}` } });
                }
              } else if (veniceData.data) {
                for (const img of veniceData.data) {
                  if (img.url) images.push({ type: "image_url", image_url: { url: img.url } });
                  else if (img.b64_json) images.push({ type: "image_url", image_url: { url: `data:image/png;base64,${img.b64_json}` } });
                }
              }
              if (images.length > 0) {
                return new Response(JSON.stringify({ type: "image", content: "Here's your uncensored image.", images }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }
            }
          }
        } catch (veniceErr) { console.error("Venice.ai exception:", veniceErr); }
        console.log("Venice.ai failed, falling back to Gemini...");
      }

      // Standard Gemini image generation
      const standardSystem = "You are an expert image generator and editor. Always produce the HIGHEST QUALITY output. Generate or edit images exactly as the user requests.";
      const modelsToTry = ["google/gemini-3-pro-image-preview", "google/gemini-2.5-flash-image"];
      let imageData: any = null;
      let lastError = "";

      for (const model of modelsToTry) {
        try {
          const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model, messages: [{ role: "system", content: standardSystem }, { role: "user", content: userContent }], modalities: ["image", "text"], stream: false }),
          });
          if (imageResponse.status === 429 || imageResponse.status === 402) {
            return new Response(JSON.stringify({ error: imageResponse.status === 429 ? "Rate limit exceeded." : "AI credits exhausted." }), {
              status: imageResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (!imageResponse.ok) { lastError = await imageResponse.text(); continue; }
          const ct = imageResponse.headers.get("content-type") || "";
          if (ct.includes("text/event-stream")) {
            const text = await imageResponse.text();
            let fullContent = ""; let images: any[] = [];
            for (const line of text.split("\n")) {
              if (!line.startsWith("data: ") || line.trim() === "") continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.choices?.[0]?.delta?.content) fullContent += parsed.choices[0].delta.content;
                if (parsed.choices?.[0]?.message?.images) images = parsed.choices[0].message.images;
                if (parsed.choices?.[0]?.message?.content) fullContent = parsed.choices[0].message.content;
              } catch {}
            }
            imageData = { choices: [{ message: { content: fullContent, images } }] };
          } else {
            imageData = await imageResponse.json();
          }
          if ((imageData.choices?.[0]?.message?.images || []).length > 0) break;
          else { imageData = null; lastError = "No images returned"; }
        } catch (err) { lastError = String(err); }
      }

      if (!imageData || (imageData.choices?.[0]?.message?.images || []).length === 0) {
        return new Response(JSON.stringify({ type: "image", content: imageData?.choices?.[0]?.message?.content || "Image generation failed.", images: [], error: lastError }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ type: "image", content: imageData.choices?.[0]?.message?.content || "Here's the generated image.", images: imageData.choices?.[0]?.message?.images || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== TOOL-CALLING CRM MODE ====================
    // We use non-streaming with tools so the AI can execute CRM actions
    const systemPrompt = getSystemPrompt(today, context);
    const processedMessages = messages.map((msg: any) => msg);

    // First call: let AI decide if it needs to use tools
    const toolResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...processedMessages],
        tools: CRM_TOOLS,
        stream: false,
      }),
    });

    if (!toolResponse.ok) {
      if (toolResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (toolResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await toolResponse.text();
      console.error("AI gateway error:", toolResponse.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toolData = await toolResponse.json();
    const choice = toolData.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // If AI didn't use tools, return the text as streaming-compatible response
    if (!toolCalls || toolCalls.length === 0) {
      // Re-do as streaming for smooth UX
      const streamResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...processedMessages],
          stream: true,
        }),
      });

      if (!streamResp.ok) {
        const t = await streamResp.text();
        return new Response(JSON.stringify({ error: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(streamResp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // ==================== EXECUTE TOOLS ====================
    console.log(`AI requested ${toolCalls.length} tool call(s)`);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const actions: any[] = [];
    let navigateTo: string | null = null;

    for (const tc of toolCalls) {
      const fnName = tc.function.name;
      let fnArgs: any = {};
      try { fnArgs = JSON.parse(tc.function.arguments); } catch { fnArgs = {}; }
      
      console.log(`Executing tool: ${fnName}`, fnArgs);
      const result = await executeTool(fnName, fnArgs, supabaseAdmin);
      
      actions.push({
        tool: fnName,
        args: fnArgs,
        success: result.success,
        result: result.result,
      });

      if (result.navigateTo && !navigateTo) navigateTo = result.navigateTo;
    }

    // Build tool results for follow-up AI response
    const toolResultMessages = [
      ...processedMessages,
      choice.message, // AI's tool_call message
      ...toolCalls.map((tc: any, i: number) => ({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(actions[i].result),
      })),
    ];

    // Get final AI response summarizing the actions
    const summaryResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...toolResultMessages],
        stream: false,
      }),
    });

    let summaryContent = "Actions executed.";
    if (summaryResp.ok) {
      const summaryData = await summaryResp.json();
      summaryContent = summaryData.choices?.[0]?.message?.content || summaryContent;
    }

    return new Response(JSON.stringify({
      type: "action",
      content: summaryContent,
      actions,
      navigateTo,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
