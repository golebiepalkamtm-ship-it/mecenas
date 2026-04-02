import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("No Authorization header found");
    const jwt = authHeader.replace('Bearer ', '').trim();

    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authErr } = await supabaseAdminClient.auth.getUser(jwt);
    if (authErr) throw new Error("Unauthorized: " + authErr?.message);

    const body = await req.json();
    const { 
      system_prompt, 
      user_instructions, 
      structured_data,
      model = 'google/gemini-2.5-flash',
      history = []
    } = body;

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    // 1. Fetch profile and check credits
    const { data: profile, error: profErr } = await supabaseAdminClient
      .from('profiles')
      .select('credits, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profErr || !profile) throw new Error("Profile not found or error");
    if (profile.credits <= 0 && profile.subscription_tier !== 'elite') throw new Error("Insufficient credits");

    // 2. RAG Context Fetching
    let context = "";
    try {
        const embRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
            method: 'POST',
            headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "openai/text-embedding-3-small", input: user_instructions || "draft document" })
        });
        const embData = await embRes.json();
        if (embData.data && embData.data[0]) {
            const embedding = embData.data[0].embedding;
            const supabaseUserClient = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_ANON_KEY') ?? '',
              { global: { headers: { Authorization: authHeader } } }
            );

            const { data: matches } = await supabaseUserClient.rpc('match_knowledge', {
                query_embedding: embedding, match_threshold: 0.35, match_count: 5        
            });

            if (matches && matches.length > 0) {
                context = matches.map((m: any) => m.content || "").join("\n---\n");
            }
        }
    } catch (e) {
        console.error("RAG error in drafter:", e);
    }

    // 3. Build the user prompt with structured data
    let finalUserPrompt = "";
    
    if (structured_data) {
      const { sender, recipient, placeDate } = structured_data;
      finalUserPrompt += `### DANE STRUKTURALNE DO DOKUMENTU:\n`;
      finalUserPrompt += `[MIEJSCE I DATA]: ${placeDate || '...................., dnia ....................'}\n\n`;
      finalUserPrompt += `[NADAWCA]:\n${sender || '....................'}\n\n`;
      finalUserPrompt += `[ADRESAT]:\n${recipient || '....................'}\n\n`;
      finalUserPrompt += `---\n\n`;
    }

    finalUserPrompt += `### INSTRUKCJE DO TREŚCI:\n${user_instructions || "Sporządź odpowiednie pismo procesowe/urzędowe na podstawie danych powyżej."}\n\n`;
    
    if (context) {
      finalUserPrompt += `### KONTEKST Z BAZY WIEDZY RAG:\n${context}\n\n`;
    }

    finalUserPrompt += `[WYMAGANIE]: Wygeneruj wyłącznie gotowy dokument w formacie Markdown. Zachowaj profesjonalny układ (miejsce na podpis, załączniki).`;

    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "LexMind AI Drafter",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: system_prompt || "Jesteś ekspertem ds. pism prawnych." }, 
          ...history, 
          { role: "user", content: finalUserPrompt }
        ]
      })
    });

    const aiData = await openRouterRes.json();
    if (!openRouterRes.ok) throw new Error("OpenRouter API Error: " + JSON.stringify(aiData));

    const assistantContent = aiData.choices?.[0]?.message?.content || "Nie udało się wygenerować treści.";

    // 4. Deduct credit
    if (profile.subscription_tier !== 'elite') {
        const newCredits = Math.max(0, profile.credits - 1);
        await supabaseAdminClient.from('profiles').update({ credits: newCredits }).eq('id', user.id);
    }

    return new Response(JSON.stringify({ content: assistantContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Unknown proxy error" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
