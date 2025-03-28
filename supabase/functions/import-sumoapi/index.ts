import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE_URL = "https://www.sumo-api.com/api/rikishis";

interface Rikishi {
  id: number;
  sumodbId?: number;
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
  createdAt?: string;
}

interface RikishiApiResponse {
  limit: number;
  skip: number;
  total: number;
  records: Rikishi[];
}

async function fetchRikishiList(
  skip: number,
  includeRetired: boolean = false
): Promise<RikishiApiResponse> {
  const queryParams = new URLSearchParams({
    skip: skip.toString(),
    limit: "1000", // API limit explicitly set
    ...(includeRetired ? { intai: "true" } : {}),
  });

  const url = `${API_BASE_URL}?${queryParams.toString()}`;
  console.log(`Fetching rikishi list with skip=${skip}, URL: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error (${response.status}): ${response.statusText}`);
  }

  return (await response.json()) as RikishiApiResponse;
}

async function processRikishiBatch(
  supabaseClient: any,
  rikishis: Rikishi[],
  batchSize: number = 50
): Promise<{ rikishisCount: number }> {
  let rikishisCount = 0;

  for (let i = 0; i < rikishis.length; i += batchSize) {
    const batch = rikishis.slice(i, i + batchSize).map((rikishi) => ({
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
      created_at: rikishi.createdAt,
    }));

    const { error } = await supabaseClient
      .from("rikishis")
      .upsert(batch, { onConflict: "id" });

    if (error) throw new Error(`Supabase upsert error: ${error.message}`);

    rikishisCount += batch.length;
  }

  return { rikishisCount };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    const url = new URL(req.url);
    const skip = parseInt(url.searchParams.get("skip") || "0");
    const processBatchSize = parseInt(
      url.searchParams.get("processBatchSize") || "50"
    );
    const includeRetired = url.searchParams.get("intai") === "true";

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const data = await fetchRikishiList(skip, includeRetired);

    if (!data.records.length) {
      return new Response(
        JSON.stringify({
          message: "No records to process.",
          skip,
          total: data.total,
          timestamp: new Date().toISOString(),
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stats = await processRikishiBatch(
      supabaseClient,
      data.records,
      processBatchSize
    );

    const nextSkip = skip + data.records.length;
    const isComplete = nextSkip >= data.total;

    return new Response(
      JSON.stringify({
        message: `Processed ${stats.rikishisCount} records`,
        current_skip: skip,
        next_skip: nextSkip,
        total_records: data.total,
        is_complete: isComplete,
        percent_complete: ((nextSkip / data.total) * 100).toFixed(2) + "%",
        stats,
        next_url: isComplete
          ? null
          : `${url.origin}${url.pathname}?skip=${nextSkip}${
              includeRetired ? "&intai=true" : ""
            }`,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
