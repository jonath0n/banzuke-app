const DATA_URL = "./latest-banzuke.json";
const SAMPLE_URL = "./sample-data.json";
const DEFAULT_LANGUAGE = "en";
const searchParams = new URLSearchParams(window.location.search);
const langParam = searchParams.get("lang");
let currentLanguage = normalizeLanguage(window.BANZUKE_LANG || langParam || DEFAULT_LANGUAGE);
let cachedSnapshot = null;

const elements = {
  status: document.getElementById("status"),
  results: document.getElementById("banzuke-results"),
  bashoName: document.getElementById("basho-name"),
  bashoDates: document.getElementById("basho-dates"),
  banzukeAnnouncement: document.getElementById("banzuke-announcement"),
};

async function loadBanzuke(language = currentLanguage) {
  currentLanguage = normalizeLanguage(language);
  setLanguageContext(currentLanguage);
  showLoading();

  try {
    if (!cachedSnapshot) {
      const snapshotResponse = await fetch(DATA_URL, { cache: "no-store" });
      if (!snapshotResponse.ok) {
        throw new Error(`Static JSON failed with ${snapshotResponse.status}`);
      }
      cachedSnapshot = await snapshotResponse.json();
    }

    const payload = pickPayloadForLanguage(cachedSnapshot, currentLanguage);
    if (!payload) {
      throw new Error(`No payload available for language "${currentLanguage}"`);
    }

    applyPayload(payload, describeSnapshot(cachedSnapshot, currentLanguage));
  } catch (err) {
    console.warn("Static snapshot load failed", err);
    try {
      await loadSampleFallback();
    } catch (fallbackErr) {
      console.error("Unable to load bundled sample data", fallbackErr);
      elements.status.textContent =
        "Could not load the banzuke. Please refresh to try again.";
    }
  }
}

async function loadSampleFallback() {
  elements.status.textContent = "Static snapshot unavailable. Showing bundled sample data.";
  const fallbackResponse = await fetch(new URL(SAMPLE_URL, import.meta.url));
  if (!fallbackResponse.ok) {
    throw new Error(`Fallback fetch failed with ${fallbackResponse.status}`);
  }
  const fallbackPayload = await fallbackResponse.json();
  applyPayload(fallbackPayload, "Sample data");
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
  const bashoName = payload.basho_name || "—";
  const division = payload.Kakuzuke ? ` (${payload.Kakuzuke.replace(/&nbsp;/g, " ")})` : "";
  elements.bashoName.textContent = `${bashoName}${division}`;
  elements.bashoDates.textContent = start && end ? `${start} → ${end}` : "—";
  elements.banzukeAnnouncement.textContent = formatDateTime(
    info.banzuke_announcement_datetime
  );
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
    const sample = group.east || group.west;
    if (sample) {
      rowEl.dataset.rankLevel = getRankLevel(sample);
    }

    const inner = document.createElement("div");
    inner.className = "rank-row__inner";
    inner.appendChild(createSideCell(group.east, "East"));

    const labelEl = document.createElement("div");
    labelEl.className = "rank-row__label";
    labelEl.textContent = formatRankLabel(group) || "—";
    inner.appendChild(labelEl);

    inner.appendChild(createSideCell(group.west, "West"));
    rowEl.appendChild(inner);

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

function createSideCell(rikishi, sideLabel) {
  const cell = document.createElement("div");
  cell.className = "side-cell";
  cell.dataset.side = sideLabel.toLowerCase();

  const sideTag = document.createElement("span");
  sideTag.className = "side-cell__side";
  sideTag.textContent = sideLabel === "West" ? "W" : "E";
  const nameSpan = document.createElement("span");
  nameSpan.className = "rikishi-name";
  nameSpan.textContent = rikishi?.shikona || "—";

  const infoWrapper = document.createElement("span");
  infoWrapper.className = "side-cell__info";

  if (rikishi?.photo) {
    const avatar = document.createElement("img");
    avatar.src = buildPhotoUrl(rikishi.photo);
    avatar.alt = `${rikishi.shikona || "Rikishi"} portrait`;
    avatar.loading = "lazy";
    avatar.width = 48;
    avatar.height = 48;
    infoWrapper.appendChild(avatar);
  }

  if (sideLabel === "East") {
    infoWrapper.appendChild(nameSpan);
    if (rikishi?.photo) {
      const avatar = infoWrapper.querySelector("img");
      infoWrapper.appendChild(avatar);
    }
    if (rikishi?.rank_new) {
      cell.appendChild(createRankBadge(rikishi.rank_new));
    }
    cell.appendChild(sideTag);
    cell.appendChild(infoWrapper);
  } else {
    if (rikishi?.photo) {
      const avatar = infoWrapper.querySelector("img");
      infoWrapper.appendChild(avatar);
    }
    infoWrapper.appendChild(nameSpan);
    cell.appendChild(infoWrapper);
    cell.appendChild(sideTag);
    if (rikishi?.rank_new) {
      cell.appendChild(createRankBadge(rikishi.rank_new));
    }
  }

  return cell;
}

function createRankBadge(text) {
  const badge = document.createElement("span");
  badge.className = "badge--pill";
  badge.textContent = text;
  return badge;
}

function buildPhotoUrl(filename) {
  return `https://www.sumo.or.jp/img/sumo_data/rikishi/60x60/${filename}`;
}

function formatRankLabel(group) {
  const sample = group.east || group.west;
  if (!sample) return group.name || "";
  const rank = Number(sample.rank);
  if (rank === 100) return "Y";
  if (rank === 200) return "O";
  if (rank === 300) return "S";
  if (rank === 400) return "K";
  if (rank >= 500) {
    const number =
      sample.number != null && sample.number !== ""
        ? String(sample.number)
        : sample.numberKanji || "";
    return `M${number}`;
  }
  return group.name || "";
}

function getRankLevel(row) {
  const rank = Number(row.rank);
  if (rank === 100) return "yokozuna";
  if (rank === 200) return "ozeki";
  if (rank === 300) return "sekiwake";
  if (rank === 400) return "komusubi";
  return "maegashira";
}

function pickPayloadForLanguage(snapshot, language) {
  if (!snapshot || typeof snapshot !== "object") return null;
  if (snapshot.payloads && snapshot.payloads[language]) {
    return snapshot.payloads[language];
  }
  if (snapshot.payloads && snapshot.payloads[DEFAULT_LANGUAGE]) {
    return snapshot.payloads[DEFAULT_LANGUAGE];
  }
  if (snapshot.payload) {
    return snapshot.payload;
  }
  return snapshot;
}

function describeSnapshot(snapshot, language) {
  const parts = ["Static snapshot"];
  if (snapshot?.fetchedAt) {
    try {
      const date = new Date(snapshot.fetchedAt);
      parts.push(Number.isNaN(date.getTime()) ? snapshot.fetchedAt : date.toLocaleString());
    } catch {
      parts.push(snapshot.fetchedAt);
    }
  }
  if (snapshot?.sources?.[language]) {
    parts.push(snapshot.sources[language]);
  }
  return parts.join(" • ");
}

function normalizeLanguage(value) {
  return value === "jp" ? "jp" : "en";
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

loadBanzuke();
