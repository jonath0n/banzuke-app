// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Define the base API endpoint
const API_BASE_URL = "https://www.sumo-api.com/api/rikishis";

// Function to fetch rikishi list data from the API
async function fetchRikishiList(skip: number, limit: number, includeRetired: boolean): Promise<any> {
  // Construct query parameters
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    skip: skip.toString(),
    // Include retired rikishi if specified
    ...(includeRetired && { intai: "true" })
  });
  
  const url = `${API_BASE_URL}?${queryParams.toString()}`;
  console.log(`Fetching rikishi list with skip=${skip}, limit=${limit}, URL: ${url}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`API error (${response.status}): ${response.statusText}`);
  }
  
  return await response.json();
}

// Function to process rikishi data batch
async function processRikishiBatch(supabaseClient: any, rikishis: any[], batchSize: number = 50): Promise<{
  rikishisCount: number,
  bashoCount: number
}> {
  let rikishisCount = 0;
  const processedBashos = new Set<string>();
  
  console.log(`Processing ${rikishis.length} rikishis in batches of ${batchSize}`);
  
  // Process rikishis in small batches to avoid memory issues
  for (let i = 0; i < rikishis.length; i += batchSize) {
    const batchRikishis = rikishis.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rikishis.length / batchSize)}`);
    
    // Process main rikishi data
    const transformedRikishis = batchRikishis.map(rikishi => ({
      id: rikishi.id,
      sumodb_id: rikishi.sumodbId,
      nsk_id: rikishi.nskId,
      shikona_en: rikishi.shikonaEn,
      shikona_jp: rikishi.shikonaJp,
      current_rank: rikishi.currentRank,
      heya: rikishi.heya,
      birth_date: rikishi.birthDate,
      shusshin: rikishi.shusshin,
      height: rikishi.height,
      weight: rikishi.weight,
      debut: rikishi.debut,
      updated_at: rikishi.updatedAt,
      ...(rikishi.intaiDate && { intai_date: rikishi.intaiDate })
    }));
    
    try {
      // Upsert rikishis
      const { error: rikishiError } = await supabaseClient
        .from('rikishis')
        .upsert(transformedRikishis, { onConflict: 'id' });
      
      if (rikishiError) {
        console.error("Error upserting rikishis:", rikishiError);
        throw rikishiError;
      }
      
      rikishisCount += transformedRikishis.length;
    } catch (err) {
      console.error("Exception upserting rikishis:", err);
    }
  }
  
  return {
    rikishisCount,
    bashoCount: processedBashos.size
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }
  
  try {
    // Parse URL to check for query parameters
    const url = new URL(req.url);
    const isInitialLoad = url.searchParams.get('initialLoad') === 'true';
    const debugMode = url.searchParams.get('debug') === 'true';
    
    // Get skip and limit parameters
    const skip = url.searchParams.get('skip') ? parseInt(url.searchParams.get('skip')!) : 0;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100;
    
    // Get batch size for processing
    const processBatchSize = url.searchParams.get('processBatchSize') ? parseInt(url.searchParams.get('processBatchSize')!) : 10;
    
    console.log(`Starting rikishi list import with skip=${skip}, limit=${limit}...`);
    console.log(`Process batch size: ${processBatchSize}`);
    
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Fetch data from API (only basic rikishi data, no history)
    const data = await fetchRikishiList(
      skip,
      limit,
      isInitialLoad
    );
    
    if (!data.records || !Array.isArray(data.records) || data.records.length === 0) {
      console.log("No records returned from API");
      
      return new Response(JSON.stringify({ 
        message: "No records to process. API returned zero records.",
        skip,
        limit,
        total: data.total || 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    console.log(`Fetched ${data.records.length} records from API`);
    
    // Process the data
    const stats = await processRikishiBatch(supabaseClient, data.records, processBatchSize);
    
    // Log this run
    try {
      await supabaseClient
        .from('data_import_logs')
        .insert({
          source: 'sumo_api_rikishi_list',
          records_processed: stats.rikishisCount,
          is_initial_load: isInitialLoad,
          success: true,
          notes: JSON.stringify({
            skip,
            limit,
            processed: stats.rikishisCount
          })
        });
      console.log("Import logged successfully");
    } catch (logError) {
      console.warn("Could not log import:", logError);
    }
    
    // Calculate next skip
    const nextSkip = skip + data.records.length;
    const isComplete = nextSkip >= data.total;
    
    return new Response(JSON.stringify({ 
      message: `Successfully processed ${stats.rikishisCount} rikishi records`,
      current_skip: skip,
      limit: limit,
      next_skip: nextSkip,
      total_records: data.total,
      is_complete: isComplete,
      percent_complete: ((nextSkip / data.total) * 100).toFixed(2) + '%',
      stats: stats,
      next_url: isComplete ? null : 
        `${url.origin}${url.pathname}?skip=${nextSkip}&limit=${limit}${isInitialLoad ? '&initialLoad=true' : ''}`,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    
    // Try to log the error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabaseClient
        .from('data_import_logs')
        .insert({
          source: 'sumo_api_rikishi_list',
          success: false,
          error_message: error instanceof Error ? error.message : String(error)
        });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});