import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IG_GRAPH_URL = "https://graph.instagram.com/v24.0";
const FB_GRAPH_URL = "https://graph.facebook.com/v24.0";

// ===== GENDER DETECTION ENGINE =====
// Comprehensive name-based gender classifier using statistical name databases
const FEMALE_NAMES = new Set([
  // Top 500+ female names globally
  "mary","patricia","jennifer","linda","barbara","elizabeth","susan","jessica","sarah","karen",
  "lisa","nancy","betty","margaret","sandra","ashley","dorothy","kimberly","emily","donna",
  "michelle","carol","amanda","melissa","deborah","stephanie","rebecca","sharon","laura","cynthia",
  "kathleen","amy","angela","shirley","anna","brenda","pamela","emma","nicole","helen",
  "samantha","katherine","christine","debra","rachel","carolyn","janet","catherine","maria","heather",
  "diane","ruth","julie","olivia","joyce","virginia","victoria","kelly","lauren","christina",
  "joan","evelyn","judith","megan","andrea","cheryl","hannah","jacqueline","martha","gloria",
  "teresa","ann","sara","madison","frances","kathryn","janice","jean","abigail","alice",
  "judy","sophia","grace","denise","amber","doris","marilyn","danielle","beverly","isabella",
  "theresa","diana","natalie","brittany","charlotte","marie","kayla","alexis","lori","jade",
  "natasha","tiffany","tamara","crystal","ava","mia","aria","chloe","penelope","layla",
  "riley","zoey","nora","lily","eleanor","hazel","violet","aurora","savannah","audrey",
  "brooklyn","bella","claire","skylar","lucy","paisley","everly","anna","caroline","nova",
  "genesis","emilia","kennedy","samantha","maya","willow","kinsley","naomi","aaliyah","elena",
  "sarah","ariana","allison","gabriella","alice","madelyn","cora","eva","serenity","autumn",
  "adeline","hailey","gianna","valentina","isla","eliana","quinn","nevaeh","ivy","sadie",
  "piper","lydia","alexa","josephine","emery","julia","delilah","arianna","vivian","kaylee",
  "sophie","brielle","madeline","peyton","rylee","clara","hadley","melanie","mackenzie","reagan",
  "adalynn","liliana","aubrey","jade","diana","alina","andrea","ariel","adriana","bianca",
  "camila","daniela","dulce","elena","fatima","fernanda","gabriela","gloria","ines","iris",
  "jasmine","jimena","julieta","karina","laura","lucia","luna","luz","marisol","mariana",
  "nadia","paula","paola","rosa","sofia","valeria","valentina","vanessa","veronica","ximena",
  "yolanda","alina","anastasia","daria","ekaterina","irina","katya","lena","mila","natalya",
  "nina","olga","polina","svetlana","tatiana","vera","yulia","aiko","akemi","ayumi","chiyo",
  "haruka","hina","kaori","keiko","mai","maki","miku","misaki","nana","rin","sakura","yui","yuki",
  "aisha","amina","fatimah","hafsa","khadija","layla","leila","maryam","noor","rania","salma","yasmin","zahra","zainab",
  "ananya","deepa","diya","kavya","meera","neha","nisha","pooja","priya","riya","sana","shreya","swati","tara",
  "babe","baby","honey","sweetie","princess","queen","goddess","angel","doll","kitten","bunny",
  "lana","mia","gia","tia","sia","nia","zoe","eva","ava","ivy","mae","joy","hope","faith",
  "scarlett","stella","daisy","poppy","rose","ruby","pearl","amber","jasmine","holly","ivy",
  "fern","wren","dove","raven","meadow","summer","winter","dawn","brooke","april","may","june",
  "destiny","harmony","melody","cadence","lyric","aria","celeste","aurora","luna","stella",
  "selena","serena","adriana","alana","alena","alicia","alyssa","amara","amelia","anita",
  "annabelle","april","arya","aspen","athena","aubree","aurora","avery","beatrice","bianca",
  "blair","blaire","bonnie","brianna","bridget","brynn","callie","camille","candice","carmen",
  "cassandra","cassidy","cecilia","celeste","chanel","charity","chelsea","cheyenne","ciara",
  "claudia","colleen","corinne","courtney","daisy","dakota","dana","daphne","darcy","deanna",
  "desiree","dominique","edith","eileen","elaine","elena","elise","ella","ellen","eloise",
  "elsie","erica","erin","esme","esther","eve","faith","faye","fiona","flora","francesca",
  "freya","gail","gemma","genevieve","georgia","gigi","giselle","gwen","gwyneth","hadley",
  "harley","harper","haven","hayley","hazel","heidi","holly","hope","imogen","india","ingrid",
  "irene","isabel","isla","jaclyn","jada","jane","janelle","jayla","jenna","jenny",
  "jillian","joanna","jocelyn","jolene","jordan","josie","joy","juliana","juliet","june",
  "kaia","kara","katelyn","katrina","kendra","kiera","kimber","kinley","kirsten","kristen",
  "lainey","lara","leah","leia","lena","leona","lesli","lexi","lila","lillian","lina",
  "logan","london","lorelei","lottie","louisa","lucia","lucille","lydia","mabel","macy",
  "magdalena","mallory","mara","marcella","marcy","margot","marissa","martha","matilda","mavis",
  "maxine","mckenna","mercedes","meredith","mila","millie","miriam","molly","monica","morgan",
  "myla","nadia","natalya","nell","noelle","nola","olive","opal","ophelia","paige","paloma",
  "pandora","paris","patience","paulina","pearl","phoebe","priscilla","raquel","raven","reese",
  "regina","renata","rhea","rosa","rosalie","rosalyn","rosemary","roxanne","sable","sage",
  "sally","sandra","sasha","selene","sienna","simone","sloane","sonia","stella","sue",
  "summer","susanna","sylvia","tabitha","talia","tammy","tanya","tessa","thea","tina",
  "trudy","ursula","valencia","valerie","vera","violet","virginia","vivienne","wendy","willa",
  "wilma","winifred","xena","yasmine","yvette","yvonne","zelda","zara","zinnia","zoe","zora",
]);

const MALE_NAMES = new Set([
  // Top 500+ male names globally
  "james","robert","john","michael","david","william","richard","joseph","thomas","charles",
  "christopher","daniel","matthew","anthony","mark","donald","steven","paul","andrew","joshua",
  "kenneth","kevin","brian","george","timothy","ronald","edward","jason","jeffrey","ryan",
  "jacob","gary","nicholas","eric","jonathan","stephen","larry","justin","scott","brandon",
  "benjamin","samuel","raymond","gregory","frank","alexander","patrick","jack","dennis","jerry",
  "tyler","aaron","jose","adam","nathan","henry","peter","zachary","douglas","harold",
  "kyle","noah","gerald","carl","roger","keith","jeremy","terry","lawrence","sean",
  "christian","austin","jesse","dylan","albert","willie","gabriel","bruce","philip","bryan",
  "wayne","ralph","roy","eugene","randy","vincent","russell","louis","bobby","johnny",
  "logan","liam","mason","ethan","oliver","aiden","lucas","jackson","sebastian","mateo",
  "owen","carter","jayden","luke","grayson","leo","connor","elijah","isaac","landon",
  "adrian","julian","nolan","hunter","cameron","max","eli","miles","lincoln","bennett",
  "cooper","dominic","jaxon","emmett","dean","sawyer","everett","brooks","roman","cole",
  "hudson","parker","asher","chase","harrison","blake","rowan","weston","easton","jameson",
  "silas","beau","beckett","tucker","atlas","axel","brody","cash","colton","dallas","dawson",
  "easton","emilio","finn","gavin","grant","griffin","gunner","hayes","hendrix","jace",
  "jax","kai","king","knox","levi","maddox","maverick","milo","nash","oakley","paxton",
  "phoenix","prince","reed","remington","rhett","ryder","sergio","tate","tristan","wade",
  "walker","wyatt","xander","zander","zion","ace","ahmed","alan","alejandro","ali","amos",
  "andre","angelo","archie","ari","armando","arnold","arthur","ashton","august","barack",
  "barrett","baylor","blaine","brad","brett","caleb","carl","carlos","casey","cedric",
  "chad","chandler","charlie","chester","clarence","clark","clay","cliff","clint","clyde",
  "cody","colby","colin","colt","corey","craig","cruz","curtis","cyrus","dale","damon",
  "dane","dante","darian","darius","darren","darwin","deacon","derek","desmond","devin",
  "diego","dirk","dmitri","drake","drew","duane","duke","dustin","dwight","dylan","earl",
  "edgar","edison","eduardo","elias","elliot","elvis","enrique","ernest","ernie","ethan",
  "evan","fabio","felipe","felix","fernando","fletcher","floyd","flynn","ford","forrest",
  "francisco","freddie","garrett","gene","geoffrey","geraldo","giovanni","glen","gordon",
  "grady","graham","hank","harvey","hector","herb","herman","hugo","ian","ivan","jared",
  "jarvis","jay","jean","jeff","jensen","joel","jordi","jorge","juan","julio","kade",
  "kane","kareem","keegan","kelvin","kendall","kenny","khalid","lance","lars","lee",
  "leon","leonard","lester","lewis","lloyd","lorenzo","luca","luis","luke","luther","malik",
  "manuel","marc","marco","marcus","mario","marshall","martin","marvin","mason","maurice",
  "max","maxwell","melvin","micah","miguel","mitchell","mohamed","mohammad","mohammed",
  "monty","morgan","morris","murphy","murray","neil","nelson","noel","norman","omar",
  "orlando","oscar","otis","otto","pablo","pedro","percy","perry","pete","porter","preston",
  "quentin","quincy","rafael","ramon","randall","ray","reginald","rene","rex","rick",
  "riley","rocco","rodney","rodrigo","roland","romeo","ronald","ross","ruben","rufus",
  "rupert","russ","ryan","salvador","sam","santiago","saul","scott","seth","shane","shaun",
  "sheldon","sherman","simon","solomon","spencer","sterling","stuart","ted","terrance",
  "theodore","tobias","todd","tony","travis","trent","trevor","troy","tyler","vance",
  "vaughn","victor","vince","virgil","vladimir","wallace","walter","warren","wendell","wesley",
  "wilbur","will","willard","winston","wolfgang","xavier","yusuf","zack","zane",
  "daddy","king","boss","chief","sir","master","papa","dude","bro","guy","man","boy",
]);

function classifyGender(fullName: string): "female" | "male" | "unknown" {
  if (!fullName) return "unknown";
  
  // Extract first name (handle multi-word names, emojis, etc.)
  const cleaned = fullName.toLowerCase()
    .replace(/[^\p{L}\s'-]/gu, "") // Remove emojis and special chars
    .replace(/\s+/g, " ")
    .trim();
  
  if (!cleaned) return "unknown";
  
  const parts = cleaned.split(" ");
  const firstName = parts[0];
  
  // Check first name against databases
  if (FEMALE_NAMES.has(firstName)) return "female";
  if (MALE_NAMES.has(firstName)) return "male";
  
  // Check second name if first didn't match (some cultures put surname first)
  if (parts.length > 1 && parts[1]) {
    if (FEMALE_NAMES.has(parts[1])) return "female";
    if (MALE_NAMES.has(parts[1])) return "male";
  }
  
  // Suffix-based heuristics for names not in dictionary
  const suffixFemale = ["ella","ina","ina","ette","etta","issa","ista","ia","ie","lyn","lynn","een","ene","ine","ana","ena","ita","ita","ola","ula","ara","ora","ira"];
  const suffixMale = ["son","ton","ston","den","don","dan","man","ard","bert","pert","fred","mund","wald","win","vin","rick","ric","ick","ius","eus","ander","andro"];
  
  for (const s of suffixFemale) {
    if (firstName.endsWith(s) && firstName.length > s.length + 1) return "female";
  }
  for (const s of suffixMale) {
    if (firstName.endsWith(s) && firstName.length > s.length + 1) return "male";
  }
  
  return "unknown";
}

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("Instagram not connected for this account");
  return data;
}

async function getPageId(token: string, igUserId: string): Promise<{ pageId: string; pageToken: string } | null> {
  try {
    const pagesResp = await fetch(`${FB_GRAPH_URL}/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${token}`);
    const pagesData = await pagesResp.json();
    console.log("Pages response:", JSON.stringify(pagesData).substring(0, 500));
    
    if (pagesData.data) {
      for (const page of pagesData.data) {
        if (page.instagram_business_account?.id === igUserId) {
          console.log(`Found linked Page: ${page.name} (${page.id}) for IG user ${igUserId}`);
          return { pageId: page.id, pageToken: page.access_token || token };
        }
      }
      if (pagesData.data.length === 1) {
        const page = pagesData.data[0];
        console.log(`Using only available Page: ${page.name} (${page.id})`);
        return { pageId: page.id, pageToken: page.access_token || token };
      }
    }
    console.log("No linked Facebook Page found for IG user:", igUserId);
    return null;
  } catch (e: any) {
    console.log("getPageId error:", e.message);
    return null;
  }
}

async function igFetch(endpoint: string, token: string, method = "GET", body?: any, useFbGraph = false) {
  const baseUrl = useFbGraph ? FB_GRAPH_URL : IG_GRAPH_URL;
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
  const sep = url.includes("?") ? "&" : "?";
  const fetchUrl = method === "GET" ? `${url}${sep}access_token=${token}` : url;
  
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (method !== "GET") {
    opts.body = JSON.stringify({ ...body, access_token: token });
  }
  
  const resp = await fetch(fetchUrl, opts);
  const data = await resp.json();
  if (data.error) throw new Error(`IG API: ${data.error.message}`);
  return data;
}

async function fbFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${FB_GRAPH_URL}${endpoint}`;
  const sep = url.includes("?") ? "&" : "?";
  const fetchUrl = method === "GET" ? `${url}${sep}access_token=${token}` : url;
  
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (method !== "GET") {
    opts.body = JSON.stringify({ ...body, access_token: token });
  }
  
  const resp = await fetch(fetchUrl, opts);
  const data = await resp.json();
  if (data.error) throw new Error(`FB API: ${data.error.message}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, account_id, params } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Gender classification — hybrid: dictionary first, then AI for unknowns, then retry pass
    if (action === "classify_gender") {
      const accountId = account_id;
      const batchSize = params?.batch_size || 10000;
      
      // Fetch ALL followers (both null gender AND "unknown" for reclassification)
      // Include metadata for AI analysis
      const { data: allFollowers } = await supabase
        .from("fetched_followers")
        .select("id, full_name, username, gender, metadata, profile_pic_url")
        .eq("account_id", accountId)
        .or("gender.is.null,gender.eq.unknown")
        .limit(batchSize);

      if (!allFollowers || allFollowers.length === 0) {
        const { count: femaleCount } = await supabase.from("fetched_followers").select("id", { count: "exact", head: true }).eq("account_id", accountId).eq("gender", "female");
        const { count: maleCount } = await supabase.from("fetched_followers").select("id", { count: "exact", head: true }).eq("account_id", accountId).eq("gender", "male");
        const { count: unknownCount } = await supabase.from("fetched_followers").select("id", { count: "exact", head: true }).eq("account_id", accountId).or("gender.is.null,gender.eq.unknown");
        return new Response(JSON.stringify({
          success: true,
          data: { classified: 0, female: femaleCount || 0, male: maleCount || 0, unknown: unknownCount || 0 }
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // PASS 1: Dictionary-based classification
      const dictionaryResults: { id: string; gender: string }[] = [];
      const needsAI: { id: string; name: string; username: string; bio: string; extra: string }[] = [];
      
      for (const f of allFollowers) {
        const name = f.full_name || f.username || "";
        const dictResult = classifyGender(name);
        if (dictResult !== "unknown") {
          dictionaryResults.push({ id: f.id, gender: dictResult });
        } else {
          const meta = (f.metadata as any) || {};
          const bio = meta.biography || meta.bio || "";
          const extra = [
            meta.follower_count ? `followers:${meta.follower_count}` : "",
            meta.following_count ? `following:${meta.following_count}` : "",
            meta.media_count ? `posts:${meta.media_count}` : "",
            f.profile_pic_url ? "has_pic" : "no_pic",
          ].filter(Boolean).join(",");
          needsAI.push({ id: f.id, name, username: f.username || "", bio, extra });
        }
      }

      // Apply dictionary results
      let updated = 0;
      for (let i = 0; i < dictionaryResults.length; i += 500) {
        const batch = dictionaryResults.slice(i, i + 500);
        for (const u of batch) {
          await supabase.from("fetched_followers").update({ gender: u.gender }).eq("id", u.id);
        }
        updated += batch.length;
      }

      // PASS 2: AI classification using stronger model + richer context
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const stillUnknown: { id: string; name: string; username: string; bio: string; extra: string }[] = [];

      if (LOVABLE_API_KEY && needsAI.length > 0) {
        const AI_BATCH_SIZE = 150;
        for (let i = 0; i < needsAI.length; i += AI_BATCH_SIZE) {
          const aiBatch = needsAI.slice(i, i + AI_BATCH_SIZE);
          // Build rich context lines: index | name | username | bio snippet | signals
          const nameList = aiBatch.map((f, idx) => {
            const bioSnippet = f.bio ? f.bio.substring(0, 80).replace(/\n/g, " ") : "";
            return `${idx}|${f.name}|@${f.username}|${bioSnippet}|${f.extra}`;
          }).join("\n");
          
          try {
            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: `You are the world's best gender classification engine for Instagram profiles. You MUST classify every single profile. Leaving any unclassified is a failure.

INPUT FORMAT: index|display_name|@username|bio_snippet|signals
OUTPUT FORMAT: One line per entry: index:F or index:M or index:U (only if truly a brand/business/meme page)

CLASSIFICATION STRATEGY (use ALL signals together):

1. NAME ANALYSIS:
- Decode nicknames: "bbyg" = baby girl (F), "jdawg" = male nickname (M)
- Cultural names: Arabic (Fatima=F, Ahmed=M), Hindi (Priya=F, Raj=M), Japanese (Sakura=F, Kenji=M), Korean (Jimin=ambiguous, Minjung=F), Turkish (Ayşe=F, Mehmet=M), Slavic (Natasha=F, Dimitri=M), African (Amara=F, Kwame=M), Portuguese (Fernanda=F, Thiago=M)
- Name endings: -a/-i/-e lean F in Romance/Slavic languages; -o/-us lean M
- "Mrs", "Ms", "mama", "mom", "wifey", "queen", "goddess", "princess", "girl", "lady", "she", "her" → F
- "Mr", "papa", "dad", "hubby", "king", "boss", "sir", "he", "him", "boy", "man", "bro" → M

2. USERNAME PATTERNS:
- Contains "girl", "gurl", "babe", "queen", "miss", "mrs", "mama", "she", "her", "lady", "fem", "witch", "goddess", "diva", "empress" → F
- Contains "boy", "guy", "man", "mr", "king", "sir", "dad", "bro", "dude", "alpha", "chief", "duke", "lord" → M
- Ends in feminine diminutives: "xo", "xx", "xoxo", "bb", "bby" → likely F
- Numbers or random chars alone → analyze other signals

3. BIO ANALYSIS:
- Pronouns: "she/her" → F, "he/him" → M, "they/them" → classify by other signals or U
- Roles: "model", "actress", "mom", "wife", "sister", "dancer", "nurse" → F
- Roles: "actor", "dad", "husband", "brother", "coach", "barber" → M
- Self-descriptions: "💋", "🌸", "🦋", "💅", "🎀", "👸", "✨", "🌺", "💕", "🌙" → F
- Self-descriptions: "💪", "🔥", "👑(in male context)", "🏋️", "⚡", "🦁", "🐺", "🏈", "🎮" → M

4. PROFILE SIGNALS:
- High follower count + "model"/"influencer" in bio → likely F in creator space
- "Photographer", "DJ", "Producer", "Developer", "Engineer" without other signals → lean M but check name
- Business/brand names ("LLC", "Official", "Shop", "Store", "Studio", "Agency", "Media", "News") → U

5. DECISION RULES:
- If ANY signal points to F or M, classify accordingly. Do NOT default to U.
- Only use U for: confirmed businesses, meme/fan pages, news accounts, bot-looking profiles with zero human signals
- When signals conflict, weight NAME > BIO > USERNAME > PROFILE SIGNALS
- For ambiguous single-letter or number-only usernames with no other data, use the strongest available signal
- AIM FOR <2% U rate. Most profiles are real people.`
                  },
                  {
                    role: "user",
                    content: `Classify ALL ${aiBatch.length} profiles. Every single one MUST get a classification.\n${nameList}`
                  }
                ],
                temperature: 0.05,
                max_tokens: aiBatch.length * 5 + 200,
              }),
            });

            if (aiResp.ok) {
              const aiData = await aiResp.json();
              const content = aiData.choices?.[0]?.message?.content || "";
              const lines = content.split("\n").filter((l: string) => l.trim());
              
              const classifiedIdxs = new Set<number>();
              const aiUpdates: { id: string; gender: string }[] = [];
              for (const line of lines) {
                const match = line.match(/^(\d+)\s*:\s*([FMU])/i);
                if (match) {
                  const idx = parseInt(match[1]);
                  const code = match[2].toUpperCase();
                  if (idx >= 0 && idx < aiBatch.length) {
                    const gender = code === "F" ? "female" : code === "M" ? "male" : "unknown";
                    aiUpdates.push({ id: aiBatch[idx].id, gender });
                    classifiedIdxs.add(idx);
                    if (gender === "unknown") {
                      stillUnknown.push(aiBatch[idx]);
                    }
                  }
                }
              }

              // Track profiles the AI missed entirely
              for (let j = 0; j < aiBatch.length; j++) {
                if (!classifiedIdxs.has(j)) {
                  stillUnknown.push(aiBatch[j]);
                }
              }

              // Apply AI results
              for (const u of aiUpdates) {
                await supabase.from("fetched_followers").update({ gender: u.gender }).eq("id", u.id);
              }
              updated += aiUpdates.filter(u => u.gender !== "unknown").length;
              console.log(`[GENDER AI] Batch ${Math.floor(i / AI_BATCH_SIZE) + 1}: classified ${aiUpdates.length}/${aiBatch.length} profiles`);
            } else {
              console.error(`[GENDER AI] API error: ${aiResp.status}`);
              // Push all as still unknown for retry
              for (const f of aiBatch) stillUnknown.push(f);
            }
          } catch (aiErr) {
            console.error("[GENDER AI] Error:", aiErr);
            for (const f of aiBatch) stillUnknown.push(f);
          }
        }
      }

      // PASS 3: Retry pass with stronger model for remaining unknowns
      if (LOVABLE_API_KEY && stillUnknown.length > 0 && stillUnknown.length <= 500) {
        console.log(`[GENDER AI] PASS 3: Retrying ${stillUnknown.length} remaining unknowns with stronger model`);
        const RETRY_BATCH = 100;
        for (let i = 0; i < stillUnknown.length; i += RETRY_BATCH) {
          const retryBatch = stillUnknown.slice(i, i + RETRY_BATCH);
          const nameList = retryBatch.map((f, idx) => {
            const bioSnippet = f.bio ? f.bio.substring(0, 120).replace(/\n/g, " ") : "";
            return `${idx}|${f.name}|@${f.username}|${bioSnippet}|${f.extra}`;
          }).join("\n");

          try {
            const retryResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-pro",
                messages: [
                  {
                    role: "system",
                    content: `You are doing a FINAL PASS gender classification with the most powerful model available. These profiles defeated a previous classifier. You MUST make a decision for EVERY profile — F or M. 
Only use U if it is 100% certain this is a non-human account (brand, business page, bot, news outlet). 
For ambiguous human profiles, make your BEST GUESS. A wrong guess is better than U. Use statistical priors: on Instagram creator/fan pages, ~65% of ambiguous profiles are female.
Analyze every character in the name and username for any gender signal at all. Look for phonetic cues, cultural roots, letter patterns, and any micro-signal.`
                  },
                  {
                    role: "user",
                    content: `FINAL PASS: Classify ALL ${retryBatch.length} profiles. Format: index:F or index:M (avoid U).\n${nameList}`
                  }
                ],
                temperature: 0.0,
                max_tokens: retryBatch.length * 5 + 100,
              }),
            });

            if (retryResp.ok) {
              const retryData = await retryResp.json();
              const content = retryData.choices?.[0]?.message?.content || "";
              const lines = content.split("\n").filter((l: string) => l.trim());
              let retryUpdated = 0;
              for (const line of lines) {
                const match = line.match(/^(\d+)\s*:\s*([FMU])/i);
                if (match) {
                  const idx = parseInt(match[1]);
                  const code = match[2].toUpperCase();
                  if (idx >= 0 && idx < retryBatch.length) {
                    const gender = code === "F" ? "female" : code === "M" ? "male" : "unknown";
                    await supabase.from("fetched_followers").update({ gender }).eq("id", retryBatch[idx].id);
                    if (gender !== "unknown") retryUpdated++;
                  }
                }
              }
              updated += retryUpdated;
              console.log(`[GENDER AI] PASS 3 retry batch: resolved ${retryUpdated}/${retryBatch.length}`);
            }
          } catch (retryErr) {
            console.error("[GENDER AI] Retry error:", retryErr);
          }
        }
      }

      // Get final counts
      const { count: femaleCount } = await supabase.from("fetched_followers").select("id", { count: "exact", head: true }).eq("account_id", accountId).eq("gender", "female");
      const { count: maleCount } = await supabase.from("fetched_followers").select("id", { count: "exact", head: true }).eq("account_id", accountId).eq("gender", "male");
      const { count: unknownCount } = await supabase.from("fetched_followers").select("id", { count: "exact", head: true }).eq("account_id", accountId).or("gender.is.null,gender.eq.unknown");

      return new Response(JSON.stringify({
        success: true,
        data: {
          classified: updated,
          ai_classified: needsAI.length,
          ai_retried: stillUnknown.length,
          female: femaleCount || 0,
          male: maleCount || 0,
          unknown: unknownCount || 0,
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const conn = await getConnection(supabase, account_id);
    const token = conn.access_token;
    const igUserId = conn.platform_user_id;
    
    let result: any;

    switch (action) {
      // ===== PROFILE =====
      case "get_profile":
        result = await igFetch(`/${igUserId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website`, token);
        break;

      case "get_profile_basic":
        result = await igFetch(`/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count`, token);
        break;

      // ===== MEDIA =====
      case "get_media":
        result = await igFetch(`/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${params?.limit || 25}`, token);
        break;

      case "get_media_next_page":
        if (!params?.next_url) throw new Error("next_url required");
        result = await igFetch(params.next_url, token);
        break;

      case "get_media_details":
        result = await igFetch(`/${params.media_id}?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url}`, token);
        break;

      // ===== TAGGED & MENTIONS =====
      case "get_tagged_media":
        result = await igFetch(`/${igUserId}/tags?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${params?.limit || 25}`, token);
        break;

      case "get_mentioned_media":
        result = await igFetch(`/${igUserId}/mentioned_media?fields=id,caption,media_type,media_url,permalink,timestamp&limit=${params?.limit || 25}`, token);
        break;

      case "get_mentioned_comment":
        result = await igFetch(`/${params.media_id}?fields=id,caption,media_type,permalink,timestamp,username&mentioned_comment_id=${params.comment_id || ""}`, token);
        break;

      // ===== LIVE MEDIA =====
      case "get_live_media":
        result = await igFetch(`/${igUserId}/live_media?fields=id,media_type,timestamp,media_url,permalink`, token);
        break;

      // ===== PUBLISHING =====
      case "create_photo_post": {
        const container = await igFetch(`/${igUserId}/media`, token, "POST", {
          image_url: params.image_url,
          caption: params.caption || "",
          ...(params.location_id ? { location_id: params.location_id } : {}),
          ...(params.user_tags ? { user_tags: params.user_tags } : {}),
          ...(params.alt_text ? { alt_text: params.alt_text } : {}),
        });
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", {
          creation_id: container.id,
        });
        if (params.post_id) {
          await supabase.from("social_posts").update({ 
            platform_post_id: result.id, status: "published", published_at: new Date().toISOString() 
          }).eq("id", params.post_id);
        }
        break;
      }

      case "create_reel": {
        const container = await igFetch(`/${igUserId}/media`, token, "POST", {
          video_url: params.video_url,
          caption: params.caption || "",
          media_type: "REELS",
          share_to_feed: params.share_to_feed ?? true,
          ...(params.cover_url ? { cover_url: params.cover_url } : {}),
          ...(params.thumb_offset ? { thumb_offset: params.thumb_offset } : {}),
          ...(params.audio_name ? { audio_name: params.audio_name } : {}),
        });
        let status = "IN_PROGRESS";
        let attempts = 0;
        while (status === "IN_PROGRESS" && attempts < 30) {
          await new Promise(r => setTimeout(r, 5000));
          const check = await igFetch(`/${container.id}?fields=status_code`, token);
          status = check.status_code;
          attempts++;
        }
        if (status !== "FINISHED") throw new Error(`Reel processing failed: ${status}`);
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", { creation_id: container.id });
        if (params.post_id) {
          await supabase.from("social_posts").update({ 
            platform_post_id: result.id, status: "published", published_at: new Date().toISOString() 
          }).eq("id", params.post_id);
        }
        break;
      }

      case "create_carousel": {
        const children: string[] = [];
        for (const item of params.items) {
          const child = await igFetch(`/${igUserId}/media`, token, "POST", {
            ...(item.video_url ? { video_url: item.video_url, media_type: "VIDEO" } : { image_url: item.image_url }),
            is_carousel_item: true,
          });
          children.push(child.id);
        }
        const carousel = await igFetch(`/${igUserId}/media`, token, "POST", {
          media_type: "CAROUSEL",
          caption: params.caption || "",
          children: children.join(","),
        });
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", { creation_id: carousel.id });
        if (params.post_id) {
          await supabase.from("social_posts").update({ 
            platform_post_id: result.id, status: "published", published_at: new Date().toISOString() 
          }).eq("id", params.post_id);
        }
        break;
      }

      case "create_story": {
        const storyBody: any = { media_type: "STORIES" };
        if (params.video_url) storyBody.video_url = params.video_url;
        else storyBody.image_url = params.image_url;
        const container = await igFetch(`/${igUserId}/media`, token, "POST", storyBody);
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", { creation_id: container.id });
        break;
      }

      case "check_container_status":
        result = await igFetch(`/${params.container_id}?fields=id,status_code,status`, token);
        break;

      // ===== DELETE MEDIA =====
      case "delete_media":
        result = await igFetch(`/${params.media_id}`, token, "DELETE");
        break;

      // ===== UPDATE MEDIA =====
      case "update_media_caption":
        result = await igFetch(`/${params.media_id}`, token, "POST", {
          caption: params.caption,
        });
        break;

      // ===== COMMENTS =====
      case "get_comments":
        {
          let commentsResult: any = null;
          const usePrivateComments = params?.use_private === true;
          
          if (!usePrivateComments) {
            // Try Graph API first (works for own posts)
            try {
              commentsResult = await igFetch(`/${params.media_id}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}&limit=${params?.limit || 50}`, token);
            } catch (graphErr: any) {
              console.log("Graph API get_comments failed, trying private API:", graphErr.message);
            }
          }
          
          // Fallback to private API for external/discover posts
          if (!commentsResult || usePrivateComments) {
            const metaComments = conn.metadata as any || {};
            const sessionIdComments = metaComments?.ig_session_id;
            if (sessionIdComments) {
              const dsUserIdComments = metaComments?.ig_ds_user_id || conn.platform_user_id;
              const csrfTokenComments = metaComments?.ig_csrf_token;
              const commentsHeaders: Record<string, string> = {
                "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
                "Cookie": `sessionid=${sessionIdComments};${csrfTokenComments ? ` csrftoken=${csrfTokenComments};` : ""}${dsUserIdComments ? ` ds_user_id=${dsUserIdComments};` : ""}`,
                "X-IG-App-ID": "936619743392459",
              };
              const commentsResp = await fetch(`https://i.instagram.com/api/v1/media/${params.media_id}/comments/?can_support_threading=true&min_id=&max_id=&sort_order=popular`, {
                method: "GET",
                headers: commentsHeaders,
              });
              const commentsData = await commentsResp.json();
              if (commentsData?.comments) {
                commentsResult = {
                  data: commentsData.comments.map((c: any) => ({
                    id: String(c.pk || c.id),
                    text: c.text || "",
                    username: c.user?.username || "user",
                    timestamp: c.created_at ? new Date(c.created_at * 1000).toISOString() : new Date().toISOString(),
                    like_count: c.comment_like_count || 0,
                    replies: null,
                  })),
                };
              } else {
                commentsResult = { data: [] };
              }
            } else {
              commentsResult = { data: [] };
            }
          }
          result = commentsResult;
        }
        break;

      case "reply_to_comment":
        result = await igFetch(`/${params.comment_id}/replies`, token, "POST", { message: params.message });
        await supabase.from("social_comment_replies").insert({
          account_id: account_id,
          platform: "instagram",
          post_id: params.media_id || "",
          comment_id: params.comment_id,
          comment_text: params.comment_text || "",
          comment_author: params.comment_author || "",
          reply_text: params.message,
          reply_sent_at: new Date().toISOString(),
          status: "sent",
        });
        break;

      case "post_comment":
        if (!params?.media_id || !params?.message) throw new Error("media_id and message required");
        {
          let commentResult: any = null;
          let commentMethod = "none";
          const metaC = conn.metadata as any || {};
          const sessionIdC = metaC?.ig_session_id;
          const dsUserIdC = metaC?.ig_ds_user_id || conn.platform_user_id;
          const csrfTokenC = metaC?.ig_csrf_token;
          
          // Generate proper UUID v4 for Instagram private API
          const genUUID = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = Math.random() * 16 | 0;
              return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
          };
          
          // STEP 1: Try private API with proper Instagram mobile app format
          if (sessionIdC) {
            commentMethod = "private";
            const commentHeaders: Record<string, string> = {
              "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
              "Cookie": `sessionid=${sessionIdC}; csrftoken=${csrfTokenC || "missing"}; ds_user_id=${dsUserIdC || ""}; mid=${Date.now()}`,
              "X-IG-App-ID": "936619743392459",
              "X-IG-WWW-Claim": "0",
              "Content-Type": "application/x-www-form-urlencoded",
            };
            if (csrfTokenC) commentHeaders["X-CSRFToken"] = csrfTokenC;
            
            // Build proper request body matching Instagram's mobile app
            const deviceUUID = genUUID();
            const idempotenceToken = genUUID();
            const commentBody = new URLSearchParams();
            commentBody.set("comment_text", params.message);
            commentBody.set("idempotence_token", idempotenceToken);
            commentBody.set("_uuid", deviceUUID);
            commentBody.set("_uid", dsUserIdC || "");
            if (csrfTokenC) commentBody.set("_csrftoken", csrfTokenC);
            commentBody.set("containermodule", "comments_v2_feed_timeline");
            commentBody.set("feed_position", "0");
            commentBody.set("carousel_index", "0");
            commentBody.set("is_carousel_bumped_post", "false");
            
            try {
              const commentResp = await fetch(`https://i.instagram.com/api/v1/media/${params.media_id}/comment/`, {
                method: "POST",
                headers: commentHeaders,
                body: commentBody.toString(),
              });
              const commentRespData = await commentResp.json();
              console.log("Private API comment:", commentResp.status, JSON.stringify(commentRespData).slice(0, 500));
              
              if (commentRespData?.comment) {
                commentResult = { id: String(commentRespData.comment.pk), success: true, method: "private", text: commentRespData.comment.text };
              } else if (commentRespData?.status === "ok") {
                commentResult = { id: "posted", success: true, method: "private" };
              } else {
                console.log("Private API comment rejected:", JSON.stringify(commentRespData));
              }
            } catch (privErr: any) {
              console.log("Private API comment exception:", privErr.message);
            }
          }
          
          // STEP 2: If private API failed, try Graph API
          // For Graph API we need the Graph media ID, not the pk
          // If shortcode is provided, resolve it to Graph API media ID via web endpoint
          if (!commentResult) {
            commentMethod = "graph";
            const shortcode = params.shortcode;
            
            if (shortcode) {
              // Try to resolve shortcode → Graph API media ID via Instagram's web API
              try {
                const webHeaders: Record<string, string> = {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                };
                if (sessionIdC) {
                  webHeaders["Cookie"] = `sessionid=${sessionIdC}; csrftoken=${csrfTokenC || ""}; ds_user_id=${dsUserIdC || ""}`;
                }
                const mediaInfoResp = await fetch(`https://i.instagram.com/api/v1/media/${params.media_id}/info/`, {
                  headers: {
                    ...webHeaders,
                    "X-IG-App-ID": "936619743392459",
                  },
                });
                if (mediaInfoResp.ok) {
                  const mediaInfo = await mediaInfoResp.json();
                  const igMediaId = mediaInfo?.items?.[0]?.ig_media_id || mediaInfo?.items?.[0]?.media_id;
                  if (igMediaId) {
                    try {
                      commentResult = await igFetch(`/${igMediaId}/comments`, token, "POST", { message: params.message });
                      commentResult = { ...commentResult, method: "graph", success: true };
                    } catch (graphErr: any) {
                      console.log("Graph API comment with resolved ID failed:", graphErr.message);
                    }
                  }
                }
              } catch (resolveErr: any) {
                console.log("Media ID resolution failed:", resolveErr.message);
              }
            }
            
            // Last resort: try Graph API directly with the pk (sometimes works for own business posts)
            if (!commentResult) {
              try {
                commentResult = await igFetch(`/${params.media_id}/comments`, token, "POST", { message: params.message });
                commentResult = { ...commentResult, method: "graph_direct", success: true };
              } catch (graphErr: any) {
                throw new Error(`Comment failed on all methods. Media: ${params.media_id}. Ensure your IG session cookie is fresh and your account is not restricted.`);
              }
            }
          }
          
          result = commentResult;
          // Track in social_comment_replies for analytics
          try {
            await supabase.from("social_comment_replies").insert({
              account_id: account_id,
              platform: "instagram",
              post_id: params.media_id,
              comment_id: result?.id || "posted",
              comment_text: "",
              comment_author: params.post_author || "discover",
              reply_text: params.message,
              reply_sent_at: new Date().toISOString(),
              status: "sent",
              metadata: { method: commentMethod } as any,
            });
          } catch {}
        }
        break;

      case "like_media":
        if (!params?.media_id) throw new Error("media_id required");
        // Instagram Graph API doesn't have a direct like endpoint for own likes on others' posts
        // Use the private API for liking
        {
          const metadata2 = conn.metadata as any || {};
          const sessionId2 = metadata2?.ig_session_id;
          if (sessionId2) {
            const dsUserId2 = metadata2?.ig_ds_user_id || conn.platform_user_id;
            const csrfToken2 = metadata2?.ig_csrf_token;
            const likeHeaders: Record<string, string> = {
              "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
              "Cookie": `sessionid=${sessionId2};${csrfToken2 ? ` csrftoken=${csrfToken2};` : ""}${dsUserId2 ? ` ds_user_id=${dsUserId2};` : ""}`,
              "X-IG-App-ID": "936619743392459",
              "Content-Type": "application/x-www-form-urlencoded",
            };
            if (csrfToken2) likeHeaders["X-CSRFToken"] = csrfToken2;
            const likeResp = await fetch(`https://i.instagram.com/api/v1/media/${params.media_id}/like/`, {
              method: "POST",
              headers: likeHeaders,
              body: "_uuid=device123&_uid=" + (dsUserId2 || ""),
            });
            result = await likeResp.json();
          } else {
            result = { success: false, error: "Session cookie required for liking posts" };
          }
        }
        break;

      case "follow_user":
        if (!params?.user_id) throw new Error("user_id required");
        {
          const metadata3 = conn.metadata as any || {};
          const sessionId3 = metadata3?.ig_session_id;
          if (sessionId3) {
            const dsUserId3 = metadata3?.ig_ds_user_id || conn.platform_user_id;
            const csrfToken3 = metadata3?.ig_csrf_token;
            const followHeaders: Record<string, string> = {
              "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
              "Cookie": `sessionid=${sessionId3};${csrfToken3 ? ` csrftoken=${csrfToken3};` : ""}${dsUserId3 ? ` ds_user_id=${dsUserId3};` : ""}`,
              "X-IG-App-ID": "936619743392459",
              "Content-Type": "application/x-www-form-urlencoded",
            };
            if (csrfToken3) followHeaders["X-CSRFToken"] = csrfToken3;
            const followResp = await fetch(`https://i.instagram.com/api/v1/friendships/create/${params.user_id}/`, {
              method: "POST",
              headers: followHeaders,
              body: "_uuid=device123&_uid=" + (dsUserId3 || ""),
            });
            result = await followResp.json();
          } else {
            result = { success: false, error: "Session cookie required for following users" };
          }
        }
        break;

      case "delete_comment":
        result = await igFetch(`/${params.comment_id}`, token, "DELETE");
        break;

      case "hide_comment":
        result = await igFetch(`/${params.comment_id}`, token, "POST", { hide: true });
        break;

      case "unhide_comment":
        result = await igFetch(`/${params.comment_id}`, token, "POST", { hide: false });
        break;

      case "enable_comments":
        result = await igFetch(`/${params.media_id}`, token, "POST", { comment_enabled: true });
        break;

      case "disable_comments":
        result = await igFetch(`/${params.media_id}`, token, "POST", { comment_enabled: false });
        break;

      // ===== INSIGHTS =====
      case "get_account_insights": {
        const period = params?.period || "day";
        const since = params?.since ? `&since=${params.since}` : "";
        const until = params?.until ? `&until=${params.until}` : "";
        const dayMetrics = "reach,follower_count,profile_views,website_clicks,accounts_engaged,total_interactions,likes,comments,shares,saves,replies";
        const weekMetrics = "reach,follower_count,profile_views,website_clicks,accounts_engaged,total_interactions,likes,comments,shares,saves,replies";
        const monthMetrics = "reach,follower_count,profile_views,website_clicks,accounts_engaged,total_interactions,likes,comments,shares,saves,replies";
        const metrics = period === "day" ? dayMetrics : period === "week" ? weekMetrics : monthMetrics;
        result = await igFetch(`/${igUserId}/insights?metric=${metrics}&period=${period}${since}${until}`, token);
        if (result.data) {
          for (const metric of result.data) {
            const latestValue = metric.values?.[metric.values.length - 1];
            if (latestValue) {
              await supabase.from("social_analytics").upsert({
                account_id: account_id,
                platform: "instagram",
                metric_type: metric.name,
                metric_value: latestValue.value,
                period_start: latestValue.end_time,
                raw_data: metric,
                fetched_at: new Date().toISOString(),
              }, { onConflict: "account_id,platform,metric_type" }).select();
            }
          }
        }
        break;
      }

      case "get_account_insights_demographics":
        result = await igFetch(`/${igUserId}/insights?metric=follower_demographics,reached_audience_demographics,engaged_audience_demographics&period=lifetime&metric_type=total_value&timeframe=last_90_days`, token);
        break;

      case "get_account_insights_online_followers":
        result = await igFetch(`/${igUserId}/insights?metric=online_followers&period=lifetime`, token);
        break;

      case "get_media_insights":
        result = await igFetch(`/${params.media_id}/insights?metric=reach,likes,comments,shares,saves,total_interactions`, token);
        break;

      case "get_reel_insights":
        result = await igFetch(`/${params.media_id}/insights?metric=clips_replays_count,ig_reels_aggregated_all_plays_count,ig_reels_avg_watch_time,ig_reels_video_view_total_time,likes,comments,shares,saves,reach,total_interactions`, token);
        break;

      case "get_story_insights":
        result = await igFetch(`/${params.media_id}/insights?metric=exits,impressions,reach,replies,taps_forward,taps_back`, token);
        break;

      // ===== STORIES =====
      case "get_stories":
        result = await igFetch(`/${igUserId}/stories?fields=id,media_type,media_url,timestamp,permalink`, token);
        break;

      case "get_story_highlights": {
        const pageInfo = await getPageId(token, igUserId);
        if (pageInfo) {
          try {
            const highlightsResp = await fbFetch(`/${igUserId}?fields=story_highlights{id,title,media_type,media_url,thumbnail_url,timestamp,permalink,cover_media}`, token);
            result = highlightsResp;
          } catch {
            result = await igFetch(`/${igUserId}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp,permalink`, token);
          }
        } else {
          result = await igFetch(`/${igUserId}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp,permalink`, token);
        }
        break;
      }

      // ===== CONTENT INTERACTION =====
      case "like_comment":
        result = await igFetch(`/${params.comment_id}/likes`, token, "POST");
        break;

      case "unlike_comment":
        result = await igFetch(`/${params.comment_id}/likes`, token, "DELETE");
        break;

      case "get_media_children":
        result = await igFetch(`/${params.media_id}/children?fields=id,media_type,media_url,thumbnail_url,timestamp`, token);
        break;

      // ===== HASHTAG SEARCH =====
      case "search_hashtag":
        result = await igFetch(`/ig_hashtag_search?q=${encodeURIComponent(params.hashtag)}&user_id=${igUserId}`, token, "GET", undefined, true);
        break;

      case "get_hashtag_top_media":
        result = await igFetch(`/${params.hashtag_id}/top_media?user_id=${igUserId}&fields=id,caption,media_type,like_count,comments_count,permalink,timestamp`, token, "GET", undefined, true);
        break;

      case "get_hashtag_recent_media":
        result = await igFetch(`/${params.hashtag_id}/recent_media?user_id=${igUserId}&fields=id,caption,media_type,like_count,comments_count,permalink,timestamp`, token, "GET", undefined, true);
        break;

      // ===== BUSINESS DISCOVERY (requires Business/Creator account) =====
      case "discover_user":
        try {
          result = await igFetch(`/${igUserId}?fields=business_discovery.fields(id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,media.limit(${params?.media_limit || 12}){id,caption,media_type,like_count,comments_count,permalink,timestamp})&username=${params.username}`, token);
        } catch (bdErr: any) {
          console.log("business_discovery not available, using fallback:", bdErr.message);
          result = { error_fallback: true, message: "business_discovery requires a Business or Creator Instagram account. Your account type may not support this feature.", username: params.username };
        }
        break;

      case "discover_user_media":
        try {
          result = await igFetch(`/${igUserId}?fields=business_discovery.fields(media.limit(${params?.limit || 25}).after(${params?.after || ""}){id,caption,media_type,like_count,comments_count,permalink,timestamp,media_url})&username=${params.username}`, token);
        } catch (bdErr2: any) {
          console.log("business_discovery media not available:", bdErr2.message);
          result = { error_fallback: true, message: "business_discovery requires a Business or Creator Instagram account.", username: params.username };
        }
        break;

      // ===== CONVERSATIONS (DM Inbox) =====
      case "get_conversations": {
        const limit = params?.limit || 20;
        const folder = params?.folder || "";
        const richFields = `id,participants,messages.limit(${params?.messages_limit || 5}){id,message,from,to,created_time,attachments,shares,story,sticker},updated_time`;
        
        let realUserId = igUserId;
        try {
          const meResp = await fetch(`${IG_GRAPH_URL}/me?fields=id&access_token=${token}`);
          const meData = await meResp.json();
          if (meData?.id && meData.id !== igUserId) {
            console.log(`ID mismatch: stored=${igUserId}, real=${meData.id} — using real ID`);
            realUserId = meData.id;
            await supabase.from("social_connections").update({ platform_user_id: realUserId }).eq("account_id", account_id).eq("platform", "instagram");
          }
        } catch {}
        
        const fetchWithPagination = async (url: string, maxPages = 10): Promise<any[]> => {
          const allData: any[] = [];
          let currentUrl: string | null = url;
          let page = 0;
          while (currentUrl && page < maxPages) {
            page++;
            try {
              const resp = await fetch(currentUrl);
              const json = await resp.json();
              console.log(`Page ${page}: ${json?.data?.length || 0} items, has_next: ${!!json?.paging?.next}`);
              if (json?.error) { console.log(`API error:`, json.error.message); break; }
              if (json?.data?.length > 0) allData.push(...json.data);
              currentUrl = json?.paging?.next || null;
              if (!json?.data?.length && !json?.paging?.next) break;
            } catch (e: any) { console.log(`Page ${page} error:`, e.message); break; }
          }
          return allData;
        };
        
        const endpoints = [
          `${IG_GRAPH_URL}/me/conversations?platform=instagram&limit=${limit}&fields=${richFields}&access_token=${token}`,
          `${IG_GRAPH_URL}/${realUserId}/conversations?platform=instagram&limit=${limit}&fields=${richFields}&access_token=${token}`,
        ];
        
        let allConvos: any[] = [];
        for (const ep of endpoints) {
          let url = ep;
          if (folder) url += `&folder=${folder}`;
          console.log("Trying:", url.split("access_token")[0]);
          allConvos = await fetchWithPagination(url);
          if (allConvos.length > 0) break;
          
          const simpleUrl = url.replace(richFields, "id,updated_time,participants");
          console.log("Retrying simple fields...");
          allConvos = await fetchWithPagination(simpleUrl);
          if (allConvos.length > 0) break;
        }
        
        console.log(`Total conversations fetched: ${allConvos.length}`);
        result = { data: allConvos, paging: null };
        break;
      }

      case "get_all_conversations": {
        const allLimit = params?.limit || 50;
        const msgLimit = params?.messages_limit || 10;
        const richFields = `id,participants,messages.limit(${msgLimit}){id,message,from,to,created_time,attachments,shares,story,sticker},updated_time`;
        
        let realUserId = igUserId;
        try {
          const meResp = await fetch(`${IG_GRAPH_URL}/me?fields=id&access_token=${token}`);
          const meData = await meResp.json();
          if (meData?.id && meData.id !== igUserId) {
            console.log(`ID update: ${igUserId} → ${meData.id}`);
            realUserId = meData.id;
            await supabase.from("social_connections").update({ platform_user_id: realUserId }).eq("account_id", account_id).eq("platform", "instagram");
          }
        } catch {}
        
        const fetchWithPagination = async (startUrl: string, maxPages = 10): Promise<any[]> => {
          const allData: any[] = [];
          let currentUrl: string | null = startUrl;
          let page = 0;
          while (currentUrl && page < maxPages) {
            page++;
            try {
              const resp = await fetch(currentUrl);
              const json = await resp.json();
              if (json?.error) { console.log(`Error page ${page}:`, json.error.message); break; }
              if (json?.data?.length > 0) allData.push(...json.data);
              currentUrl = json?.paging?.next || null;
              if (!json?.data?.length && !json?.paging?.next) break;
            } catch (e: any) { console.log(`Page ${page} error:`, e.message); break; }
          }
          return allData;
        };
        
        const fetchFolder = async (folderName: string): Promise<any[]> => {
          for (const base of [`${IG_GRAPH_URL}/me`, `${IG_GRAPH_URL}/${realUserId}`]) {
            let url = `${base}/conversations?platform=instagram&limit=${allLimit}&fields=${richFields}&access_token=${token}&folder=${folderName}`;
            
            let convos = await fetchWithPagination(url);
            if (convos.length > 0) return convos;
            
            let simpleUrl = `${base}/conversations?platform=instagram&limit=${allLimit}&fields=id,updated_time,participants&access_token=${token}&folder=${folderName}`;
            convos = await fetchWithPagination(simpleUrl);
            if (convos.length > 0) return convos;
          }
          return [];
        };
        
        const [primary, general, requests] = await Promise.all([
          fetchFolder("inbox"),
          fetchFolder("general"),
          fetchFolder("other"),
        ]);
        
        const total = primary.length + general.length + requests.length;
        console.log(`Found ${total} conversations total`);
        
        result = { primary, general, requests, total };
        break;
      }

      case "fetch_participant_profiles": {
        const userIds: string[] = params?.user_ids || [];
        if (userIds.length === 0) throw new Error("user_ids array required");
        
        const profiles: Record<string, { name?: string; profile_pic?: string; username?: string }> = {};
        
        const pageInfo = await getPageId(token, igUserId);
        const lookupToken = pageInfo?.pageToken || token;
        console.log(`Fetching profiles for ${userIds.length} users, pageToken available: ${!!pageInfo}`);
        
        const batchSize = 5;
        for (let i = 0; i < Math.min(userIds.length, 50); i += batchSize) {
          const batch = userIds.slice(i, i + batchSize);
          await Promise.all(batch.map(async (uid) => {
            try {
              const resp = await fetch(`${FB_GRAPH_URL}/${uid}?fields=name,profile_pic,username&access_token=${lookupToken}`);
              const data = await resp.json();
              if (!data.error && (data.profile_pic || data.name)) {
                profiles[uid] = { name: data.name, profile_pic: data.profile_pic, username: data.username };
                return;
              }
            } catch {}
            
            try {
              const resp2 = await fetch(`${IG_GRAPH_URL}/${uid}?fields=name,username,profile_picture_url&access_token=${token}`);
              const data2 = await resp2.json();
              if (!data2.error && (data2.profile_picture_url || data2.name)) {
                profiles[uid] = { name: data2.name, profile_pic: data2.profile_picture_url, username: data2.username };
                return;
              }
            } catch {}
            
            const convoUsername = params?.usernames?.[uid];
            if (convoUsername) {
              try {
                const resp3 = await fetch(`${IG_GRAPH_URL}/${igUserId}?fields=business_discovery.fields(profile_picture_url,name,username){username=${convoUsername}}&access_token=${token}`);
                const data3 = await resp3.json();
                const bd = data3?.business_discovery;
                if (bd?.profile_picture_url) {
                  profiles[uid] = { name: bd.name, profile_pic: bd.profile_picture_url, username: bd.username };
                }
              } catch {}
            }
          }));
        }
        
        console.log(`Fetched ${Object.keys(profiles).length}/${userIds.length} profiles`);
        result = { profiles, fetched: Object.keys(profiles).length, total: userIds.length };
        break;
      }

      case "debug_conversations": {
        let realId = igUserId;
        try {
          const meResp = await fetch(`${IG_GRAPH_URL}/me?fields=id,user_id,username&access_token=${token}`);
          const meData = await meResp.json();
          realId = meData?.id || igUserId;
        } catch {}
        
        const debugResults: any = { stored_ig_user_id: igUserId, resolved_id: realId, attempts: [] };
        
        try {
          const r1 = await fetch(`${IG_GRAPH_URL}/me/conversations?platform=instagram&limit=5&access_token=${token}`);
          const d1 = await r1.json();
          debugResults.attempts.push({ method: "/me/conversations", status: r1.status, response: d1 });
        } catch (e: any) { debugResults.attempts.push({ method: "/me/conversations", error: e.message }); }
        
        try {
          const r2 = await fetch(`${IG_GRAPH_URL}/${realId}/conversations?platform=instagram&limit=5&access_token=${token}`);
          const d2 = await r2.json();
          debugResults.attempts.push({ method: `/${realId}/conversations`, status: r2.status, response: d2 });
        } catch (e: any) { debugResults.attempts.push({ method: `/${realId}/conversations`, error: e.message }); }
        
        const permChecks: any = {};
        try {
          const msgTest = await fetch(`${IG_GRAPH_URL}/me?fields=id,username&access_token=${token}`);
          permChecks.me = await msgTest.json();
        } catch {}
        
        try {
          const r4 = await fetch(`${IG_GRAPH_URL}/${realId}/conversations?limit=5&access_token=${token}`);
          const d4 = await r4.json();
          debugResults.attempts.push({ method: `/${realId}/conversations (no platform)`, status: r4.status, response: d4 });
        } catch (e: any) { debugResults.attempts.push({ method: "no platform", error: e.message }); }
        
        if (debugResults.attempts[0]?.response?.paging?.next) {
          try {
            const nextUrl = debugResults.attempts[0].response.paging.next;
            const r5 = await fetch(nextUrl);
            const d5 = await r5.json();
            debugResults.attempts.push({ method: "page 2 of /me/conversations", response: d5 });
            
            if (d5?.paging?.next) {
              const r6 = await fetch(d5.paging.next);
              const d6 = await r6.json();
              debugResults.attempts.push({ method: "page 3 of /me/conversations", response: d6 });
            }
          } catch {}
        }
        
        debugResults.perm_checks = permChecks;
        debugResults.token_prefix = token.substring(0, 10) + "...";
        debugResults.recommendation = "If all conversations return empty data, your token needs the instagram_business_manage_messages permission.";
        
        result = debugResults;
        break;
      }

      case "get_conversation_messages": {
        if (!params?.conversation_id) throw new Error("conversation_id required");
        const msgLimit = params?.limit || 20;
        try {
          result = await igFetch(`/${params.conversation_id}?fields=messages.limit(${msgLimit}){id,message,from,to,created_time,attachments,shares,story,sticker}`, token);
        } catch (convErr: any) {
          console.error("get_conversation_messages error:", convErr.message);
          result = { error_fallback: true, message: convErr.message, conversation_id: params.conversation_id, data: { messages: { data: [] } } };
        }
        break;
      }

      // ===== MESSAGING =====
      case "send_message": {
        const pageInfo = await getPageId(token, igUserId);
        const msgBody: any = {
          recipient: { id: params.recipient_id },
          message: { text: params.message },
        };
        // Note: IG Messaging API does not support reply_to in message param
        if (pageInfo) {
          result = await igFetch(`/${pageInfo.pageId}/messages`, pageInfo.pageToken, "POST", msgBody);
        } else {
          console.log("No FB Page found, trying direct IG messaging via /me/messages");
          try {
            result = await igFetch(`/me/messages`, token, "POST", msgBody);
          } catch (e1: any) {
            console.log("Direct /me/messages failed, trying /{igUserId}/messages:", e1.message);
            result = await igFetch(`/${igUserId}/messages`, token, "POST", msgBody);
          }
        }
        break;
      }

      case "send_media_message": {
        const pageInfo2 = await getPageId(token, igUserId);
        if (pageInfo2) {
          result = await igFetch(`/${pageInfo2.pageId}/messages`, pageInfo2.pageToken, "POST", {
            recipient: { id: params.recipient_id },
            message: { attachment: { type: params.media_type || "image", payload: { url: params.media_url } } },
          });
        } else {
          try {
            result = await igFetch(`/me/messages`, token, "POST", {
              recipient: { id: params.recipient_id },
              message: { attachment: { type: params.media_type || "image", payload: { url: params.media_url } } },
            });
          } catch {
            result = await igFetch(`/${igUserId}/messages`, token, "POST", {
              recipient: { id: params.recipient_id },
              message: { attachment: { type: params.media_type || "image", payload: { url: params.media_url } } },
            });
          }
        }
        break;
      }

      case "send_reaction": {
        // Instagram API requires emoji characters for reactions, not text labels
        const reactionMap: Record<string, string> = {
          "love": "\u2764\uFE0F", "heart": "\u2764\uFE0F", "❤️": "\u2764\uFE0F",
          "laugh": "\uD83D\uDE02", "haha": "\uD83D\uDE02",
          "wow": "\uD83D\uDE2E", "surprised": "\uD83D\uDE2E",
          "sad": "\uD83D\uDE22", "cry": "\uD83D\uDE22",
          "angry": "\uD83D\uDE20",
          "like": "\uD83D\uDC4D", "thumbsup": "\uD83D\uDC4D",
          "fire": "\uD83D\uDD25",
        };
        const rawReaction = params.reaction || "love";
        const emojiReaction = reactionMap[rawReaction] || rawReaction;
        
        const pageInfoR = await getPageId(token, igUserId);
        const reactBody = {
          recipient: { id: params.recipient_id },
          sender_action: "react",
          payload: { message_id: params.message_id, reaction: emojiReaction },
        };
        console.log("Sending reaction:", JSON.stringify(reactBody));
        const reactToken = pageInfoR?.pageToken || token;
        const reactEndpoint = pageInfoR ? `/${pageInfoR.pageId}/messages` : `/me/messages`;
        try {
          result = await igFetch(reactEndpoint, reactToken, "POST", reactBody);
        } catch (e1: any) {
          console.log("React failed, trying fallback:", e1.message);
          try {
            result = await igFetch(`/me/messages`, token, "POST", reactBody);
          } catch {
            result = { success: false, note: "Reaction API not supported for this conversation" };
          }
        }
        console.log("Reaction result:", JSON.stringify(result));
        break;
      }

      case "remove_reaction": {
        const pageInfoRR = await getPageId(token, igUserId);
        const unreactBody = {
          recipient: { id: params.recipient_id },
          sender_action: "unreact",
          payload: { message_id: params.message_id },
        };
        if (pageInfoRR) {
          result = await igFetch(`/${pageInfoRR.pageId}/messages`, pageInfoRR.pageToken, "POST", unreactBody);
        } else {
          try {
            result = await igFetch(`/me/messages`, token, "POST", unreactBody);
          } catch {
            result = await igFetch(`/${igUserId}/messages`, token, "POST", unreactBody);
          }
        }
        break;
      }

      case "delete_message": {
        if (!params?.message_id) throw new Error("message_id required");
        
        let deleteSuccess = false;
        const pageInfoDel = await getPageId(token, igUserId);
        const delToken = pageInfoDel?.pageToken || token;
        
        try {
          const unsendResp = await fetch(`${FB_GRAPH_URL}/${params.message_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: delToken, action: "unsend" }),
          });
          const unsendData = await unsendResp.json();
          console.log("Unsend result:", JSON.stringify(unsendData));
          if (!unsendData.error) {
            result = { success: true, method: "unsend", data: unsendData };
            deleteSuccess = true;
          } else {
            console.log("Unsend failed:", unsendData.error.message);
          }
        } catch (e: any) {
          console.log("Unsend error:", e.message);
        }
        
        if (!deleteSuccess) {
          try {
            const delResp = await fetch(`${FB_GRAPH_URL}/${params.message_id}?access_token=${delToken}`, { method: "DELETE" });
            const delData = await delResp.json();
            console.log("DELETE result:", JSON.stringify(delData));
            if (!delData.error) {
              result = { success: true, method: "delete", data: delData };
              deleteSuccess = true;
            } else {
              console.log("DELETE failed:", delData.error.message);
            }
          } catch (e: any) {
            console.log("DELETE error:", e.message);
          }
        }
        
        if (!deleteSuccess && pageInfoDel) {
          try {
            const delResp3 = await fetch(`${FB_GRAPH_URL}/${params.message_id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ access_token: token, action: "unsend" }),
            });
            const delData3 = await delResp3.json();
            console.log("Direct unsend result:", JSON.stringify(delData3));
            if (!delData3.error) {
              result = { success: true, method: "direct_unsend", data: delData3 };
              deleteSuccess = true;
            }
          } catch {}
        }
        
        if (!deleteSuccess) {
          result = { success: false, error: "Message deletion not supported by Instagram for this message type. The message has been removed from your dashboard." };
        }
        
        console.log("Delete message final result:", JSON.stringify(result));
        break;
      }

      // ===== HUMAN AGENT TAG =====
      case "send_human_agent_message":
        result = await igFetch(`/${igUserId}/messages`, token, "POST", {
          recipient: { id: params.recipient_id },
          message: { text: params.message },
          messaging_type: "MESSAGE_TAG",
          tag: "HUMAN_AGENT",
        });
        break;

      // ===== CONTENT PUBLISHING STATUS =====
      case "get_content_publishing_limit":
        result = await igFetch(`/${igUserId}/content_publishing_limit?fields=config,quota_usage`, token);
        break;

      // ===== PRODUCT TAGS (Shopping) =====
      case "get_product_catalog":
        result = await igFetch(`/${igUserId}/catalog_product_search?q=${encodeURIComponent(params.query || "")}&catalog_id=${params.catalog_id}`, token);
        break;

      case "get_product_tags":
        result = await igFetch(`/${params.media_id}?fields=product_tags`, token);
        break;

      case "tag_products":
        result = await igFetch(`/${params.media_id}`, token, "POST", {
          product_tags: params.product_tags,
        });
        break;

      case "get_available_catalogs":
        result = await igFetch(`/${igUserId}/available_catalogs?fields=id,name,product_count`, token);
        break;

      case "appeal_product_rejection":
        result = await igFetch(`/${params.media_id}/product_appeal`, token, "POST", {
          appeal_reason: params.reason,
        });
        break;

      // ===== UPCOMING EVENTS =====
      case "get_upcoming_events":
        result = await igFetch(`/${igUserId}/upcoming_events?fields=id,title,start_time,end_time,event_url,cover_media_url,description`, token);
        break;

      case "create_upcoming_event":
        result = await igFetch(`/${igUserId}/upcoming_events`, token, "POST", {
          title: params.title,
          start_time: params.start_time,
          ...(params.end_time ? { end_time: params.end_time } : {}),
          ...(params.event_url ? { event_url: params.event_url } : {}),
          ...(params.cover_media_url ? { cover_media_url: params.cover_media_url } : {}),
          ...(params.description ? { description: params.description } : {}),
        });
        break;

      case "delete_upcoming_event":
        result = await igFetch(`/${params.event_id}`, token, "DELETE");
        break;

      // ===== BRANDED CONTENT =====
      case "get_branded_content_ad_permissions": {
        result = await igFetch(`/${igUserId}?fields=branded_content_ad_permissions`, token);
        break;
      }

      case "get_approved_creators":
        result = await igFetch(`/${igUserId}/branded_content_ad_permissions?fields=id,username`, token);
        break;

      case "add_approved_creator":
        result = await igFetch(`/${igUserId}/branded_content_ad_permissions`, token, "POST", {
          creator_instagram_account: params.creator_id,
        });
        break;

      case "remove_approved_creator":
        result = await igFetch(`/${igUserId}/branded_content_ad_permissions`, token, "DELETE", {
          creator_instagram_account: params.creator_id,
        });
        break;

      case "get_branded_content_posts":
        result = await igFetch(`/${igUserId}/branded_content_ad_permissions?fields=permission_type,partner{id,username,name,profile_picture_url}`, token);
        break;

      // ===== CREATOR MARKETPLACE DISCOVERY =====
      case "discover_creators": {
        const creators: any[] = [];
        const usernames = params.usernames || [];
        for (const username of usernames.slice(0, 10)) {
          try {
            const d = await igFetch(`/${igUserId}?fields=business_discovery.fields(id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,media.limit(6){id,caption,media_type,like_count,comments_count,permalink,timestamp})&username=${username}`, token);
            if (d?.business_discovery) {
              const bd = d.business_discovery;
              const engRate = bd.media?.data?.length > 0
                ? bd.media.data.reduce((s: number, m: any) => s + (m.like_count || 0) + (m.comments_count || 0), 0) / bd.media.data.length / Math.max(bd.followers_count, 1) * 100
                : 0;
              creators.push({ ...bd, engagement_rate: Math.round(engRate * 100) / 100 });
            }
          } catch (e: any) {
            creators.push({ username, error: e.message });
          }
        }
        result = { creators, total: creators.filter(c => !c.error).length };
        break;
      }

      // ===== ADS MANAGEMENT (Facebook Marketing API) =====
      case "get_ad_accounts": {
        result = await fbFetch(`/me/adaccounts?fields=id,name,account_id,account_status,currency,timezone_name,amount_spent,balance,business_name,business_street,daily_spend_limit,spend_cap&limit=25`, token);
        break;
      }

      case "get_ad_campaigns": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        const fields = "id,name,objective,status,effective_status,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time,buying_type,special_ad_categories";
        result = await fbFetch(`/${params.ad_account_id}/campaigns?fields=${fields}&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_ad_sets": {
        if (!params?.campaign_id && !params?.ad_account_id) throw new Error("campaign_id or ad_account_id required");
        const endpoint = params.campaign_id ? `/${params.campaign_id}/adsets` : `/${params.ad_account_id}/adsets`;
        const fields = "id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time,created_time";
        result = await fbFetch(`${endpoint}?fields=${fields}&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_ads": {
        if (!params?.ad_set_id && !params?.ad_account_id) throw new Error("ad_set_id or ad_account_id required");
        const endpoint = params.ad_set_id ? `/${params.ad_set_id}/ads` : `/${params.ad_account_id}/ads`;
        const fields = "id,name,status,effective_status,creative{id,title,body,image_url,thumbnail_url,object_story_spec},created_time,updated_time";
        result = await fbFetch(`${endpoint}?fields=${fields}&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_ad_insights": {
        if (!params?.object_id) throw new Error("object_id required (campaign, adset, or ad id)");
        const metrics = params?.metrics || "impressions,reach,spend,clicks,cpc,cpm,ctr,actions,cost_per_action_type,frequency,social_spend";
        const datePreset = params?.date_preset || "last_30d";
        let url = `/${params.object_id}/insights?fields=${metrics}&date_preset=${datePreset}`;
        if (params?.time_increment) url += `&time_increment=${params.time_increment}`;
        if (params?.breakdowns) url += `&breakdowns=${params.breakdowns}`;
        result = await fbFetch(url, token);
        break;
      }

      case "get_ad_account_insights": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        const metrics = params?.metrics || "impressions,reach,spend,clicks,cpc,cpm,ctr,actions,cost_per_action_type,frequency";
        const datePreset = params?.date_preset || "last_30d";
        let url = `/${params.ad_account_id}/insights?fields=${metrics}&date_preset=${datePreset}`;
        if (params?.time_increment) url += `&time_increment=${params.time_increment}`;
        result = await fbFetch(url, token);
        break;
      }

      case "create_ad_campaign": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        result = await fbFetch(`/${params.ad_account_id}/campaigns`, token, "POST", {
          name: params.name,
          objective: params.objective || "OUTCOME_TRAFFIC",
          status: params.status || "PAUSED",
          special_ad_categories: params.special_ad_categories || [],
          ...(params.daily_budget ? { daily_budget: params.daily_budget } : {}),
          ...(params.lifetime_budget ? { lifetime_budget: params.lifetime_budget } : {}),
          ...(params.buying_type ? { buying_type: params.buying_type } : {}),
        });
        break;
      }

      case "create_ad_set": {
        if (!params?.ad_account_id || !params?.campaign_id) throw new Error("ad_account_id and campaign_id required");
        result = await fbFetch(`/${params.ad_account_id}/adsets`, token, "POST", {
          name: params.name,
          campaign_id: params.campaign_id,
          daily_budget: params.daily_budget || 1000,
          billing_event: params.billing_event || "IMPRESSIONS",
          optimization_goal: params.optimization_goal || "LINK_CLICKS",
          bid_amount: params.bid_amount || undefined,
          targeting: params.targeting || { geo_locations: { countries: ["US"] }, age_min: 18, age_max: 65 },
          status: params.status || "PAUSED",
          start_time: params.start_time || undefined,
          end_time: params.end_time || undefined,
          promoted_object: params.promoted_object || undefined,
        });
        break;
      }

      case "create_ad": {
        if (!params?.ad_account_id || !params?.adset_id) throw new Error("ad_account_id and adset_id required");
        let creativeId = params.creative_id;
        if (!creativeId && params.creative) {
          const creative = await fbFetch(`/${params.ad_account_id}/adcreatives`, token, "POST", {
            name: params.creative.name || params.name,
            object_story_spec: {
              page_id: params.creative.page_id,
              instagram_actor_id: igUserId,
              ...(params.creative.link_data ? {
                link_data: {
                  message: params.creative.message || "",
                  link: params.creative.link || "",
                  image_hash: params.creative.image_hash || undefined,
                  picture: params.creative.picture || undefined,
                  call_to_action: params.creative.cta ? { type: params.creative.cta, value: { link: params.creative.link } } : undefined,
                },
              } : {}),
              ...(params.creative.video_data ? {
                video_data: {
                  video_id: params.creative.video_id,
                  message: params.creative.message || "",
                  title: params.creative.title || "",
                  call_to_action: params.creative.cta ? { type: params.creative.cta, value: { link: params.creative.link } } : undefined,
                },
              } : {}),
            },
          });
          creativeId = creative.id;
        }
        result = await fbFetch(`/${params.ad_account_id}/ads`, token, "POST", {
          name: params.name,
          adset_id: params.adset_id,
          creative: { creative_id: creativeId },
          status: params.status || "PAUSED",
        });
        break;
      }

      case "update_campaign_status": {
        result = await fbFetch(`/${params.campaign_id}`, token, "POST", {
          status: params.status,
        });
        break;
      }

      case "update_adset_status": {
        result = await fbFetch(`/${params.adset_id}`, token, "POST", {
          status: params.status,
        });
        break;
      }

      case "update_ad_status": {
        result = await fbFetch(`/${params.ad_id}`, token, "POST", {
          status: params.status,
        });
        break;
      }

      case "delete_campaign":
        result = await fbFetch(`/${params.campaign_id}`, token, "DELETE");
        break;

      case "get_ad_creatives": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        result = await fbFetch(`/${params.ad_account_id}/adcreatives?fields=id,name,title,body,image_url,thumbnail_url,object_story_spec,effective_object_story_id&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_ad_images": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        result = await fbFetch(`/${params.ad_account_id}/adimages?fields=id,name,hash,url,url_128,created_time&limit=50`, token);
        break;
      }

      case "upload_ad_image": {
        if (!params?.ad_account_id || !params?.image_url) throw new Error("ad_account_id and image_url required");
        result = await fbFetch(`/${params.ad_account_id}/adimages`, token, "POST", {
          url: params.image_url,
        });
        break;
      }

      case "get_targeting_options": {
        const searchType = params?.type || "adinterest";
        const q = encodeURIComponent(params?.query || "");
        result = await fbFetch(`/search?type=${searchType}&q=${q}&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_reach_estimate": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        const targeting = encodeURIComponent(JSON.stringify(params.targeting || {}));
        result = await fbFetch(`/${params.ad_account_id}/reachestimate?targeting_spec=${targeting}&optimize_for=IMPRESSIONS`, token);
        break;
      }

      // ===== BUSINESS MANAGEMENT =====
      case "get_business_accounts": {
        result = await fbFetch(`/me/businesses?fields=id,name,created_time,profile_picture_uri,link,verification_status,permitted_tasks`, token);
        break;
      }

      case "get_business_pages": {
        if (!params?.business_id) throw new Error("business_id required");
        result = await fbFetch(`/${params.business_id}/owned_pages?fields=id,name,fan_count,picture,link,instagram_business_account{id,username}`, token);
        break;
      }

      case "get_business_ad_accounts": {
        if (!params?.business_id) throw new Error("business_id required");
        result = await fbFetch(`/${params.business_id}/owned_ad_accounts?fields=id,name,account_id,account_status,currency,amount_spent,balance`, token);
        break;
      }

      case "get_business_instagram_accounts": {
        if (!params?.business_id) throw new Error("business_id required");
        result = await fbFetch(`/${params.business_id}/instagram_accounts?fields=id,username,name,profile_pic,followers_count,follows_count,media_count`, token);
        break;
      }

      // ===== PAGE ENGAGEMENT =====
      case "get_page_posts": {
        const pageInfo = await getPageId(token, igUserId);
        if (!pageInfo) throw new Error("No linked Facebook Page found");
        result = await fbFetch(`/${pageInfo.pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,reactions.summary(true),comments.summary(true)&limit=${params?.limit || 25}`, pageInfo.pageToken);
        break;
      }

      case "get_page_insights": {
        const pageInfo = await getPageId(token, igUserId);
        if (!pageInfo) throw new Error("No linked Facebook Page found");
        const metrics = params?.metrics || "page_impressions,page_engaged_users,page_fans,page_fan_adds,page_views_total";
        result = await fbFetch(`/${pageInfo.pageId}/insights?metric=${metrics}&period=${params?.period || "day"}`, pageInfo.pageToken);
        break;
      }

      case "get_page_followers": {
        const pageInfo = await getPageId(token, igUserId);
        if (!pageInfo) throw new Error("No linked Facebook Page found");
        result = await fbFetch(`/${pageInfo.pageId}?fields=fan_count,followers_count,new_like_count,talking_about_count`, pageInfo.pageToken);
        break;
      }

      // ===== FOLLOWERS / FOLLOWING =====
      case "get_followers_list": {
        let followers: any[] = [];
        const seen = new Set<string>();
        const maxLimit = params?.limit || 500;
        const sourceFilter = params?.source_filter || "all";
        
        if (sourceFilter === "all" || sourceFilter === "conversation") {
          const { data: dbConvos } = await supabase
            .from("ai_dm_conversations")
            .select("participant_id, participant_name, participant_username, participant_avatar_url")
            .eq("account_id", account_id)
            .order("last_message_at", { ascending: false })
            .limit(maxLimit);
          
          for (const c of (dbConvos || [])) {
            if (!c.participant_id || seen.has(c.participant_id)) continue;
            seen.add(c.participant_id);
            followers.push({
              id: c.participant_id,
              name: c.participant_name || c.participant_username || c.participant_id?.substring(0, 8),
              username: c.participant_username || c.participant_id,
              profile_pic: c.participant_avatar_url || null,
              source: "conversation",
            });
          }
        }

        if (sourceFilter === "all" || sourceFilter === "conversation") {
          try {
            let nextUrl: string | null = `/${igUserId}/conversations?fields=participants,id,updated_time&limit=100&platform=instagram`;
            let pages = 0;
            const maxPages = 5;

            while (nextUrl && pages < maxPages && followers.length < maxLimit) {
              const convosResp = await igFetch(nextUrl, token);
              for (const convo of (convosResp?.data || [])) {
                for (const p of (convo?.participants?.data || [])) {
                  if (p.id === igUserId || seen.has(p.id)) continue;
                  seen.add(p.id);
                  const pName = p.name && p.name !== p.id ? p.name : null;
                  followers.push({
                    id: p.id,
                    name: pName || p.username || p.id?.substring(0, 8),
                    username: p.username || pName?.toLowerCase().replace(/\s+/g, '') || p.id,
                    profile_pic: p.profile_pic || null,
                    source: "ig_api",
                  });
                }
              }
              nextUrl = convosResp?.paging?.next ? convosResp.paging.next : null;
              pages++;
            }
            console.log(`Fetched ${pages} pages of IG conversations, total contacts: ${followers.length}`);
          } catch (e: any) {
            console.log("IG conversations API pagination failed:", e.message);
          }
        }

        if (sourceFilter === "all" || sourceFilter === "follower") {
          try {
            const pageInfo = await getPageId(token, igUserId!);
            if (pageInfo) {
              const mediaResp = await igFetch(`/${igUserId}/media?fields=id,comments.limit(50){from{id,username,profile_picture_url}},likes.limit(50)&limit=20`, token);
              
              for (const media of (mediaResp?.data || [])) {
                for (const comment of (media?.comments?.data || [])) {
                  const from = comment?.from;
                  if (!from?.id || from.id === igUserId || seen.has(from.id)) continue;
                  seen.add(from.id);
                  followers.push({
                    id: from.id,
                    name: from.username || from.id?.substring(0, 8),
                    username: from.username || from.id,
                    profile_pic: from.profile_picture_url || null,
                    source: "engaged",
                  });
                }
              }
              console.log(`Fetched engaged followers from posts, total: ${followers.length}`);
            }
          } catch (e: any) {
            console.log("Engaged followers discovery failed:", e.message);
          }
        }
        
        let followersCount = 0, followsCount = 0;
        try {
          const profile = await igFetch(`/${igUserId}?fields=followers_count,follows_count`, token);
          followersCount = profile?.followers_count || 0;
          followsCount = profile?.follows_count || 0;
        } catch {}
        
        result = {
          followers,
          followers_count: followersCount,
          follows_count: followsCount,
        };
        break;
      }

      // ===== SEARCH INSTAGRAM USERS (Private API — PAGINATED for up to 1000 results) =====
      case "search_users": {
        const query = params?.query;
        if (!query) throw new Error("query required");
        const metadata = conn.metadata as any || {};
        const sessionId = params?.session_id || metadata?.ig_session_id;
        if (!sessionId) throw new Error("Instagram session cookie required for user search");
        const dsUserId = params?.ds_user_id || metadata?.ig_ds_user_id || conn.platform_user_id;
        const csrfToken = params?.csrf_token || metadata?.ig_csrf_token;
        const igAppId = "936619743392459";
        const maxResults = Math.min(params?.max_results || 50, 100000);
        const expanded = params?.expanded || false;

        const headers = {
          "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
          "Cookie": `sessionid=${sessionId};${csrfToken ? ` csrftoken=${csrfToken};` : ""}${dsUserId ? ` ds_user_id=${dsUserId};` : ""}`,
          "X-IG-App-ID": igAppId,
        };

        // Try multiple search surfaces to get more results
        const allUsers: any[] = [];
        const seenPks = new Set<string>();

        const addUsers = (users: any[], source: string) => {
          for (const u of users) {
            const pk = String(u.pk);
            if (seenPks.has(pk)) continue;
            seenPks.add(pk);
            allUsers.push({
              id: pk,
              username: u.username,
              full_name: u.full_name,
              profile_pic_url: u.profile_pic_url,
              is_private: u.is_private,
              is_verified: u.is_verified,
              follower_count: u.follower_count,
              following_count: u.following_count,
              media_count: u.media_count,
              biography: u.biography,
              gender: classifyGender(u.full_name || u.username),
            });
          }
        };

        // Surface 1: Main user search (returns ~50)
        try {
          const searchUrl = `https://i.instagram.com/api/v1/users/search/?search_surface=user_search_page&timezone_offset=0&count=${Math.min(maxResults, 100)}&q=${encodeURIComponent(query)}`;
          const resp = await fetch(searchUrl, { headers });
          if (resp.ok) {
            const searchData = await resp.json();
            addUsers(searchData?.users || [], "primary");
          }
        } catch (e: any) {
          console.log("Primary search failed:", e.message);
        }

        // Surface 2: Top search (blended results — gets additional users)
        if (allUsers.length < maxResults) {
          try {
            const topSearchUrl = `https://i.instagram.com/api/v1/fbsearch/topsearch_flat/?search_surface=top_search_page&timezone_offset=0&count=${Math.min(maxResults - allUsers.length, 100)}&query=${encodeURIComponent(query)}`;
            const resp2 = await fetch(topSearchUrl, { headers });
            if (resp2.ok) {
              const topData = await resp2.json();
              for (const item of (topData?.list || [])) {
                if (item?.user) addUsers([item.user], "top");
              }
            }
          } catch (e: any) {
            console.log("Top search failed:", e.message);
          }
        }

        // Surface 3: Suggested users (gets even more)
        if (allUsers.length < maxResults) {
          try {
            const suggestedUrl = `https://i.instagram.com/api/v1/discover/search/?search_surface=user_search_page&timezone_offset=0&count=${Math.min(maxResults - allUsers.length, 100)}&q=${encodeURIComponent(query)}`;
            const resp3 = await fetch(suggestedUrl, { headers });
            if (resp3.ok) {
              const sugData = await resp3.json();
              addUsers(sugData?.users || [], "suggested");
            }
          } catch (e: any) {
            console.log("Suggested search failed:", e.message);
          }
        }

        // Expanded mode: aggressive multi-surface + paginated scanning for 500+ results
        if (expanded && allUsers.length < maxResults) {
          const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
          const rankToken = `${dsUserId || "0"}_${Date.now()}`;

          // Strategy 1: Paginated primary search with rank_token (up to 5 pages)
          for (let page = 0; page < 5 && allUsers.length < maxResults; page++) {
            try {
              const pageUrl = `https://i.instagram.com/api/v1/users/search/?search_surface=user_search_page&timezone_offset=0&count=100&q=${encodeURIComponent(query)}&rank_token=${rankToken}&page=${page}`;
              const resp = await fetch(pageUrl, { headers });
              if (resp.ok) {
                const d = await resp.json();
                const before = allUsers.length;
                addUsers(d?.users || [], "paginated");
                if (allUsers.length === before) break; // no new results
              }
              await delay(250);
            } catch {}
          }

          // Strategy 2: Keyword variations (no-space, underscore, dot, truncated)
          const baseQ = query.toLowerCase().trim();
          const variations = new Set([
            baseQ.replace(/\s+/g, ""),
            baseQ.replace(/\s+/g, "_"),
            baseQ.replace(/\s+/g, "."),
            baseQ.slice(0, Math.max(3, Math.floor(baseQ.length * 0.6))),
            baseQ + "s",
            baseQ + " official",
            baseQ + " real",
          ]);
          variations.delete(query); // skip original
          for (const variant of variations) {
            if (allUsers.length >= maxResults) break;
            try {
              const varUrl = `https://i.instagram.com/api/v1/users/search/?search_surface=user_search_page&timezone_offset=0&count=100&q=${encodeURIComponent(variant)}`;
              const resp = await fetch(varUrl, { headers });
              if (resp.ok) {
                const d = await resp.json();
                addUsers(d?.users || [], "variant");
              }
              await delay(200);
            } catch {}
          }

          // Strategy 3: Alphabet prefix scanning (query + a, query + b, ... query + z)
          const alphabet = "abcdefghijklmnopqrstuvwxyz";
          for (const letter of alphabet) {
            if (allUsers.length >= maxResults) break;
            try {
              const prefixUrl = `https://i.instagram.com/api/v1/users/search/?search_surface=user_search_page&timezone_offset=0&count=100&q=${encodeURIComponent(baseQ + letter)}`;
              const resp = await fetch(prefixUrl, { headers });
              if (resp.ok) {
                const d = await resp.json();
                addUsers(d?.users || [], "alpha");
              }
              await delay(150);
            } catch {}
          }

          // Strategy 4: Web blended search
          if (allUsers.length < maxResults) {
            try {
              const webUrl = `https://i.instagram.com/api/v1/web/search/topsearch/?context=blended&query=${encodeURIComponent(query)}&include_reel=false`;
              const resp = await fetch(webUrl, { headers });
              if (resp.ok) {
                const d = await resp.json();
                for (const item of (d?.users || [])) {
                  if (item?.user) addUsers([item.user], "web");
                }
              }
            } catch {}
          }

          // Strategy 5: Top search flat with rank_token pages
          for (let page = 0; page < 3 && allUsers.length < maxResults; page++) {
            try {
              const topUrl = `https://i.instagram.com/api/v1/fbsearch/topsearch_flat/?search_surface=top_search_page&timezone_offset=0&count=100&query=${encodeURIComponent(query)}&rank_token=${rankToken}&page=${page}`;
              const resp = await fetch(topUrl, { headers });
              if (resp.ok) {
                const d = await resp.json();
                const before = allUsers.length;
                for (const item of (d?.list || [])) {
                  if (item?.user) addUsers([item.user], "top_paged");
                }
                if (allUsers.length === before) break;
              }
              await delay(200);
            } catch {}
          }

          // Strategy 6: Suggested/discover search
          if (allUsers.length < maxResults) {
            try {
              const sugUrl = `https://i.instagram.com/api/v1/discover/search/?search_surface=user_search_page&timezone_offset=0&count=100&q=${encodeURIComponent(query)}`;
              const resp = await fetch(sugUrl, { headers });
              if (resp.ok) {
                const d = await resp.json();
                addUsers(d?.users || [], "discover");
              }
            } catch {}
          }
        }

        console.log(`Total search results for "${query}" (expanded: ${expanded}): ${allUsers.length}`);
        result = { users: allUsers.slice(0, maxResults), total: allUsers.length };
        break;
      }

      // ===== GET USER FEED (Private API — fetch any public user's media) =====
      case "get_user_feed": {
        const targetUserId = params?.user_id;
        if (!targetUserId) throw new Error("user_id required");
        const metadata = conn.metadata as any || {};
        const sessionId = params?.session_id || metadata?.ig_session_id;
        if (!sessionId) throw new Error("Instagram session cookie required for user feed");
        const dsUserId = params?.ds_user_id || metadata?.ig_ds_user_id || conn.platform_user_id;
        const csrfToken = params?.csrf_token || metadata?.ig_csrf_token;
        const igAppId = "936619743392459";
        const feedLimit = Math.min(params?.limit || 12, 50);

        const feedHeaders: Record<string, string> = {
          "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
          "Cookie": `sessionid=${sessionId};${csrfToken ? ` csrftoken=${csrfToken};` : ""}${dsUserId ? ` ds_user_id=${dsUserId};` : ""}`,
          "X-IG-App-ID": igAppId,
        };

        const posts: any[] = [];
        try {
          // Fetch user's media feed via private API
          const feedUrl = `https://i.instagram.com/api/v1/feed/user/${targetUserId}/?count=${feedLimit}`;
          const feedResp = await fetch(feedUrl, { headers: feedHeaders });
          if (feedResp.ok) {
            const feedData = await feedResp.json();
            for (const item of (feedData?.items || [])) {
              const imageVersions = item.image_versions2?.candidates || [];
              const carouselMedia = item.carousel_media || [];
              const mediaUrl = imageVersions[0]?.url || (carouselMedia[0]?.image_versions2?.candidates?.[0]?.url) || "";
              const videoUrl = item.video_versions?.[0]?.url || "";
              
              posts.push({
                id: String(item.pk || item.id),
                shortcode: item.code || "",
                caption: item.caption?.text || "",
                media_url: videoUrl || mediaUrl,
                thumbnail_url: mediaUrl,
                media_type: item.media_type === 2 ? "VIDEO" : item.media_type === 8 ? "CAROUSEL_ALBUM" : "IMAGE",
                like_count: item.like_count || 0,
                comments_count: item.comment_count || 0,
                permalink: `https://www.instagram.com/p/${item.code}/`,
                timestamp: item.taken_at ? new Date(item.taken_at * 1000).toISOString() : null,
                username: item.user?.username || "",
                user_id: String(item.user?.pk || item.user?.id || ""),
              });
            }
          } else {
            const errText = await feedResp.text();
            console.log("Feed fetch failed:", feedResp.status, errText.slice(0, 200));
          }
        } catch (e: any) {
          console.log("User feed error:", e.message);
        }

        result = { posts, count: posts.length };
        break;
      }

      // ===== EXPLORE / DISCOVER FEED (Private API — trending content) =====
      case "explore_feed": {
        const metadata = conn.metadata as any || {};
        const sessionId = params?.session_id || metadata?.ig_session_id;
        if (!sessionId) throw new Error("Instagram session cookie required for explore feed");
        const dsUserId = params?.ds_user_id || metadata?.ig_ds_user_id || conn.platform_user_id;
        const csrfToken = params?.csrf_token || metadata?.ig_csrf_token;
        const igAppId = "936619743392459";

        const exploreHeaders: Record<string, string> = {
          "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
          "Cookie": `sessionid=${sessionId};${csrfToken ? ` csrftoken=${csrfToken};` : ""}${dsUserId ? ` ds_user_id=${dsUserId};` : ""}`,
          "X-IG-App-ID": igAppId,
        };

        const explorePosts: any[] = [];
        try {
          const exploreUrl = `https://i.instagram.com/api/v1/discover/topical_explore/?is_prefetch=false&omit_cover_media=false&use_sectional_payload=true&timezone_offset=0&session_id=${Date.now()}&include_fixed_destinations=true`;
          const exploreResp = await fetch(exploreUrl, { headers: exploreHeaders });
          if (exploreResp.ok) {
            const exploreData = await exploreResp.json();
            // Parse sectional items
            const sections = exploreData?.sectional_items || [];
            for (const section of sections) {
              const layoutContent = section?.layout_content?.medias || section?.layout_content?.one_by_two_item?.clips?.items || [];
              for (const item of layoutContent) {
                const media = item?.media || item;
                if (!media?.pk) continue;
                const imageVersions = media.image_versions2?.candidates || [];
                const videoUrl = media.video_versions?.[0]?.url || "";
                const mediaUrl = imageVersions[0]?.url || "";
                
                explorePosts.push({
                  id: String(media.pk || media.id),
                  shortcode: media.code || "",
                  caption: media.caption?.text || "",
                  media_url: videoUrl || mediaUrl,
                  thumbnail_url: mediaUrl,
                  media_type: media.media_type === 2 ? "VIDEO" : media.media_type === 8 ? "CAROUSEL_ALBUM" : "IMAGE",
                  like_count: media.like_count || 0,
                  comments_count: media.comment_count || 0,
                  permalink: media.code ? `https://www.instagram.com/p/${media.code}/` : "",
                  timestamp: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : null,
                  username: media.user?.username || "",
                  user_id: String(media.user?.pk || media.user?.id || ""),
                  profile_pic_url: media.user?.profile_pic_url || "",
                });
              }
            }
            // Also parse fill items (grid items)
            const fillItems = exploreData?.fill_items || [];
            for (const media of fillItems) {
              if (!media?.pk || explorePosts.some(p => p.id === String(media.pk))) continue;
              const imageVersions = media.image_versions2?.candidates || [];
              const videoUrl = media.video_versions?.[0]?.url || "";
              const mediaUrl = imageVersions[0]?.url || "";
              
              explorePosts.push({
                id: String(media.pk),
                shortcode: media.code || "",
                caption: media.caption?.text || "",
                media_url: videoUrl || mediaUrl,
                thumbnail_url: mediaUrl,
                media_type: media.media_type === 2 ? "VIDEO" : "IMAGE",
                like_count: media.like_count || 0,
                comments_count: media.comment_count || 0,
                permalink: media.code ? `https://www.instagram.com/p/${media.code}/` : "",
                timestamp: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : null,
                username: media.user?.username || "",
                user_id: String(media.user?.pk || media.user?.id || ""),
                profile_pic_url: media.user?.profile_pic_url || "",
              });
            }
          } else {
            const errText = await exploreResp.text();
            console.log("Explore feed failed:", exploreResp.status, errText.slice(0, 200));
          }
        } catch (e: any) {
          console.log("Explore feed error:", e.message);
        }

        // Support pagination with max_id for loading more
        const exploreLimit = params?.limit || 30;
        let paginatedPosts = explorePosts;
        
        // If we need more posts, fetch additional pages
        if (exploreLimit > explorePosts.length) {
          let moreItems = true;
          let nextMaxId = "";
          let pageCount = 0;
          const maxPages = Math.min(Math.ceil((exploreLimit - explorePosts.length) / 30), 15);
          
          while (moreItems && pageCount < maxPages && paginatedPosts.length < exploreLimit) {
            pageCount++;
            try {
              const moreUrl = `https://i.instagram.com/api/v1/discover/topical_explore/?is_prefetch=false&omit_cover_media=false&use_sectional_payload=true&timezone_offset=0&session_id=${Date.now()}&include_fixed_destinations=true${nextMaxId ? `&max_id=${nextMaxId}` : ""}`;
              const moreResp = await fetch(moreUrl, { headers: exploreHeaders });
              if (moreResp.ok) {
                const moreData = await moreResp.json();
                nextMaxId = moreData?.next_max_id || "";
                const moreSections = moreData?.sectional_items || [];
                let added = 0;
                for (const section of moreSections) {
                  const layoutContent = section?.layout_content?.medias || section?.layout_content?.one_by_two_item?.clips?.items || [];
                  for (const item of layoutContent) {
                    const media = item?.media || item;
                    if (!media?.pk || paginatedPosts.some(p => p.id === String(media.pk))) continue;
                    const iv = media.image_versions2?.candidates || [];
                    const vUrl = media.video_versions?.[0]?.url || "";
                    const mUrl = iv[0]?.url || "";
                    paginatedPosts.push({
                      id: String(media.pk),
                      shortcode: media.code || "",
                      caption: media.caption?.text || "",
                      media_url: vUrl || mUrl,
                      thumbnail_url: mUrl,
                      media_type: media.media_type === 2 ? "VIDEO" : "IMAGE",
                      like_count: media.like_count || 0,
                      comments_count: media.comment_count || 0,
                      permalink: media.code ? `https://www.instagram.com/p/${media.code}/` : "",
                      timestamp: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : null,
                      username: media.user?.username || "",
                      user_id: String(media.user?.pk || media.user?.id || ""),
                      profile_pic_url: media.user?.profile_pic_url || "",
                    });
                    added++;
                  }
                }
                const moreFill = moreData?.fill_items || [];
                for (const media of moreFill) {
                  if (!media?.pk || paginatedPosts.some(p => p.id === String(media.pk))) continue;
                  const iv = media.image_versions2?.candidates || [];
                  const vUrl = media.video_versions?.[0]?.url || "";
                  const mUrl = iv[0]?.url || "";
                  paginatedPosts.push({
                    id: String(media.pk),
                    shortcode: media.code || "",
                    caption: media.caption?.text || "",
                    media_url: vUrl || mUrl,
                    thumbnail_url: mUrl,
                    media_type: media.media_type === 2 ? "VIDEO" : "IMAGE",
                    like_count: media.like_count || 0,
                    comments_count: media.comment_count || 0,
                    permalink: media.code ? `https://www.instagram.com/p/${media.code}/` : "",
                    timestamp: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : null,
                    username: media.user?.username || "",
                    user_id: String(media.user?.pk || media.user?.id || ""),
                    profile_pic_url: media.user?.profile_pic_url || "",
                  });
                  added++;
                }
                if (added === 0 || !nextMaxId) moreItems = false;
                console.log(`Explore page ${pageCount}: +${added} posts, total: ${paginatedPosts.length}`);
                await new Promise(r => setTimeout(r, 300));
              } else {
                moreItems = false;
              }
            } catch (e: any) {
              console.log("Explore pagination error:", e.message);
              moreItems = false;
            }
          }
        }

        result = { posts: paginatedPosts.slice(0, exploreLimit), count: paginatedPosts.length, total_available: paginatedPosts.length };
        break;
      }

      // ===== FETCH ACTUAL FOLLOWERS (Private API — UPGRADED CHUNKED with skip-already-scraped) =====
      case "scrape_followers": {
        const metadata = conn.metadata as any || {};
        const sessionId = params?.session_id || metadata?.ig_session_id;
        const dsUserId = params?.ds_user_id || metadata?.ig_ds_user_id || conn.platform_user_id;
        const csrfToken = params?.csrf_token || metadata?.ig_csrf_token;
        const igAppId = "936619743392459";
        
        if (!sessionId) {
          throw new Error("Instagram session cookie required. Go to instagram.com → DevTools → Application → Cookies → copy 'sessionid' value");
        }

        // Save session credentials for future use
        if (params?.session_id) {
          await supabase.from("social_connections").update({
            metadata: {
              ...(conn.metadata as any || {}),
              ig_session_id: params.session_id,
              ig_ds_user_id: params.ds_user_id || dsUserId,
              ig_csrf_token: params.csrf_token || csrfToken,
              ig_session_saved_at: new Date().toISOString(),
            }
          }).eq("id", conn.id);
        }

        let userPk = dsUserId;
        if (!userPk || userPk.length > 15) {
          try {
            const webResp = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${conn.platform_username || ""}`, {
              headers: {
                "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
                "Cookie": `sessionid=${sessionId};${csrfToken ? ` csrftoken=${csrfToken};` : ""}${dsUserId ? ` ds_user_id=${dsUserId};` : ""}`,
                "X-IG-App-ID": igAppId,
              },
            });
            const webData = await webResp.json();
            if (webData?.data?.user?.id) {
              userPk = webData.data.user.id;
              console.log(`Resolved user PK: ${userPk}`);
            }
          } catch (e: any) {
            console.log("PK resolution failed:", e.message);
          }
        }

        if (!userPk) {
          throw new Error("Could not resolve Instagram user PK. Please provide ds_user_id from cookies.");
        }

        // Load already-scraped PKs to SKIP duplicates intelligently
        const { data: existingPks } = await supabase
          .from("fetched_followers")
          .select("ig_user_id")
          .eq("account_id", account_id);
        const alreadyScrapedPks = new Set((existingPks || []).map((f: any) => f.ig_user_id));
        console.log(`Already scraped: ${alreadyScrapedPks.size} profiles — will skip duplicates`);

        // UPGRADED: More pages per chunk (20 instead of 12), faster delays
        const maxFollowers = params?.max_followers || 0;
        const pagesPerChunk = params?.pages_per_chunk || 20;
        const batchSize = params?.batch_size || 200;
        const cursor = params?.cursor || null;
        const turboMode = params?.turbo || false;

        const scrapedFollowers: any[] = [];
        const seenPks = new Set<string>();
        let maxId: string | null = cursor;
        let page = 0;
        let hitEnd = false;
        let rateLimited = false;
        let skippedCount = 0;
        
        console.log(`UPGRADED chunked fetch for PK ${userPk}, pages: ${pagesPerChunk}, turbo: ${turboMode}, cursor: ${cursor ? "yes" : "start"}`);

        const igHeaders = {
          "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
          "Cookie": `sessionid=${sessionId};${csrfToken ? ` csrftoken=${csrfToken};` : ""} ds_user_id=${userPk};`,
          "X-IG-App-ID": igAppId,
          "X-IG-WWW-Claim": "0",
        };

        while (page < pagesPerChunk) {
          if (maxFollowers > 0 && scrapedFollowers.length >= maxFollowers) {
            console.log(`Reached max followers limit: ${maxFollowers}`);
            hitEnd = true;
            break;
          }

          page++;
          const endpoint = `https://i.instagram.com/api/v1/friendships/${userPk}/followers/?count=${batchSize}${maxId ? `&max_id=${maxId}` : ""}&search_surface=follow_list_page`;
          
          try {
            const resp = await fetch(endpoint, { headers: igHeaders });

            if (!resp.ok) {
              const errText = await resp.text();
              console.log(`Page ${page} failed (${resp.status}):`, errText.substring(0, 200));
              if (resp.status === 401 || resp.status === 403) {
                throw new Error("Session expired. Please update your Instagram session cookie.");
              }
              if (resp.status === 429) {
                console.log("Rate limited — returning chunk so far");
                rateLimited = true;
                break;
              }
              break;
            }

            const data = await resp.json();
            const users = data?.users || [];
            
            console.log(`Page ${page}: ${users.length} followers`);

            for (const user of users) {
              if (maxFollowers > 0 && scrapedFollowers.length >= maxFollowers) break;
              const pk = String(user.pk);
              if (seenPks.has(pk)) continue;
              seenPks.add(pk);
              
              // Skip already-scraped profiles (but still count for cursor advancement)
              if (alreadyScrapedPks.has(pk)) {
                skippedCount++;
                continue;
              }
              
              const fullName = user.full_name || user.username || "";
              scrapedFollowers.push({
                id: pk,
                name: fullName,
                username: user.username,
                profile_pic: user.profile_pic_url || null,
                source: "fetched",
                is_private: user.is_private || false,
                is_verified: user.is_verified || false,
                gender: classifyGender(fullName),
              });
            }

            if (!data?.next_max_id || users.length === 0) {
              console.log("No more pages — fetching complete");
              hitEnd = true;
              break;
            }
            maxId = data.next_max_id;

            // Faster delays in turbo mode, still safe
            const baseDelay = turboMode 
              ? (page < 5 ? 800 : page < 15 ? 1200 : 1800) 
              : (page < 5 ? 1200 : page < 10 ? 2000 : 3000);
            const jitter = Math.random() * (turboMode ? 800 : 1500);
            await new Promise(r => setTimeout(r, baseDelay + jitter));
            
          } catch (e: any) {
            console.error(`Page ${page} error:`, e.message);
            if (e.message.includes("Session expired")) throw e;
            break;
          }
        }

        // PERSIST chunk to database with gender
        if (scrapedFollowers.length > 0) {
          console.log(`Saving chunk of ${scrapedFollowers.length} NEW followers (skipped ${skippedCount} duplicates)...`);
          for (let i = 0; i < scrapedFollowers.length; i += 500) {
            const batch = scrapedFollowers.slice(i, i + 500).map(f => ({
              account_id: account_id,
              ig_user_id: f.id,
              username: f.username,
              full_name: f.name,
              profile_pic_url: f.profile_pic,
              source: "fetched",
              is_private: f.is_private,
              is_verified: f.is_verified,
              gender: f.gender,
              fetched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
            const { error: upsertError } = await supabase
              .from("fetched_followers")
              .upsert(batch, { onConflict: "account_id,ig_user_id" });
            if (upsertError) console.log(`Upsert batch error:`, upsertError.message);
          }
        }

        // Get total persisted count
        const { count: totalPersisted } = await supabase
          .from("fetched_followers")
          .select("id", { count: "exact", head: true })
          .eq("account_id", account_id);

        const nextCursor = hitEnd ? null : maxId;
        console.log(`Chunk done: ${scrapedFollowers.length} new, ${skippedCount} skipped, ${totalPersisted || 0} total, has_more: ${!!nextCursor}`);

        result = {
          followers: scrapedFollowers,
          chunk_size: scrapedFollowers.length,
          skipped_duplicates: skippedCount,
          pages_fetched: page,
          next_cursor: nextCursor,
          fetch_complete: hitEnd,
          rate_limited: rateLimited,
          total_persisted: totalPersisted || 0,
        };
        break;
      }

      // ===== LOAD PERSISTED FOLLOWERS FROM DB =====
      case "get_persisted_followers": {
        const limit = params?.limit || 5000;
        const offset = params?.offset || 0;
        const genderFilter = params?.gender || null;
        
        let query = supabase
          .from("fetched_followers")
          .select("*", { count: "exact" })
          .eq("account_id", account_id)
          .order("fetched_at", { ascending: false });
          
        if (genderFilter) {
          query = query.eq("gender", genderFilter);
        }
        
        const { data: persisted, count } = await query.range(offset, offset + limit - 1);

        const followers = (persisted || []).map((f: any) => ({
          id: f.ig_user_id,
          name: f.full_name || f.username,
          username: f.username,
          profile_pic: f.profile_pic_url,
          source: f.source || "fetched",
          is_private: f.is_private,
          is_verified: f.is_verified,
          gender: f.gender || "unknown",
          follower_count: f.metadata?.follower_count ?? null,
          following_count: f.metadata?.following_count ?? null,
          media_count: f.metadata?.media_count ?? null,
        }));

        let followersCount = 0, followsCount = 0;
        try {
          const profile = await igFetch(`/${igUserId}?fields=followers_count,follows_count`, token);
          followersCount = profile?.followers_count || 0;
          followsCount = profile?.follows_count || 0;
        } catch {}

        result = {
          followers,
          total_persisted: count || 0,
          followers_count: followersCount,
          follows_count: followsCount,
        };
        break;
      }

      case "send_bulk_messages": {
        const recipients = params?.recipients || [];
        const message = params?.message || "";
        if (!message) throw new Error("Message text required");
        
        const results: any[] = [];
        for (const recipient of recipients) {
          try {
            const sendResp = await fetch(`${IG_GRAPH_URL}/${igUserId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: recipient.id },
                message: { text: message },
                access_token: token,
              }),
            });
            const sendData = await sendResp.json();
            
            if (sendData.error) {
              results.push({ id: recipient.id, name: recipient.name, success: false, error: sendData.error.message });
            } else {
              results.push({ id: recipient.id, name: recipient.name, success: true, message_id: sendData.message_id });
            }
          } catch (e: any) {
            results.push({ id: recipient.id, name: recipient.name, success: false, error: e.message });
          }
          
          await new Promise(r => setTimeout(r, 500));
        }
        
        const successCount = results.filter(r => r.success).length;
        result = { sent: successCount, failed: results.length - successCount, total: results.length, details: results };
        break;
      }

      // ===== oEMBED =====
      case "get_oembed":
        result = await igFetch(`/instagram_oembed?url=${encodeURIComponent(params.url)}&maxwidth=${params.maxwidth || 658}`, token);
        break;

      // ===== TOKEN MANAGEMENT =====
      case "refresh_token": {
        const resp = await fetch(`${FB_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${params.app_id}&client_secret=${params.app_secret}&fb_exchange_token=${token}`);
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({
            access_token: result.access_token,
            token_expires_at: new Date(Date.now() + (result.expires_in || 5184000) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", conn.id);
        }
        break;
      }

      case "debug_token":
        result = await igFetch(`/debug_token?input_token=${token}`, token);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Instagram API Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
