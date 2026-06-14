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
    if (authErr) throw new Error("UserLookupFailed: " + authErr.message);
    if (!user) throw new Error("Unauthorized: user object is null");

    const body = await req.json();
    const { prompt, sessionId, model, history } = body;

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    const { data: profile, error: profErr } = await supabaseAdminClient
      .from('profiles')
      .select('credits, system_prompt, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profErr) throw new Error("Profile error");
    if (!profile) throw new Error("Profile not found");
    if (profile.credits <= 0 && profile.subscription_tier !== 'elite') throw new Error("BRAK KREDYTW");

    let context = "";
    try {
        const embRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
            method: 'POST',
            headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "openai/text-embedding-3-small", input: prompt })
        });
        const embData = await embRes.json();
        if (embData.data && embData.data[0]) {
            const embedding = embData.data[0].embedding;
            const supabaseUserClient = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_ANON_KEY') ?? '',
              { global: { headers: { Authorization: authHeader } } }
            );

            // Fetch from Supabase RAG
            const { data: matches } = await supabaseUserClient.rpc('match_knowledge', {
                query_embedding: embedding, match_threshold: 0.35, match_count: 5        
            });

            if (matches && matches.length > 0) {
                context = matches.map((m: any) => {
                    let text = m.content || "";
                    if (text.length > 1500) text = text.substring(0, 1500) + "...";
                    return text;
                }).join("\n---\n");
            }
        }
    } catch (e) {
        console.error("Embedding or RAG error:", e);
    }

    const finalSystemPrompt = `${profile.system_prompt || "Jesteś ekspertem prawnym LexMind AI."}\n\nKONTEKST Z TWOJEJ BAZY WIEDZY:\n${context || "Brak dodatkowych dokumentów w bazie wiedzy."}`;

    // AUTO-FALLBACK: Use an array of models if the selected one is busy/rate-limited
    // We prioritize the user's choice, then fallback to reliable ones.
    const primaryModelId = model || "google/gemini-2.5-flash";
    const modelsToTry = [primaryModelId];
    
    // If user chose a 'free' model, add reliable fallbacks automatically
    if (primaryModelId.includes(':free') || primaryModelId.includes('qwen') || primaryModelId.includes('deepseek')) {
        modelsToTry.push("google/gemini-2.1-flash-thinking-preview:free"); // Try another free one
        modelsToTry.push("google/gemini-2.5-flash"); // Then a paid reliable one
        modelsToTry.push("openai/gpt-4o-mini");
    }

    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "LexMind AI",
      },
      body: JSON.stringify({
        // OpenRouter supports 'models' as an array for automatic routing
        // But for clarity and explicit control, we use their 'models' list feature if supported, 
        // OR we can just try/catch here. Actually, OpenRouter handles it if we pass 'models'.
        models: modelsToTry,
        messages: [{ role: "system", content: finalSystemPrompt }, ...history, { role: "user", content: prompt }]
      })
    });

    const aiData = await openRouterRes.json();
    
    if (!openRouterRes.ok || !aiData.choices || !aiData.choices[0]) {
         throw new Error("OpenRouter API Error: " + JSON.stringify(aiData));
    }
    
    const assistantContent = aiData.choices[0].message.content;

    if (profile.subscription_tier !== 'elite') {
        const newCredits = Math.max(0, profile.credits - 1);
        await supabaseAdminClient.from('profiles').update({ credits: newCredits }).eq('id', user.id);
    }

    await supabaseAdminClient.from('messages').insert([
        { session_id: sessionId, user_id: user.id, role: 'user', content: prompt },
        { session_id: sessionId, user_id: user.id, role: 'assistant', content: assistantContent }
    ]);

    return new Response(JSON.stringify({ content: assistantContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Unknown proxy error" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
