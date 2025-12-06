#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const API_URL = "https://sumo.or.jp/EnHonbashoBanzuke/indexAjax/1/1/";
const rootDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(rootDir, "../public/latest-banzuke.json");

async function main() {
  const response = await fetch(API_URL, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  if (!response.ok) {
    throw new Error(`Failed to download banzuke: HTTP ${response.status}`);
  }

  const payload = await response.json();
  const enriched = {
    fetchedAt: new Date().toISOString(),
    source: API_URL,
    payload,
  };

  await writeFile(outputPath, JSON.stringify(enriched, null, 2), "utf8");
  console.log(`Saved fresh banzuke data to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
