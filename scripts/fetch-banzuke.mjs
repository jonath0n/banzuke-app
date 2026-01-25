#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const API_URLS = {
  en: "https://sumo.or.jp/EnHonbashoBanzuke/indexAjax/1/1/",
  jp: "https://sumo.or.jp/ResultBanzuke/tableAjax/1/1/",
};

const rootDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(rootDir, "../public/latest-banzuke.json");

async function fetchBanzuke(lang, url) {
  console.log(`Fetching ${lang.toUpperCase()} banzuke from ${url}`);
  
  const response = await fetch(url, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${lang} banzuke: HTTP ${response.status}`);
  }

  return response.json();
}

async function main() {
  const payloads = {};
  const sources = {};

  for (const [lang, url] of Object.entries(API_URLS)) {
    payloads[lang] = await fetchBanzuke(lang, url);
    sources[lang] = url;
  }

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    sources,
    payloads,
  };

  await writeFile(outputPath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Saved banzuke data to ${outputPath}`);
  console.log(`Fetched at: ${snapshot.fetchedAt}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exitCode = 1;
});
