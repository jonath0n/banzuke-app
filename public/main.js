const DEFAULT_API_URL = "https://sumo.or.jp/EnHonbashoBanzuke/indexAjax/1/1/";
const urlParamOverride = new URLSearchParams(window.location.search).get("api");
const API_URL = window.BANZUKE_API_URL || urlParamOverride || DEFAULT_API_URL;

const elements = {
  status: document.getElementById("status"),
  results: document.getElementById("banzuke-results"),
  bashoName: document.getElementById("basho-name"),
  bashoDates: document.getElementById("basho-dates"),
  banzukeAnnouncement: document.getElementById("banzuke-announcement"),
  lastUpdated: document.getElementById("last-updated"),
  rankFilter: document.getElementById("rank-filter"),
  prefFilter: document.getElementById("pref-filter"),
  searchInput: document.getElementById("search-input"),
};

const state = {
  rows: [],
  metadata: null,
};

async function loadBanzuke() {
  try {
    const liveResponse = await fetch(API_URL, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (!liveResponse.ok) {
      throw new Error(`Upstream error ${liveResponse.status}`);
    }

    const payload = await liveResponse.json();
    applyPayload(payload, "Live JSON");
  } catch (err) {
    console.warn("Falling back to bundled sample data", err);
    elements.status.textContent =
      "Live fetch failed. Showing bundled sample data instead.";

    const fallbackResponse = await fetch("./sample-data.json");
    const fallbackPayload = await fallbackResponse.json();
    applyPayload(fallbackPayload, "Sample data");
  }
}

function applyPayload(payload, sourceLabel) {
  const cleanRows = (payload.BanzukeTable || []).filter(
    (entry) => entry && entry.shikona && entry.shikona.trim()
  );

  cleanRows.sort((a, b) => Number(a.sort) - Number(b.sort));

  state.rows = cleanRows;
  state.metadata = payload;

  hydrateFilters(cleanRows);
  updateSummary(payload, sourceLabel);
  renderRows(cleanRows);
  elements.status.hidden = true;
  elements.results.hidden = false;
}

function hydrateFilters(rows) {
  const rankOptions = new Map();
  const prefOptions = new Set();

  rows.forEach((row) => {
    rankOptions.set(row.banzuke_name, row.rank);
    prefOptions.add(row.pref_name);
  });

  const sortedRanks = [...rankOptions.entries()].sort((a, b) => a[1] - b[1]);
  const sortedPrefs = [...prefOptions.values()].filter(Boolean).sort();

  populateSelect(elements.rankFilter, sortedRanks.map(([name]) => name));
  populateSelect(elements.prefFilter, sortedPrefs);
}

function populateSelect(selectEl, values) {
  const currentValue = selectEl.value;
  selectEl.querySelectorAll("option:not([value='all'])").forEach((opt) => opt.remove());
  const fragment = document.createDocumentFragment();
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    fragment.appendChild(option);
  });
  selectEl.appendChild(fragment);
  selectEl.value = values.includes(currentValue) ? currentValue : "all";
}

function updateSummary(payload, sourceLabel) {
  const info = payload.BashoInfo || {};
  const start = formatDate(info.start_date);
  const end = formatDate(info.end_date);
  elements.bashoName.textContent = `${payload.basho_name || "—"} (${payload.Kakuzuke})`;
  elements.bashoDates.textContent = start && end ? `${start} → ${end}` : "—";
  elements.banzukeAnnouncement.textContent = formatDateTime(
    info.banzuke_announcement_datetime
  );
  elements.lastUpdated.textContent = `${sourceLabel} • ${new Date().toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function renderRows(rows) {
  if (!rows.length) {
    elements.results.innerHTML = "";
    elements.results.hidden = true;
    elements.status.hidden = false;
    elements.status.textContent = "No rikishi match your filters yet.";
    return;
  }

  const fragment = document.createDocumentFragment();

  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "card";

    const rankNewBadge = row.rank_new
      ? `<span class="badge--pill">${row.rank_new}</span>`
      : "";

    card.innerHTML = `
      <div class="card__header">
        <span class="card__rank">${row.banzuke_name}</span>
        ${rankNewBadge}
      </div>
      <h2 class="card__shikona">${row.shikona}</h2>
      <div class="card__meta">
        <span>Heya: <strong>${row.heya_name}</strong></span>
        <span>Origin: <strong>${row.pref_name}</strong></span>
        <span>Number: <strong>${row.numberKanji}</strong></span>
      </div>
    `;

    fragment.appendChild(card);
  });

  elements.results.innerHTML = "";
  elements.results.appendChild(fragment);
  elements.results.hidden = false;
}

function applyFilters() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const rankValue = elements.rankFilter.value;
  const prefValue = elements.prefFilter.value;

  const filtered = state.rows.filter((row) => {
    const matchesRank = rankValue === "all" || row.banzuke_name === rankValue;
    const matchesPref = prefValue === "all" || row.pref_name === prefValue;
    const matchesSearch =
      !searchTerm ||
      [row.shikona, row.heya_name, row.pref_name]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(searchTerm));
    return matchesRank && matchesPref && matchesSearch;
  });

  renderRows(filtered);
}

elements.rankFilter.addEventListener("change", applyFilters);
elements.prefFilter.addEventListener("change", applyFilters);
elements.searchInput.addEventListener("input", debounce(applyFilters, 150));

function debounce(fn, delay = 200) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

loadBanzuke();
