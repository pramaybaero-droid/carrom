// Utility helpers shared across the app

const LIMIT_POINTS = 25;
const LIMIT_BOARDS = 8;
const QUEEN_CUTOFF = 22;
const MAX_SETS = 3;
const STORAGE_KEY = "striker.matches.v1";
const ACTIVE_KEY = "striker.active.v1";

const SCORE_FORMATS = {
  standard: { label: "25 points / 8 boards", limitPoints: 25, limitBoards: 8, queenCutoff: 22 },
  quick:    { label: "15 points / 4 boards", limitPoints: 15, limitBoards: 4, queenCutoff: 11 },
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtTime(ms) {
  if (!ms || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}

function cleanName(name, fallback) {
  const n = String(name || "").trim();
  return n || fallback;
}

function normalizeCompetitorForLive(player, fallbackLabel, fallbackColor) {
  const source = player || {};
  const members = Array.isArray(source.members)
    ? source.members.map(n => cleanName(n, "")).filter(Boolean)
    : [];
  const fallbackName = members.length ? members.join(" / ") : fallbackLabel;
  const name = cleanName(source.name, fallbackName);
  return {
    ...source,
    label: cleanName(source.label, fallbackLabel),
    name,
    members: members.length ? members : [name],
    color: cleanName(source.color, fallbackColor),
    setPts: Number(source.setPts) || 0,
    setsWon: Number(source.setsWon) || 0,
  };
}

function safeTotalSets(value) {
  return Number(value) === 1 ? 1 : 3;
}

function setsNeeded(matchOrSets) {
  const total = typeof matchOrSets === "number" ? safeTotalSets(matchOrSets) : safeTotalSets(matchOrSets?.totalSets);
  return total === 1 ? 1 : 2;
}

function matchSetsToWin(match) {
  const total = Number(match?.totalSets);
  if (total === 1) return 1;
  if (total === 3) return 2;
  return Number(match?.setsToWin) === 1 ? 1 : 2;
}

function scoreRules(format) {
  return SCORE_FORMATS[format] || SCORE_FORMATS.standard;
}

function matchLimitPoints(match) {
  return Number(match?.limitPoints) || scoreRules(match?.scoreFormat).limitPoints;
}

function matchLimitBoards(match) {
  return Number(match?.limitBoards) || scoreRules(match?.scoreFormat).limitBoards;
}

function matchQueenCutoff(match) {
  return Number(match?.queenCutoff) || scoreRules(match?.scoreFormat).queenCutoff;
}

function queenBonusCounts(match, playerKey) {
  const current = match?.[playerKey]?.setPts || 0;
  return current <= matchQueenCutoff(match);
}

function defaultMatch({
  name1 = "Player One",
  name2 = "Player Two",
  teamA1 = "Team A Player 1",
  teamA2 = "Team A Player 2",
  teamB1 = "Team B Player 1",
  teamB2 = "Team B Player 2",
  matchType = "singles",
  totalSets = MAX_SETS,
  scoreFormat = "standard",
  color1 = "White",
  color2 = "Black",
} = {}) {
  const isDoubles = matchType === "doubles";
  const normalizedScoreFormat = SCORE_FORMATS[scoreFormat] ? scoreFormat : "standard";
  const rules = scoreRules(normalizedScoreFormat);
  const setCount = safeTotalSets(totalSets);
  const p1Members = isDoubles
    ? [cleanName(teamA1, "Team A Player 1"), cleanName(teamA2, "Team A Player 2")]
    : [cleanName(name1, "Player One")];
  const p2Members = isDoubles
    ? [cleanName(teamB1, "Team B Player 1"), cleanName(teamB2, "Team B Player 2")]
    : [cleanName(name2, "Player Two")];

  return {
    id: uid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    phase: "setup",           // setup -> toss -> live -> over
    startedAt: null,
    endedAt: null,
    tossWinner: null,         // "p1" | "p2"
    tossChoice: null,         // "break" | "side"
    breakPlayer: null,        // "p1" | "p2"
    matchType: isDoubles ? "doubles" : "singles",
    totalSets: setCount,
    setsToWin: setsNeeded(setCount),
    scoreFormat: normalizedScoreFormat,
    limitPoints: rules.limitPoints,
    limitBoards: rules.limitBoards,
    queenCutoff: rules.queenCutoff,
    setNo: 1,
    boardNo: 1,
    p1: {
      label: isDoubles ? "Team A" : "Player One",
      name: isDoubles ? p1Members.join(" / ") : p1Members[0],
      members: p1Members,
      color: color1,
      setPts: 0,
      setsWon: 0,
    },
    p2: {
      label: isDoubles ? "Team B" : "Player Two",
      name: isDoubles ? p2Members.join(" / ") : p2Members[0],
      members: p2Members,
      color: color2,
      setPts: 0,
      setsWon: 0,
    },
    history: [],              // rows of board results (also set dividers)
    stack: [],                // undo snapshots
  };
}

function normalizeMatch(raw) {
  if (!raw || typeof raw !== "object") return null;

  const scoreFormat = SCORE_FORMATS[raw.scoreFormat]
    ? raw.scoreFormat
    : (Number(raw.limitPoints) === 15 || Number(raw.limitBoards) === 4 ? "quick" : "standard");
  const rules = scoreRules(scoreFormat);
  const totalSets = Number(raw.totalSets) === 1 ? 1 : Number(raw.totalSets) === 3 ? 3 : Number(raw.setsToWin) === 1 ? 1 : 3;
  const isDoubles = raw.matchType === "doubles" ||
    (Array.isArray(raw.p1?.members) && raw.p1.members.length > 1) ||
    (Array.isArray(raw.p2?.members) && raw.p2.members.length > 1);
  const phase = ["setup", "toss", "live", "over"].includes(raw.phase) ? raw.phase : "setup";
  const p1 = normalizeCompetitorForLive(raw.p1, isDoubles ? "Team A" : "Player One", "White");
  const p2 = normalizeCompetitorForLive(raw.p2, isDoubles ? "Team B" : "Player Two", "Black");

  return {
    ...raw,
    id: cleanName(raw.id, uid()),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    phase,
    startedAt: raw.startedAt || null,
    endedAt: raw.endedAt || null,
    tossWinner: raw.tossWinner === "p1" || raw.tossWinner === "p2" ? raw.tossWinner : null,
    tossChoice: raw.tossChoice === "break" || raw.tossChoice === "side" ? raw.tossChoice : null,
    breakPlayer: raw.breakPlayer === "p1" || raw.breakPlayer === "p2" ? raw.breakPlayer : null,
    matchType: isDoubles ? "doubles" : "singles",
    totalSets,
    setsToWin: matchSetsToWin({ totalSets }),
    scoreFormat,
    limitPoints: Number(raw.limitPoints) || rules.limitPoints,
    limitBoards: Number(raw.limitBoards) || rules.limitBoards,
    queenCutoff: Number(raw.queenCutoff) || rules.queenCutoff,
    setNo: Math.max(1, Number(raw.setNo) || 1),
    boardNo: Math.max(1, Number(raw.boardNo) || 1),
    p1,
    p2,
    history: Array.isArray(raw.history) ? raw.history : [],
    stack: Array.isArray(raw.stack) ? raw.stack : [],
  };
}

function matchWinner(m) {
  if (!m) return null;
  const needed = matchSetsToWin(m);
  if ((m.p1?.setsWon || 0) >= needed) return "p1";
  if ((m.p2?.setsWon || 0) >= needed) return "p2";
  return null;
}

// Save all matches blob to localStorage
function persistAll(matches, activeId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch (e) { console.warn("Persist error:", e); }
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const active = localStorage.getItem(ACTIVE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const matches = (Array.isArray(parsed) ? parsed : []).map(normalizeMatch).filter(Boolean);
    const activeId = matches.some(m => m.id === active) ? active : (matches[matches.length - 1]?.id || null);
    return { matches, activeId };
  } catch (e) {
    return { matches: [], activeId: null };
  }
}

// Exports
function downloadBlob(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

function exportJSON(match) {
  downloadBlob(`carrom-${(match.p1.name||"A")}-vs-${(match.p2.name||"B")}-${match.id}.json`,
               JSON.stringify(match, null, 2));
}

function exportCSV(match) {
  const rows = [["Set","Board","Winner","OppLeft","Queen","Pts","Set A","Set B","Time"]];
  (match.history || []).filter(h => h.kind === "board").forEach(h => {
    rows.push([h.set, h.board, h.winnerName, h.oppLeft, h.queen ? "Counted +3" : h.queenIgnored ? "Ignored" : "No",
               h.pts, h.setA, h.setB, new Date(h.at).toISOString()]);
  });
  const csv = rows.map(r => r.map(v => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(",")).join("\n");
  downloadBlob(`carrom-${(match.p1.name||"A")}-vs-${(match.p2.name||"B")}-${match.id}.csv`, csv, "text/csv");
}

// simple beep using WebAudio
let _audioCtx = null;
function ping(freq = 880, dur = 0.12, type = "sine", gain = 0.08) {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.stop(ctx.currentTime + dur + 0.02);
  } catch (e) { /* silent */ }
}
function chord(freqs, dur = 0.25) {
  freqs.forEach((f, i) => setTimeout(() => ping(f, dur, "triangle", 0.06), i * 80));
}

Object.assign(window, {
  LIMIT_POINTS, LIMIT_BOARDS, QUEEN_CUTOFF, MAX_SETS, SCORE_FORMATS, STORAGE_KEY, ACTIVE_KEY,
  uid, initials, fmtTime, fmtDate,
  cleanName, normalizeCompetitorForLive, normalizeMatch, safeTotalSets, setsNeeded, matchSetsToWin, scoreRules,
  matchLimitPoints, matchLimitBoards, matchQueenCutoff, queenBonusCounts,
  defaultMatch, matchWinner,
  persistAll, loadAll, exportJSON, exportCSV,
  ping, chord,
});
