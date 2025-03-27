// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Define the base API endpoint
const API_BASE_URL = "https://www.sumo-api.com/api/kimarite";

// Define interface for the kimarite data structure
interface Kimarite {
  kimarite: string;
  count: number;
  lastUsage: string;
}

// Define interface for the API response
interface ApiResponse {
  limit: number;
  skip: number;
  sortField: string;
  sortOrder: string;
  records: Kimarite[] | null;
}

// Function to fetch all pages of data from the API
async function fetchAllPages(): Promise<Kimarite[]> {
  const pageSize = 1000; // API's hard limit
  let allRecords: Kimarite[] = [];
  let currentPage = 0;
  let hasMoreRecords = true;
  let consecutiveEmptyResponses = 0;
  const MAX_CONSECUTIVE_EMPTY = 3; // Maximum number of empty responses before giving up
  
  // Construct query parameters
  const queryParams = new URLSearchParams({
    limit: pageSize.toString(),
    sortField: "count",
    sortOrder: "desc"
  });
  
  console.log("Using API endpoint:", API_BASE_URL);
  
  while (hasMoreRecords) {
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
        
        // Check if records property exists and is an array
        if (!data.records || !Array.isArray(data.records) || data.records.length === 0) {
          console.warn(`Page ${currentPage + 1} returned no records or null records array`);
          consecutiveEmptyResponses++;
          
          if (consecutiveEmptyResponses >= MAX_CONSECUTIVE_EMPTY) {
            console.log(`Received ${MAX_CONSECUTIVE_EMPTY} consecutive empty responses, stopping pagination`);
            hasMoreRecords = false;
            break;
          }
          
          // Try the next page
          currentPage++;
          continue;
        }
        
        // Reset counter if we got valid records
        consecutiveEmptyResponses = 0;
        
        // Add the new records to our collection
        allRecords = [...allRecords, ...data.records];
        console.log(`Retrieved ${data.records.length} records, total so far: ${allRecords.length}`);
        
        // If we got fewer records than the page size, we're done
        if (data.records.length < pageSize) {
          console.log("Received fewer records than page size, assuming end of data");
          hasMoreRecords = false;
          break;
        }
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
        hasMoreRecords = false;
        break;
      }
      
      // Wait a bit longer before retry on network errors
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }
    
    currentPage++;
    
    // Safety check to prevent infinite loops
    if (currentPage > 10) {
      console.warn("Reached maximum number of pages (10), breaking loop");
      hasMoreRecords = false;
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
    const debugMode = url.searchParams.get('debug') === 'true';
    
    console.log(`Starting kimarite data fetch process...`);
    console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
    
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Fetch all pages of data
    const kimarites = await fetchAllPages();
    
    if (kimarites.length === 0) {
      console.log("No records returned from API. Creating log entry and returning.");
      
      // Log the empty run
      try {
        await supabaseClient
          .from('data_import_logs')
          .insert({
            source: 'sumo_api_kimarite',
            records_processed: 0,
            success: true,
            notes: "API returned zero records"
          });
      } catch (logError) {
        console.warn("Could not log import:", logError);
      }
      
      return new Response(JSON.stringify({ 
        message: "No records to process. API returned zero records.",
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    console.log(`Successfully fetched ${kimarites.length} total records`);
    
    // Process data in chunks to avoid hitting any size limitations
    const chunkSize = debugMode ? 10 : 100;
    let processedCount = 0;
    
    // First, clear the existing table to ensure a fresh import
    // This is appropriate for kimarite data since it's a relatively small dataset
    if (!debugMode) {
      console.log("Clearing existing kimarite data for fresh import");
      const { error: clearError } = await supabaseClient
        .from('kimarites')
        .delete()
        .neq('id', 0); // This is a way to delete all records
        
      if (clearError) {
        console.error("Error clearing existing data:", clearError);
        throw new Error(`Database error when clearing data: ${clearError.message || JSON.stringify(clearError)}`);
      }
    }
    
    for (let i = 0; i < kimarites.length; i += chunkSize) {
      const chunk = kimarites.slice(i, i + chunkSize);
      console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(kimarites.length / chunkSize)}`);
      
      // Transform data for database
      const transformedChunk = chunk.map(kimarite => {
        // Parse the lastUsage date from "YYYYMM-DD" format to "YYYY-MM-DD"
        let lastUsageDate = null;
        if (kimarite.lastUsage) {
          try {
            // Extract year, month, and day from the format "YYYYMM-DD" or "YYYYMM-D" (single digit day)
            const match = kimarite.lastUsage.match(/^(\d{4})(\d{2})-(\d{1,2})$/);
            if (match) {
              const [_, year, month, day] = match;
              // Format as ISO date "YYYY-MM-DD" - ensure day has leading zero if needed
              const paddedDay = day.padStart(2, '0');
              lastUsageDate = `${year}-${month}-${paddedDay}`;
              
              // Validate the date is legitimate
              const testDate = new Date(lastUsageDate);
              if (isNaN(testDate.getTime())) {
                console.warn(`Invalid date format for kimarite "${kimarite.kimarite}": ${kimarite.lastUsage}`);
                lastUsageDate = null; // Use null instead of original string for invalid dates
              }
            } else {
              console.warn(`Unexpected date format for kimarite "${kimarite.kimarite}": ${kimarite.lastUsage}`);
              lastUsageDate = null; // Use null instead of original string
            }
          } catch (e) {
            console.warn(`Error parsing date for kimarite "${kimarite.kimarite}": ${e instanceof Error ? e.message : String(e)}`);
            lastUsageDate = null; // Use null instead of original string
          }
        }
        
        return {
          kimarite: kimarite.kimarite,
          count: kimarite.count,
          last_usage: lastUsageDate,
          updated_at: new Date().toISOString()
        };
      });
      
      // Log the first record in debug mode
      if (debugMode && chunk.length > 0) {
        console.log("Sample record to insert:");
        console.log(JSON.stringify(transformedChunk[0], null, 2));
      }
      
      const { error } = await supabaseClient
        .from('kimarites')
        .upsert(transformedChunk, { 
          onConflict: 'kimarite',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error("Upsert error details:", error);
        throw new Error(`Database error on chunk ${Math.floor(i / chunkSize) + 1}: ${error.message || JSON.stringify(error)}`);
      }
      
      processedCount += chunk.length;
      console.log(`Successfully processed ${processedCount}/${kimarites.length} records`);
      
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
          source: 'sumo_api_kimarite',
          records_processed: processedCount,
          success: true
        });
      console.log("Import logged successfully");
    } catch (logError) {
      console.warn("Could not log import:", logError);
    }
    
    return new Response(JSON.stringify({ 
      message: `Successfully processed ${processedCount} kimarite records`,
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
          source: 'sumo_api_kimarite',
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