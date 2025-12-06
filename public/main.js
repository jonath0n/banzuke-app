const API_URLS = {
  en: "https://sumo.or.jp/EnHonbashoBanzuke/indexAjax/1/1/",
  jp: "https://sumo.or.jp/ResultBanzuke/tableAjax/1/1/",
};
// Free CORS proxy used when the Japanese endpoint blocks cross-origin requests.
const CORS_PROXY = "https://cors.isomorphic-git.org/";
const searchParams = new URLSearchParams(window.location.search);
const urlParamOverride = searchParams.get("api");
const langParam = searchParams.get("lang");
const API_OVERRIDE = window.BANZUKE_API_URL || urlParamOverride;
const DEFAULT_LANGUAGE = "en";
let currentLanguage = normalizeLanguage(window.BANZUKE_LANG || langParam || DEFAULT_LANGUAGE);

const elements = {
  status: document.getElementById("status"),
  results: document.getElementById("banzuke-results"),
  bashoName: document.getElementById("basho-name"),
  bashoDates: document.getElementById("basho-dates"),
  banzukeAnnouncement: document.getElementById("banzuke-announcement"),
  lastUpdated: document.getElementById("last-updated"),
  languageButtons: Array.from(document.querySelectorAll("[data-language]")),
};

elements.languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetLanguage = normalizeLanguage(button.dataset.language);
    if (targetLanguage !== currentLanguage) {
      loadBanzuke(targetLanguage);
    }
  });
});

async function loadBanzuke(language = currentLanguage, options = {}) {
  const { useProxy = false } = options;
  currentLanguage = normalizeLanguage(language);
  setActiveLanguage(currentLanguage);
  showLoading();
  const apiUrl = getApiUrl(currentLanguage, { useProxy });

  try {
    const liveResponse = await fetch(apiUrl, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (!liveResponse.ok) {
      throw new Error(`Upstream error ${liveResponse.status}`);
    }

    const payload = await liveResponse.json();
    applyPayload(payload, getSourceLabel("live", { useProxy }));
  } catch (err) {
    if (!useProxy && shouldTryProxy(currentLanguage)) {
      console.warn("Direct fetch failed, retrying via CORS proxy", err);
      return loadBanzuke(currentLanguage, { useProxy: true });
    }

    console.warn("Falling back to bundled sample data", err);
    elements.status.textContent =
      "Live fetch failed. Showing bundled sample data instead.";

    try {
      const fallbackUrl = new URL("./sample-data.json", import.meta.url);
      const fallbackResponse = await fetch(fallbackUrl);

      if (!fallbackResponse.ok) {
        throw new Error(`Fallback fetch failed with ${fallbackResponse.status}`);
      }

      const fallbackPayload = await fallbackResponse.json();
      applyPayload(fallbackPayload, getSourceLabel("sample"));
    } catch (fallbackErr) {
      console.error("Unable to load bundled sample data", fallbackErr);
      elements.status.textContent =
        "Could not load the banzuke. Please refresh to try again.";
    }
  }
}

function applyPayload(payload, sourceLabel) {
  const cleanRows = (payload.BanzukeTable || []).filter(
    (entry) => entry && entry.shikona && entry.shikona.trim()
  );

  cleanRows.sort((a, b) => Number(a.sort) - Number(b.sort));

  updateSummary(payload, sourceLabel);
  renderRows(cleanRows);
  elements.status.hidden = true;
  elements.results.hidden = false;
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
    elements.status.textContent = "No rikishi available right now.";
    return;
  }

  const grouped = groupRowsByRank(rows);
  const fragment = document.createDocumentFragment();

  grouped.forEach((group) => {
    const rowEl = document.createElement("div");
    rowEl.className = "rank-row";

    rowEl.appendChild(createSideCard(group.east, "East"));

    const labelEl = document.createElement("div");
    labelEl.className = "rank-row__label";
    labelEl.textContent = group.name || "—";
    rowEl.appendChild(labelEl);

    rowEl.appendChild(createSideCard(group.west, "West"));

    fragment.appendChild(rowEl);
  });

  elements.results.innerHTML = "";
  elements.results.appendChild(fragment);
  elements.results.hidden = false;
}

function groupRowsByRank(rows) {
  const groups = [];
  const lookup = new Map();

  rows.forEach((row) => {
    const key = row.banzuke_name || `Rank ${row.rank}`;
    if (!lookup.has(key)) {
      const group = { name: key, east: null, west: null };
      lookup.set(key, group);
      groups.push(group);
    }

    const group = lookup.get(key);
    const side = Number(row.ew) === 2 ? "west" : "east";

    if (!group[side]) {
      group[side] = row;
    } else if (!group.east) {
      group.east = row;
    } else if (!group.west) {
      group.west = row;
    }
  });

  return groups;
}

function createSideCard(rikishi, sideLabel) {
  const card = document.createElement("article");
  card.className = "card side-card";
  card.dataset.side = sideLabel.toLowerCase();

  const header = document.createElement("div");
  header.className = "card__header";

  const rankSpan = document.createElement("span");
  rankSpan.className = "card__rank";
  rankSpan.textContent = sideLabel;
  header.appendChild(rankSpan);

  if (rikishi && rikishi.rank_new) {
    const badge = document.createElement("span");
    badge.className = "badge--pill";
    badge.textContent = rikishi.rank_new;
    header.appendChild(badge);
  }

  card.appendChild(header);

  const shikona = document.createElement("h2");
  shikona.className = "card__shikona";
  shikona.textContent = rikishi?.shikona || "—";
  card.appendChild(shikona);

  const meta = document.createElement("div");
  meta.className = "card__meta";

  if (rikishi) {
    appendMeta(meta, "Heya", rikishi.heya_name);
    appendMeta(meta, "Origin", rikishi.pref_name);
  } else {
    meta.classList.add("card__meta--empty");
    meta.textContent = "Vacant";
  }

  card.appendChild(meta);
  return card;
}

function appendMeta(metaEl, label, value) {
  const span = document.createElement("span");
  span.textContent = `${label}: `;
  const strong = document.createElement("strong");
  strong.textContent = value || "—";
  span.appendChild(strong);
  metaEl.appendChild(span);
}

function normalizeLanguage(value) {
  return value === "jp" ? "jp" : "en";
}

function getApiUrl(language, { useProxy = false } = {}) {
  if (API_OVERRIDE) {
    return withLanguageParam(API_OVERRIDE, language);
  }
  const base = API_URLS[language] || API_URLS.en;
  if (useProxy) {
    return `${CORS_PROXY}${base}`;
  }
  return base;
}

function withLanguageParam(base, language) {
  try {
    const url = new URL(base, window.location.href);
    if (!url.searchParams.has("lang")) {
      url.searchParams.set("lang", language);
    } else if (url.searchParams.get("lang") !== language) {
      url.searchParams.set("lang", language);
    }
    return url.toString();
  } catch (err) {
    return base;
  }
}

function setActiveLanguage(language) {
  setLanguageContext(language);
  elements.languageButtons.forEach((button) => {
    if (normalizeLanguage(button.dataset.language) === language) {
      button.classList.add("lang-button--active");
    } else {
      button.classList.remove("lang-button--active");
    }
  });
}

function getSourceLabel(type, { useProxy = false } = {}) {
  if (type === "live") {
    if (API_OVERRIDE) {
      return "Live JSON (Custom)";
    }
    const langLabel = currentLanguage === "jp" ? "JP" : "EN";
    return useProxy ? `Live JSON (${langLabel} via proxy)` : `Live JSON (${langLabel})`;
  }
  return currentLanguage === "jp"
    ? "Sample data unavailable (showing EN)"
    : "Sample data (EN)";
}

function showLoading() {
  elements.status.hidden = false;
  elements.status.textContent = "Loading the banzuke…";
  elements.results.hidden = true;
}

function setLanguageContext(language) {
  if (language === "jp") {
    document.documentElement.lang = "ja";
    document.body.classList.add("lang-jp");
  } else {
    document.documentElement.lang = "en";
    document.body.classList.remove("lang-jp");
  }
}

function shouldTryProxy(language) {
  return !API_OVERRIDE && language === "jp";
}

loadBanzuke(currentLanguage);
