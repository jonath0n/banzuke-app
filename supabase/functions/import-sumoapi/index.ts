// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Define the base API endpoint
const API_BASE_URL = "https://www.sumo-api.com/api/rikishis";

// Define interface for the rikishi data structure
interface Rikishi {
  id: number;
  sumodbId: number;
  nskId: number;
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
  // Optional fields based on query parameters
  measurements?: any[];
  ranks?: any[];
  shikonas?: any[];
  intaiDate?: string;
}

// Define interface for the API response
interface ApiResponse {
  limit: number;
  skip: number;
  total: number;
  records: Rikishi[] | null;
}

// Function to fetch all pages of data from the API
async function fetchAllPages(isInitialLoad: boolean): Promise<Rikishi[]> {
  const pageSize = 1000; // API's hard limit
  let allRecords: Rikishi[] = [];
  let currentPage = 0;
  let totalRecords = Infinity;
  let consecutiveEmptyResponses = 0;
  const MAX_CONSECUTIVE_EMPTY = 3; // Maximum number of empty responses before giving up
  
  // Construct query parameters
  const queryParams = new URLSearchParams({
    limit: pageSize.toString(),
    // Include retired rikishi for initial load only
    ...(isInitialLoad && { intai: "true" }),
  });
  
  while (allRecords.length < totalRecords) {
    // Set the skip parameter for pagination
    queryParams.set("skip", (currentPage * pageSize).toString());
    
    const url = `${API_BASE_URL}?${queryParams.toString()}`;
    console.log(`Fetching page ${currentPage + 1}, URL: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error (${response.status}): ${response.statusText}`);
      }
      
      // Get the raw text first for debugging
      const rawText = await response.text();
      
      // Log first 500 characters for debugging
      console.log(`Raw response (first 500 chars): ${rawText.substring(0, 500)}...`);
      
      try {
        // Parse the JSON
        const data = JSON.parse(rawText) as ApiResponse;
        
        // Debug: log the structure of the response
        console.log(`Response structure: ${Object.keys(data).join(', ')}`);
        
        // If this is the first page, update totalRecords
        if (currentPage === 0) {
          totalRecords = data.total;
          console.log(`Total records according to API: ${totalRecords}`);
        }
        
        // Check if records property exists and is an array
        if (!data.records || !Array.isArray(data.records) || data.records.length === 0) {
          console.warn(`Page ${currentPage + 1} returned no records or null records array`);
          consecutiveEmptyResponses++;
          
          if (consecutiveEmptyResponses >= MAX_CONSECUTIVE_EMPTY) {
            console.log(`Received ${MAX_CONSECUTIVE_EMPTY} consecutive empty responses, stopping pagination`);
            break;
          }
          
          // Try the next page
          currentPage++;
          continue;
        }
        
        // Reset counter if we got valid records
        consecutiveEmptyResponses = 0;
        
        allRecords = [...allRecords, ...data.records];
        console.log(`Retrieved ${data.records.length} records, total progress: ${allRecords.length}/${totalRecords}`);
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Failed to parse API response: ${errorMessage}`);
      }
    } catch (fetchError) {
      console.error(`Error fetching page ${currentPage + 1}:`, fetchError);
      // For network errors, retry a few times before giving up
      consecutiveEmptyResponses++;
      
      if (consecutiveEmptyResponses >= MAX_CONSECUTIVE_EMPTY) {
        console.log(`Encountered ${MAX_CONSECUTIVE_EMPTY} consecutive fetch errors, stopping pagination`);
        break;
      }
      
      // Wait a bit longer before retry on network errors
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }
    
    currentPage++;
    
    // Safety check to prevent infinite loops
    if (currentPage > 100) {
      console.warn("Reached maximum number of pages (100), breaking loop");
      break;
    }
    
    // Small delay to avoid overloading the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return allRecords;
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
    
    console.log(`Starting ${isInitialLoad ? 'INITIAL LOAD' : 'REGULAR UPDATE'} process...`);
    console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
    
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Fetch all pages of data
    const rikishis = await fetchAllPages(isInitialLoad);
    
    if (rikishis.length === 0) {
      console.log("No records returned from API. Creating log entry and returning.");
      
      // Log the empty run
      try {
        await supabaseClient
          .from('data_import_logs')
          .insert({
            source: 'sumo_api',
            records_processed: 0,
            is_initial_load: isInitialLoad,
            success: true,
            notes: "API returned zero records"
          });
      } catch (logError) {
        console.warn("Could not log import:", logError);
      }
      
      return new Response(JSON.stringify({ 
        message: "No records to process. API returned zero records.",
        is_initial_load: isInitialLoad,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    console.log(`Successfully fetched ${rikishis.length} total records`);
    
    // Process data in chunks to avoid hitting any size limitations
    const chunkSize = debugMode ? 10 : 100;
    let processedCount = 0;
    
    for (let i = 0; i < rikishis.length; i += chunkSize) {
      const chunk = rikishis.slice(i, i + chunkSize);
      console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(rikishis.length / chunkSize)}`);
      
      // Transform data for database
      const transformedChunk = chunk.map(rikishi => {
        // Basic required fields
        const transformed: {
          id: number;
          sumodb_id: number;
          nsk_id: number;
          shikona_en: string;
          shikona_jp: string;
          current_rank: string;
          heya: string;
          birth_date: string;
          shusshin: string;
          height: number;
          weight: number;
          debut: string;
          updated_at: string;
          intai_date?: string;
          measurements?: any[];
          ranks?: any[];
          shikonas?: any[];
        } = {
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
          updated_at: rikishi.updatedAt
        };
        
        // Optional fields - only add if they exist
        if (rikishi.intaiDate) transformed['intai_date'] = rikishi.intaiDate;
        if (rikishi.measurements) transformed['measurements'] = rikishi.measurements;
        if (rikishi.ranks) transformed['ranks'] = rikishi.ranks;
        if (rikishi.shikonas) transformed['shikonas'] = rikishi.shikonas;
        
        return transformed;
      });
      
      // Log the first record in debug mode
      if (debugMode && chunk.length > 0) {
        console.log("Sample record to insert:");
        console.log(JSON.stringify(transformedChunk[0], null, 2));
      }
      
      const { error } = await supabaseClient
        .from('rikishis')
        .upsert(transformedChunk, { onConflict: 'id' });
      
      if (error) {
        console.error("Upsert error details:", error);
        throw new Error(`Database error on chunk ${Math.floor(i / chunkSize) + 1}: ${error.message || JSON.stringify(error)}`);
      }
      
      processedCount += chunk.length;
      console.log(`Successfully processed ${processedCount}/${rikishis.length} records`);
      
      // In debug mode, only process the first chunk
      if (debugMode && i + chunkSize >= chunkSize) {
        console.log("Debug mode: stopping after first chunk");
        break;
      }
    }
    
    // Try to log this run
    try {
      await supabaseClient
        .from('data_import_logs')
        .insert({
          source: 'sumo_api',
          records_processed: processedCount,
          is_initial_load: isInitialLoad,
          success: true
        });
      console.log("Import logged successfully");
    } catch (logError) {
      console.warn("Could not log import:", logError);
    }
    
    return new Response(JSON.stringify({ 
      message: `Successfully processed ${processedCount} rikishi records`,
      is_initial_load: isInitialLoad,
      debug_mode: debugMode,
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
          source: 'sumo_api',
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