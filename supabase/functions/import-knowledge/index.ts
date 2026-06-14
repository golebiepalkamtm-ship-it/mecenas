import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface ImportRequest {
  action: "insert" | "delete" | "test" | "list"
  records?: Array<{
    content: string
    metadata: Record<string, any>
    embedding: number[]
  }>
  filename?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: ImportRequest = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    console.log('Import request:', { action: body.action, filename: body.filename, recordCount: body.records?.length })

    if (body.action === 'test') {
      return new Response(JSON.stringify({ status: 'ok', message: 'Import function is working' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    if (body.action === 'list') {
      // Pobierz wszystkie dokumenty z metadanych
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('metadata')

      if (error) {
        console.error('List error:', error)
        throw error
      }

      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    if (body.action === 'delete' && body.filename) {
      // Delete existing document by filename
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('metadata->>filename', body.filename)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      return new Response(JSON.stringify({ status: 'deleted', filename: body.filename }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    if (body.action === 'insert' && body.records) {
      // Insert new records
      const { error } = await supabase
        .from('knowledge_base')
        .insert(body.records)

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      return new Response(JSON.stringify({ 
        status: 'inserted', 
        count: body.records.length,
        message: `Successfully inserted ${body.records.length} records`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    throw new Error('Invalid request action or missing required data')

  } catch (error) {
    console.error('Import function error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      status: 'error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
