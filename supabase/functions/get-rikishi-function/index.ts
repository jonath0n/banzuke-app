// Import the Supabase JS client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define the base API endpoint
const API_BASE_URL = "https://www.sumo-api.com/api/rikishis";

// Function to fetch single rikishi data with optional history
async function fetchRikishiDetail(rikishiId: string, includeMeasurements: boolean, includeRanks: boolean, includeShikonas: boolean): Promise<any> {
  // Construct query parameters
  const queryParams = new URLSearchParams({
    // Include optional history data based on parameters
    ...(includeMeasurements && { measurements: "true" }),
    ...(includeRanks && { ranks: "true" }),
    ...(includeShikonas && { shikonas: "true" })
  });
  
  const url = `${API_BASE_URL}/${rikishiId}?${queryParams.toString()}`;
  console.log(`Fetching rikishi detail for id=${rikishiId}, URL: ${url}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`API error (${response.status}): ${response.statusText}`);
  }
  
  return await response.json();
}

// Function to process a single rikishi and their history
async function processRikishiDetail(supabaseClient: any, rikishi: any): Promise<{ 
  bashoCount: number,
  measurementsCount: number,
  ranksCount: number,
  shikonasCount: number
}> {
  // Create sets to track unique bashos to avoid duplicates
  const processedBashos = new Set<string>();
  let measurementsCount = 0;
  let ranksCount = 0;
  let shikonasCount = 0;
  
  console.log(`Processing rikishi: ${rikishi.id} (${rikishi.shikonaEn})`);
  
  // Track bashos for this rikishi
  const bashoIds = new Set<string>();
  
  // 2. Collect all bashos from history
  // From measurements
  if (rikishi.measurementHistory) {
    for (const m of rikishi.measurementHistory) {
      bashoIds.add(m.bashoId);
    }
  }
  
  // From ranks
  if (rikishi.rankHistory) {
    for (const r of rikishi.rankHistory) {
      bashoIds.add(r.bashoId);
    }
  }
  
  // From shikonas
  if (rikishi.shikonaHistory) {
    for (const s of rikishi.shikonaHistory) {
      bashoIds.add(s.bashoId);
    }
  }
  
  // 3. Process bashos
  const newBashoIds = [...bashoIds].filter(id => !processedBashos.has(id));
  if (newBashoIds.length > 0) {
    const bashos = newBashoIds.map(id => ({
      id,
      year: parseInt(id.substring(0, 4)),
      month: parseInt(id.substring(4, 6))
    }));
    
    try {
      const { error: bashoError } = await supabaseClient
        .from('bashos')
        .upsert(bashos, { onConflict: 'id' });
      
      if (bashoError) {
        console.error("Error upserting bashos:", bashoError);
      } else {
        // Add to processed set
        for (const id of newBashoIds) {
          processedBashos.add(id);
        }
      }
    } catch (err) {
      console.error("Exception upserting bashos:", err);
    }
  }
  
  // 4. Process measurements
  if (rikishi.measurementHistory && rikishi.measurementHistory.length > 0) {
    const measurements = rikishi.measurementHistory.map((m: { id: string; bashoId: string; height: number; weight: number }) => ({
      id: m.id,
      basho_id: m.bashoId,
      rikishi_id: rikishi.id,
      height: m.height,
      weight: m.weight
    }));
    
    try {
      // Process in chunks of 100
      for (let j = 0; j < measurements.length; j += 100) {
        const measurementChunk = measurements.slice(j, j + 100);
        
        const { error: measurementError } = await supabaseClient
          .from('rikishi_measurements')
          .upsert(measurementChunk, { onConflict: 'id' });
        
        if (measurementError) {
          console.error("Error upserting measurements:", measurementError);
        } else {
          measurementsCount += measurementChunk.length;
        }
      }
    } catch (err) {
      console.error("Exception upserting measurements:", err);
    }
  }
  
  // 5. Process ranks
  if (rikishi.rankHistory && rikishi.rankHistory.length > 0) {
    const ranks = rikishi.rankHistory.map((r: { id: string; bashoId: string; rank: string; rankValue: number }) => ({
      id: r.id,
      basho_id: r.bashoId,
      rikishi_id: rikishi.id,
      rank: r.rank,
      rank_value: r.rankValue
    }));
    
    try {
      // Process in chunks of 100
      for (let j = 0; j < ranks.length; j += 100) {
        const rankChunk = ranks.slice(j, j + 100);
        
        const { error: rankError } = await supabaseClient
          .from('rikishi_ranks')
          .upsert(rankChunk, { onConflict: 'id' });
        
        if (rankError) {
          console.error("Error upserting ranks:", rankError);
        } else {
          ranksCount += rankChunk.length;
        }
      }
    } catch (err) {
      console.error("Exception upserting ranks:", err);
    }
  }
  
  // 6. Process shikonas
  if (rikishi.shikonaHistory && rikishi.shikonaHistory.length > 0) {
    const shikonas = rikishi.shikonaHistory.map((s: { id: string; bashoId: string; shikonaEn: string; shikonaJp?: string }) => ({
      id: s.id,
      basho_id: s.bashoId,
      rikishi_id: rikishi.id,
      shikona_en: s.shikonaEn,
      shikona_jp: s.shikonaJp || ''
    }));
    
    try {
      // Process in chunks of 100
      for (let j = 0; j < shikonas.length; j += 100) {
        const shikonaChunk = shikonas.slice(j, j + 100);
        
        const { error: shikonaError } = await supabaseClient
          .from('rikishi_shikonas')
          .upsert(shikonaChunk, { onConflict: 'id' });
        
        if (shikonaError) {
          console.error("Error upserting shikonas:", shikonaError);
        } else {
          shikonasCount += shikonaChunk.length;
        }
      }
    } catch (err) {
      console.error("Exception upserting shikonas:", err);
    }
  }
  
  return {
    bashoCount: processedBashos.size,
    measurementsCount,
    ranksCount,
    shikonasCount
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }
  
  try {
    // Parse URL to check for query parameters and extract rikishiId
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const rikishiId = pathParts[pathParts.length - 1]; // Get last segment of the path
    
    if (!rikishiId) {
      return new Response(JSON.stringify({ 
        error: "Rikishi ID is required"
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    const includeMeasurements = url.searchParams.get('measurements') === 'true';
    const includeRanks = url.searchParams.get('ranks') === 'true';
    const includeShikonas = url.searchParams.get('shikonas') === 'true';
    
    console.log(`Fetching rikishi detail for id=${rikishiId}`);
    console.log(`Include measurements: ${includeMeasurements ? 'YES' : 'NO'}`);
    console.log(`Include ranks: ${includeRanks ? 'YES' : 'NO'}`);
    console.log(`Include shikonas: ${includeShikonas ? 'YES' : 'NO'}`);
    
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Fetch rikishi data from API
    const rikishi = await fetchRikishiDetail(
      rikishiId,
      includeMeasurements,
      includeRanks,
      includeShikonas
    );
    
    if (!rikishi) {
      return new Response(JSON.stringify({ 
        error: "Rikishi not found"
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    
    console.log(`Fetched rikishi data for ${rikishi.shikonaEn}`);
    
    // Process the rikishi data
    const stats = await processRikishiDetail(supabaseClient, rikishi);
    
    // Log this run
    try {
      await supabaseClient
        .from('data_import_logs')
        .insert({
          source: 'sumo_api_rikishi_detail',
          records_processed: 1,
          is_initial_load: false,
          success: true,
          notes: JSON.stringify({
            rikishi_id: rikishiId,
            rikishi_name: rikishi.shikonaEn,
            bashos: stats.bashoCount,
            measurements: stats.measurementsCount,
            ranks: stats.ranksCount,
            shikonas: stats.shikonasCount
          })
        });
      console.log("Import logged successfully");
    } catch (logError) {
      console.warn("Could not log import:", logError);
    }
    
    return new Response(JSON.stringify({ 
      message: `Successfully processed rikishi: ${rikishi.shikonaEn}`,
      rikishi_id: rikishiId,
      stats: stats,
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
          source: 'sumo_api_rikishi_detail',
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