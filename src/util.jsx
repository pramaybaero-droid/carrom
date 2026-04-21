// Utility helpers shared across the app

const LIMIT_POINTS = 25;
const LIMIT_BOARDS = 8;
const MAX_SETS = 3;
const STORAGE_KEY = "striker.matches.v1";
const ACTIVE_KEY = "striker.active.v1";

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

function defaultMatch({ name1 = "Player One", name2 = "Player Two", color1 = "White", color2 = "Black" } = {}) {
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
    setNo: 1,
    boardNo: 1,
    p1: { name: name1, color: color1, setPts: 0, setsWon: 0 },
    p2: { name: name2, color: color2, setPts: 0, setsWon: 0 },
    history: [],              // rows of board results (also set dividers)
    stack: [],                // undo snapshots
  };
}

function matchWinner(m) {
  if (!m) return null;
  if (m.p1.setsWon >= 2) return "p1";
  if (m.p2.setsWon >= 2) return "p2";
  return null;
}

// Save all matches blob to localStorage
function persistAll(matches, activeId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  } catch (e) { console.warn("Persist error:", e); }
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const active = localStorage.getItem(ACTIVE_KEY);
    return { matches: raw ? JSON.parse(raw) : [], activeId: active };
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
  const rows = [["Set","Board","Winner","OppLeft","Queen+3","Pts","Set A","Set B","Time"]];
  (match.history || []).filter(h => h.kind === "board").forEach(h => {
    rows.push([h.set, h.board, h.winnerName, h.oppLeft, h.queen ? "Yes" : "No",
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
  LIMIT_POINTS, LIMIT_BOARDS, MAX_SETS, STORAGE_KEY, ACTIVE_KEY,
  uid, initials, fmtTime, fmtDate,
  defaultMatch, matchWinner,
  persistAll, loadAll, exportJSON, exportCSV,
  ping, chord,
});
