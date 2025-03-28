// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Define the base API endpoint
const API_BASE_URL = "https://www.sumo-api.com/api/rikishis";

Deno.serve(async (req: Request) => {
  try {
    // Parse URL to check for query parameters
    const url = new URL(req.url);
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      limit: "10", // Just fetch a few records for testing
      measurements: "true",
      ranks: "true",
      shikonas: "true"
    });
    
    // Make a direct request to the API
    const apiUrl = `${API_BASE_URL}?${queryParams.toString()}`;
    console.log(`Testing API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API error (${response.status}): ${response.statusText}`);
    }
    
    // Get the raw text
    const rawText = await response.text();
    
    // Try to parse it as JSON
    let responseData;
    try {
      responseData = JSON.parse(rawText);
    } catch (e) {
      return new Response(JSON.stringify({
        error: "Could not parse API response as JSON",
        rawResponse: rawText.substring(0, 1000) // First 1000 chars
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // Check if we have records
    if (!responseData.records || !Array.isArray(responseData.records) || responseData.records.length === 0) {
      return new Response(JSON.stringify({
        error: "No records found in API response",
        apiResponse: responseData
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    
    // Analyze the first record's structure
    const sampleRikishi = responseData.records[0];
    const structure = {
      fields: Object.keys(sampleRikishi),
      hasMeasurementHistory: !!sampleRikishi.measurementHistory,
      hasRankHistory: !!sampleRikishi.rankHistory,
      hasShikonaHistory: !!sampleRikishi.shikonaHistory,
      // If histories exist, show their sample structure
      measurementSample: sampleRikishi.measurementHistory?.[0],
      rankSample: sampleRikishi.rankHistory?.[0],
      shikonaSample: sampleRikishi.shikonaHistory?.[0],
      // Count records in each history
      measurementsCount: sampleRikishi.measurementHistory?.length || 0,
      ranksCount: sampleRikishi.rankHistory?.length || 0,
      shikonasCount: sampleRikishi.shikonaHistory?.length || 0
    };
    
    return new Response(JSON.stringify({
      message: "API response analysis",
      totalRecords: responseData.records.length,
      sampleRikishiId: sampleRikishi.id, 
      sampleRikishiName: sampleRikishi.shikonaEn,
      structure: structure,
      rawApiUrl: apiUrl
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});