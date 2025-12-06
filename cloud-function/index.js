const API_URLS = {
  en: "https://sumo.or.jp/EnHonbashoBanzuke/indexAjax/1/1/",
  jp: "https://sumo.or.jp/ResultBanzuke/tableAjax/1/1/",
};
const DEFAULT_LANG = "en";

/**
 * HTTP Cloud Function that proxies the official banzuke endpoint.
 * Use Cloud Scheduler to ping it on a cadence or call it directly from the UI.
 */
exports.fetchBanzuke = async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({ error: "Only GET is supported" });
      return;
    }

    const upstreamUrl = resolveApiUrl(req.query.lang);
    const upstream = await fetch(upstreamUrl, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (!upstream.ok) {
      throw new Error(`Upstream responded with ${upstream.status}`);
    }

    const payload = await upstream.json();

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.set("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      fetchedAt: new Date().toISOString(),
      source: upstreamUrl,
      payload,
    });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: error.message });
  }
};

function resolveApiUrl(lang) {
  const normalized = String(lang || DEFAULT_LANG).toLowerCase();
  return API_URLS[normalized] || API_URLS[DEFAULT_LANG];
}
