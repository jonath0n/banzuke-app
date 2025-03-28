// Import the Supabase JS client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define function URLs - update these with your actual Supabase function URLs
const LIST_RIKISHIS_URL = "https://sadwlipiuzqjnwcwqccc.supabase.co/functions/v1/import-sumoapi";
const GET_RIKISHI_URL = "https://sadwlipiuzqjnwcwqccc.supabase.co/functions/v1/get-rikishi-function";

// Get the subdomain from a URL
function getSubdomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.split('.')[0];
  } catch (err) {
    console.error("Error parsing URL:", err);
    return "sadwlipiuzqjnwcwqccc"; // Fallback to the hardcoded value
  }
}

// Main orchestration function
async function orchestrateImport(req: Request) {
  const url = new URL(req.url);
  const batchSize = url.searchParams.get('batchSize') ? parseInt(url.searchParams.get('batchSize')!) : 10;
  const concurrentRequests = url.searchParams.get('concurrentRequests') ? parseInt(url.searchParams.get('concurrentRequests')!) : 3;
  const includeMeasurements = url.searchParams.get('measurements') === 'true';
  const includeRanks = url.searchParams.get('ranks') === 'true';
  const includeShikonas = url.searchParams.get('shikonas') === 'true';
  
  console.log("Starting Sumo data import orchestration");
  console.log(`Batch size: ${batchSize}`);
  console.log(`Concurrent requests: ${concurrentRequests}`);
  console.log(`Include measurements: ${includeMeasurements ? 'YES' : 'NO'}`);
  console.log(`Include ranks: ${includeRanks ? 'YES' : 'NO'}`);
  console.log(`Include shikonas: ${includeShikonas ? 'YES' : 'NO'}`);
  
  // Get the Supabase URL and API key
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  // Extract the subdomain for the x-deno-subhost header
  const subdomain = getSubdomain(supabaseUrl);
  console.log(`Using subdomain for x-deno-subhost: ${subdomain}`);
  
  // Create a supabase client for direct DB operations
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  
  // Step 1: Import all rikishis (basic data only)
  let listApiUrl = `${LIST_RIKISHIS_URL}?limit=${batchSize}`;
  let allRikishisProcessed = false;
  let totalRikishisProcessed = 0;
  
  console.log("Step 1: Importing all rikishis (basic data)");
  
  // Use a direct call for testing - this approach bypasses the functions service
  console.log("Using direct database access to bypass edge function for step 1");
  
  try {
    // Instead of calling the edge function, let's directly fetch data from the API
    // and process it using the Supabase client
    
    const API_BASE_URL = "https://www.sumo-api.com/api/rikishis";
    const limit = 100; // Fetch 100 records at a time
    let skip = 0;
    let total = 0;
    let isComplete = false;
    
    while (!isComplete) {
      console.log(`Fetching data from API with skip=${skip}, limit=${limit}`);
      
      // Construct query parameters
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        skip: skip.toString()
      });
      
      const apiUrl = `${API_BASE_URL}?${queryParams.toString()}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.records || !Array.isArray(data.records) || data.records.length === 0) {
        console.log("No more records returned from API");
        isComplete = true;
        continue;
      }
      
      console.log(`Fetched ${data.records.length} records from API`);
      total = data.total || 0;
      
      // Process the rikishis in batches of 50
      const batchSize = 50;
      for (let i = 0; i < data.records.length; i += batchSize) {
        const batchRikishis = data.records.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.records.length / batchSize)}`);
        
        // Transform the data
        interface Rikishi {
          id: string;
          sumodbId: string;
          nskId: string;
          shikonaEn: string;
          shikonaJp: string;
          currentRank: string;
          heya: string;
          birthDate: string;
          shusshin: string;
          height: number;
          weight: number;
          debut: string;
          updatedAt: string;
          intaiDate?: string;
        }

        const transformedRikishis = batchRikishis.map((rikishi: Rikishi) => ({
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
        
        // Upsert rikishis
        const { error: rikishiError } = await supabaseClient
          .from('rikishis')
          .upsert(transformedRikishis, { onConflict: 'id' });
        
        if (rikishiError) {
          console.error("Error upserting rikishis:", rikishiError);
          throw rikishiError;
        }
        
        totalRikishisProcessed += transformedRikishis.length;
      }
      
      // Update skip for the next batch
      skip += data.records.length;
      
      // Check if we've processed all records
      isComplete = skip >= total;
      
      console.log(`Processed ${totalRikishisProcessed}/${total} rikishis (${((skip / total) * 100).toFixed(2)}%)`);
    }
    
    console.log("All rikishis processed successfully");
  } catch (error) {
    console.error("Error processing rikishis directly:", error);
    throw error;
  }
  
  // Step 2: Get list of all rikishis from the database
  console.log("Step 2: Getting all rikishi IDs from database");
  
  const { data: rikishiIds, error: rikishiIdsError } = await supabaseClient
    .from('rikishis')
    .select('id')
    .order('id', { ascending: true });
  
  if (rikishiIdsError) {
    throw new Error(`Failed to fetch rikishi IDs: ${rikishiIdsError.message}`);
  }
  
  console.log(`Found ${rikishiIds.length} rikishis in database to process`);
  
  // Step 3: Process each rikishi's detailed data directly
  console.log("Step 3: Processing rikishi details directly (bypassing edge function)");
  
  let completedRikishis = 0;
  const API_RIKISHI_URL = "https://www.sumo-api.com/api/rikishis";
  
  // Process in chunks to control memory usage
  for (let i = 0; i < rikishiIds.length; i += concurrentRequests) {
    const chunk = rikishiIds.slice(i, i + concurrentRequests);
    
    console.log(`Processing chunk ${Math.floor(i / concurrentRequests) + 1}/${Math.ceil(rikishiIds.length / concurrentRequests)} (${chunk.length} rikishis)`);
    
    // Process this chunk concurrently
    const promises = chunk.map(async ({ id }) => {
      try {
        // Construct query parameters
        const queryParams = new URLSearchParams({
          // Include optional history data based on parameters
          ...(includeMeasurements && { measurements: "true" }),
          ...(includeRanks && { ranks: "true" }),
          ...(includeShikonas && { shikonas: "true" })
        });
        
        const apiUrl = `${API_RIKISHI_URL}/${id}?${queryParams.toString()}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error (${response.status}): ${response.statusText} - ${errorText}`);
        }
        
        const rikishi = await response.json();
        
        // Process the rikishi data
        // Process bashos
        const bashoIds = new Set<string>();
        
        // Collect all bashos from history
        if (rikishi.measurementHistory) {
          for (const m of rikishi.measurementHistory) {
            bashoIds.add(m.bashoId);
          }
        }
        
        if (rikishi.rankHistory) {
          for (const r of rikishi.rankHistory) {
            bashoIds.add(r.bashoId);
          }
        }
        
        if (rikishi.shikonaHistory) {
          for (const s of rikishi.shikonaHistory) {
            bashoIds.add(s.bashoId);
          }
        }
        
        if (bashoIds.size > 0) {
          const bashos = Array.from(bashoIds).map(bashoId => ({
            id: bashoId,
            year: parseInt(bashoId.substring(0, 4)),
            month: parseInt(bashoId.substring(4, 6))
          }));
          
          const { error: bashoError } = await supabaseClient
            .from('bashos')
            .upsert(bashos, { onConflict: 'id' });
          
          if (bashoError) {
            console.error(`Error upserting bashos for rikishi ${id}:`, bashoError);
          }
        }
        
        // Process measurements
        if (includeMeasurements && rikishi.measurementHistory && rikishi.measurementHistory.length > 0) {
          const measurements = rikishi.measurementHistory.map((m: { id: string; bashoId: string; height: number; weight: number }) => ({
            id: m.id,
            basho_id: m.bashoId,
            rikishi_id: rikishi.id,
            height: m.height,
            weight: m.weight
          }));
          
          const { error: measurementError } = await supabaseClient
            .from('rikishi_measurements')
            .upsert(measurements, { onConflict: 'id' });
          
          if (measurementError) {
            console.error(`Error upserting measurements for rikishi ${id}:`, measurementError);
          }
        }
        
        // Process ranks
        if (includeRanks && rikishi.rankHistory && rikishi.rankHistory.length > 0) {
          const ranks = rikishi.rankHistory.map((r: { id: string; bashoId: string; rank: string; rankValue: number }) => ({
            id: r.id,
            basho_id: r.bashoId,
            rikishi_id: rikishi.id,
            rank: r.rank,
            rank_value: r.rankValue
          }));
          
          const { error: rankError } = await supabaseClient
            .from('rikishi_ranks')
            .upsert(ranks, { onConflict: 'id' });
          
          if (rankError) {
            console.error(`Error upserting ranks for rikishi ${id}:`, rankError);
          }
        }
        
        // Process shikonas
        if (includeShikonas && rikishi.shikonaHistory && rikishi.shikonaHistory.length > 0) {
          const shikonas = rikishi.shikonaHistory.map((s: { id: string; bashoId: string; shikonaEn: string; shikonaJp?: string }) => ({
            id: s.id,
            basho_id: s.bashoId,
            rikishi_id: rikishi.id,
            shikona_en: s.shikonaEn,
            shikona_jp: s.shikonaJp || ''
          }));
          
          const { error: shikonaError } = await supabaseClient
            .from('rikishi_shikonas')
            .upsert(shikonas, { onConflict: 'id' });
          
          if (shikonaError) {
            console.error(`Error upserting shikonas for rikishi ${id}:`, shikonaError);
          }
        }
        
        return { 
          id, 
          success: true, 
          name: rikishi.shikonaEn,
          measurements: rikishi.measurementHistory?.length || 0,
          ranks: rikishi.rankHistory?.length || 0,
          shikonas: rikishi.shikonaHistory?.length || 0
        };
      } catch (err) {
        console.error(`Exception processing rikishi ${id}:`, err);
        return { id, success: false, error: err instanceof Error ? err.message : String(err) };
      }
    });
    
    const results = await Promise.all(promises);
    
    // Count successes and failures
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    
    completedRikishis += successes;
    
    console.log(`Chunk complete - Success: ${successes}, Failed: ${failures}, Total progress: ${completedRikishis}/${rikishiIds.length}`);
    
    // Add a small delay between chunks to avoid overwhelming the system
    if (i + concurrentRequests < rikishiIds.length) {
      console.log("Pausing before next chunk...");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Log the complete run
  try {
    await supabaseClient
      .from('data_import_logs')
      .insert({
        source: 'sumo_api_orchestrator',
        records_processed: completedRikishis,
        success: true,
        notes: JSON.stringify({
          total_rikishis: rikishiIds.length,
          successful_rikishis: completedRikishis,
          failed_rikishis: rikishiIds.length - completedRikishis,
          included_measurements: includeMeasurements,
          included_ranks: includeRanks,
          included_shikonas: includeShikonas
        })
      });
  } catch (logError) {
    console.warn("Could not log orchestration:", logError);
  }
  
  return new Response(JSON.stringify({
    message: "Data import orchestration complete",
    total_rikishis: rikishiIds.length,
    successful_rikishis: completedRikishis,
    failed_rikishis: rikishiIds.length - completedRikishis,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }
  
  try {
    return await orchestrateImport(req);
  } catch (error) {
    console.error("Orchestration error:", error);
    
    // Try to log the error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      );
      
      await supabaseClient
        .from('data_import_logs')
        .insert({
          source: 'sumo_api_orchestrator',
          success: false,
          error_message: error instanceof Error ? error.message : String(error)
        });
    } catch (logError) {
      console.error("Failed to log orchestration error:", logError);
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