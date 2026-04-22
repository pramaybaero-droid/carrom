// Generated from src/*.jsx. Do not edit directly.

// ---- util.jsx ----
const LIMIT_POINTS = 25;
const LIMIT_BOARDS = 8;
const QUEEN_CUTOFF = 22;
const MAX_SETS = 3;
const STORAGE_KEY = "striker.matches.v1";
const ACTIVE_KEY = "striker.active.v1";
const SCORE_FORMATS = {
  standard: {
    label: "25 points / 8 boards",
    limitPoints: 25,
    limitBoards: 8,
    queenCutoff: 22
  },
  quick: {
    label: "15 points / 4 boards",
    limitPoints: 15,
    limitBoards: 4,
    queenCutoff: 11
  }
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
  const m = Math.floor(s % 3600 / 60);
  const sec = s % 60;
  const pad = n => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
function cleanName(name, fallback) {
  const n = String(name || "").trim();
  return n || fallback;
}
function normalizeCompetitorForLive(player, fallbackLabel, fallbackColor) {
  const source = player || {};
  const members = Array.isArray(source.members) ? source.members.map(n => cleanName(n, "")).filter(Boolean) : [];
  const fallbackName = members.length ? members.join(" / ") : fallbackLabel;
  const name = cleanName(source.name, fallbackName);
  return {
    ...source,
    label: cleanName(source.label, fallbackLabel),
    name,
    members: members.length ? members : [name],
    color: cleanName(source.color, fallbackColor),
    setPts: Number(source.setPts) || 0,
    setsWon: Number(source.setsWon) || 0
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
  color2 = "Black"
} = {}) {
  const isDoubles = matchType === "doubles";
  const normalizedScoreFormat = SCORE_FORMATS[scoreFormat] ? scoreFormat : "standard";
  const rules = scoreRules(normalizedScoreFormat);
  const setCount = safeTotalSets(totalSets);
  const p1Members = isDoubles ? [cleanName(teamA1, "Team A Player 1"), cleanName(teamA2, "Team A Player 2")] : [cleanName(name1, "Player One")];
  const p2Members = isDoubles ? [cleanName(teamB1, "Team B Player 1"), cleanName(teamB2, "Team B Player 2")] : [cleanName(name2, "Player Two")];
  return {
    id: uid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    phase: "setup",
    startedAt: null,
    endedAt: null,
    tossWinner: null,
    tossChoice: null,
    breakPlayer: null,
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
      setsWon: 0
    },
    p2: {
      label: isDoubles ? "Team B" : "Player Two",
      name: isDoubles ? p2Members.join(" / ") : p2Members[0],
      members: p2Members,
      color: color2,
      setPts: 0,
      setsWon: 0
    },
    history: [],
    stack: []
  };
}
function normalizeMatch(raw) {
  if (!raw || typeof raw !== "object") return null;
  const scoreFormat = SCORE_FORMATS[raw.scoreFormat] ? raw.scoreFormat : Number(raw.limitPoints) === 15 || Number(raw.limitBoards) === 4 ? "quick" : "standard";
  const rules = scoreRules(scoreFormat);
  const totalSets = Number(raw.totalSets) === 1 ? 1 : Number(raw.totalSets) === 3 ? 3 : Number(raw.setsToWin) === 1 ? 1 : 3;
  const isDoubles = raw.matchType === "doubles" || Array.isArray(raw.p1?.members) && raw.p1.members.length > 1 || Array.isArray(raw.p2?.members) && raw.p2.members.length > 1;
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
    setsToWin: matchSetsToWin({
      totalSets
    }),
    scoreFormat,
    limitPoints: Number(raw.limitPoints) || rules.limitPoints,
    limitBoards: Number(raw.limitBoards) || rules.limitBoards,
    queenCutoff: Number(raw.queenCutoff) || rules.queenCutoff,
    setNo: Math.max(1, Number(raw.setNo) || 1),
    boardNo: Math.max(1, Number(raw.boardNo) || 1),
    p1,
    p2,
    history: Array.isArray(raw.history) ? raw.history : [],
    stack: Array.isArray(raw.stack) ? raw.stack : []
  };
}
function matchWinner(m) {
  if (!m) return null;
  const needed = matchSetsToWin(m);
  if ((m.p1?.setsWon || 0) >= needed) return "p1";
  if ((m.p2?.setsWon || 0) >= needed) return "p2";
  return null;
}
function persistAll(matches, activeId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);else localStorage.removeItem(ACTIVE_KEY);
  } catch (e) {
    console.warn("Persist error:", e);
  }
}
function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const active = localStorage.getItem(ACTIVE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const matches = (Array.isArray(parsed) ? parsed : []).map(normalizeMatch).filter(Boolean);
    const activeId = matches.some(m => m.id === active) ? active : matches[matches.length - 1]?.id || null;
    return {
      matches,
      activeId
    };
  } catch (e) {
    return {
      matches: [],
      activeId: null
    };
  }
}
function downloadBlob(filename, content, type = "application/json") {
  const blob = new Blob([content], {
    type
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function exportJSON(match) {
  downloadBlob(`carrom-${match.p1.name || "A"}-vs-${match.p2.name || "B"}-${match.id}.json`, JSON.stringify(match, null, 2));
}
function exportCSV(match) {
  const rows = [["Set", "Board", "Winner", "OppLeft", "Queen", "Pts", "Set A", "Set B", "Time"]];
  (match.history || []).filter(h => h.kind === "board").forEach(h => {
    rows.push([h.set, h.board, h.winnerName, h.oppLeft, h.queen ? "Counted +3" : h.queenIgnored ? "Ignored" : "No", h.pts, h.setA, h.setB, new Date(h.at).toISOString()]);
  });
  const csv = rows.map(r => r.map(v => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  downloadBlob(`carrom-${match.p1.name || "A"}-vs-${match.p2.name || "B"}-${match.id}.csv`, csv, "text/csv");
}
let _audioCtx = null;
function ping(freq = 880, dur = 0.12, type = "sine", gain = 0.08) {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.stop(ctx.currentTime + dur + 0.02);
  } catch (e) {}
}
function chord(freqs, dur = 0.25) {
  freqs.forEach((f, i) => setTimeout(() => ping(f, dur, "triangle", 0.06), i * 80));
}
Object.assign(window, {
  LIMIT_POINTS,
  LIMIT_BOARDS,
  QUEEN_CUTOFF,
  MAX_SETS,
  SCORE_FORMATS,
  STORAGE_KEY,
  ACTIVE_KEY,
  uid,
  initials,
  fmtTime,
  fmtDate,
  cleanName,
  normalizeCompetitorForLive,
  normalizeMatch,
  safeTotalSets,
  setsNeeded,
  matchSetsToWin,
  scoreRules,
  matchLimitPoints,
  matchLimitBoards,
  matchQueenCutoff,
  queenBonusCounts,
  defaultMatch,
  matchWinner,
  persistAll,
  loadAll,
  exportJSON,
  exportCSV,
  ping,
  chord
});


// ---- store.jsx ----
function useStore() {
  const [state, setState] = React.useState(() => {
    const {
      matches,
      activeId
    } = loadAll();
    return {
      matches: matches || [],
      activeId: activeId || null
    };
  });
  React.useEffect(() => {
    persistAll(state.matches, state.activeId);
  }, [state]);
  const createMatch = React.useCallback(opts => {
    const m = defaultMatch(opts);
    setState(s => ({
      matches: [...s.matches, m],
      activeId: m.id
    }));
    return m.id;
  }, []);
  const closeMatch = React.useCallback(id => {
    setState(s => {
      const matches = s.matches.filter(m => m.id !== id);
      const activeId = s.activeId === id ? matches[matches.length - 1]?.id || null : s.activeId;
      return {
        matches,
        activeId
      };
    });
  }, []);
  const setActive = React.useCallback(id => setState(s => ({
    ...s,
    activeId: id
  })), []);
  const updateMatch = React.useCallback((id, updater) => {
    setState(s => ({
      ...s,
      matches: s.matches.map(m => {
        if (m.id !== id) return m;
        const next = normalizeMatch(typeof updater === "function" ? updater(m) : {
          ...m,
          ...updater
        });
        if (!next) return m;
        next.updatedAt = Date.now();
        return next;
      })
    }));
  }, []);
  const active = state.matches.find(m => m.id === state.activeId) || null;
  return {
    state,
    active,
    createMatch,
    closeMatch,
    setActive,
    updateMatch
  };
}
function pushUndo(m) {
  const snap = JSON.stringify({
    ...m,
    stack: []
  });
  const stack = [...(m.stack || []), snap];
  if (stack.length > 100) stack.shift();
  return {
    ...m,
    stack
  };
}
function popUndo(m) {
  if (!m.stack || !m.stack.length) return null;
  const stack = [...m.stack];
  const last = stack.pop();
  const restored = JSON.parse(last);
  restored.stack = stack;
  return restored;
}
function awardBoard(m, toKey, oppLeft, queen) {
  if (matchWinner(m)) return m;
  const coinsLeft = Math.max(0, Math.min(9, oppLeft));
  const queenCounted = !!queen && queenBonusCounts(m, toKey);
  const queenIgnored = !!queen && !queenCounted;
  const pts = coinsLeft + (queenCounted ? 3 : 0);
  let next = pushUndo(m);
  const winnerName = next[toKey].name;
  next = {
    ...next,
    [toKey]: {
      ...next[toKey],
      setPts: next[toKey].setPts + pts
    }
  };
  const entry = {
    kind: "board",
    at: Date.now(),
    set: next.setNo,
    board: next.boardNo,
    winner: toKey,
    winnerName,
    oppLeft: coinsLeft,
    queen: queenCounted,
    queenRequested: !!queen,
    queenIgnored,
    queenCutoff: matchQueenCutoff(next),
    pts,
    setA: next.p1.setPts + (toKey === "p1" ? 0 : 0),
    setB: next.p2.setPts + (toKey === "p2" ? 0 : 0)
  };
  entry.setA = toKey === "p1" ? next.p1.setPts : next.p1.setPts;
  entry.setB = toKey === "p2" ? next.p2.setPts : next.p2.setPts;
  next = {
    ...next,
    history: [...next.history, entry],
    boardNo: next.boardNo + 1
  };
  const endedPts = next.p1.setPts >= matchLimitPoints(next) || next.p2.setPts >= matchLimitPoints(next);
  const endedBoards = next.boardNo > matchLimitBoards(next);
  if (endedPts || endedBoards) {
    next = finalizeSet(next);
  }
  return next;
}
function finalizeSet(m) {
  const a = m.p1.setPts,
    b = m.p2.setPts;
  let next = {
    ...m
  };
  let setWinner = null;
  if (a > b) {
    next = {
      ...next,
      p1: {
        ...next.p1,
        setsWon: next.p1.setsWon + 1
      }
    };
    setWinner = "p1";
  } else if (b > a) {
    next = {
      ...next,
      p2: {
        ...next.p2,
        setsWon: next.p2.setsWon + 1
      }
    };
    setWinner = "p2";
  }
  next.history = [...next.history, {
    kind: "set-end",
    at: Date.now(),
    set: next.setNo,
    winner: setWinner,
    winnerName: setWinner ? next[setWinner].name : "Tied",
    finalA: a,
    finalB: b
  }];
  const mw = matchWinner(next);
  if (mw) {
    next.phase = "over";
    next.endedAt = Date.now();
    return next;
  }
  next = {
    ...next,
    setNo: next.setNo + 1,
    boardNo: 1,
    p1: {
      ...next.p1,
      setPts: 0
    },
    p2: {
      ...next.p2,
      setPts: 0
    }
  };
  return next;
}
function resetSet(m) {
  const next = pushUndo(m);
  const setNo = next.setNo;
  return {
    ...next,
    history: next.history.filter(h => h.set !== setNo || h.kind === "set-end" && h.set < setNo),
    boardNo: 1,
    p1: {
      ...next.p1,
      setPts: 0
    },
    p2: {
      ...next.p2,
      setPts: 0
    }
  };
}
function resetMatch(m) {
  const next = pushUndo(m);
  return {
    ...next,
    setNo: 1,
    boardNo: 1,
    startedAt: Date.now(),
    endedAt: null,
    phase: "live",
    p1: {
      ...next.p1,
      setPts: 0,
      setsWon: 0
    },
    p2: {
      ...next.p2,
      setPts: 0,
      setsWon: 0
    },
    history: []
  };
}
function swapPlayers(m) {
  const next = pushUndo(m);
  return {
    ...next,
    p1: next.p2,
    p2: next.p1,
    breakPlayer: next.breakPlayer === "p1" ? "p2" : next.breakPlayer === "p2" ? "p1" : next.breakPlayer,
    tossWinner: next.tossWinner === "p1" ? "p2" : next.tossWinner === "p2" ? "p1" : next.tossWinner
  };
}
Object.assign(window, {
  useStore,
  pushUndo,
  popUndo,
  awardBoard,
  finalizeSet,
  resetSet,
  resetMatch,
  swapPlayers
});


// ---- parts.jsx ----
const {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} = React;
function BrandMark({
  size = 34
}) {
  return React.createElement("div", {
    className: "brand-mark",
    style: {
      width: size,
      height: size
    }
  });
}
function Coin({
  color = "white",
  size = 18
}) {
  return React.createElement("div", {
    className: `coin-dot ${color === "Black" || color === "black" ? "black" : ""}`,
    style: {
      width: size,
      height: size
    }
  });
}
function Avatar({
  name,
  color
}) {
  const cls = color === "Black" ? "black" : "white";
  return React.createElement("div", {
    className: `avatar ${cls}`,
    title: name
  }, initials(name));
}
function Chip({
  children,
  variant
}) {
  return React.createElement("span", {
    className: `chip ${variant || ""}`
  }, children);
}
function SetPips({
  won,
  max = 2
}) {
  const pips = [];
  for (let i = 0; i < max; i++) pips.push(React.createElement("span", {
    key: i,
    className: `pip ${i < won ? "won" : ""}`
  }));
  return React.createElement("div", {
    className: "setpips",
    title: `${won} of ${max} sets won`
  }, pips);
}
function Confetti({
  trigger,
  onDone
}) {
  const [bits, setBits] = useState([]);
  useEffect(() => {
    if (!trigger) return;
    const colors = ["#c8a65a", "#f3e7cf", "#d94562", "#6b8e3d", "#fbf5e8", "#8e1f30"];
    const arr = Array.from({
      length: 140
    }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 2.2 + Math.random() * 2,
      bg: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      w: 6 + Math.random() * 8,
      h: 10 + Math.random() * 14
    }));
    setBits(arr);
    const t = setTimeout(() => {
      setBits([]);
      onDone && onDone();
    }, 4500);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!bits.length) return null;
  return React.createElement("div", {
    className: "confetti"
  }, bits.map(b => React.createElement("i", {
    key: b.id,
    style: {
      left: `${b.left}vw`,
      background: b.bg,
      width: b.w,
      height: b.h,
      transform: `rotate(${b.rot}deg)`,
      animationDuration: `${b.dur}s`,
      animationDelay: `${b.delay}s`
    }
  })));
}
function Modal({
  open,
  onClose,
  children,
  className = ""
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === "Escape") onClose && onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return React.createElement("div", {
    className: "modal-backdrop",
    onClick: onClose
  }, React.createElement("div", {
    className: `modal ${className}`,
    onClick: e => e.stopPropagation()
  }, children));
}
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error
    };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return React.createElement("div", {
      className: "shell"
    }, React.createElement("div", {
      className: "panel",
      style: {
        textAlign: "center",
        maxWidth: 680,
        margin: "40px auto"
      }
    }, React.createElement("h3", null, "App could not open"), React.createElement("p", {
      className: "tip",
      style: {
        margin: "12px 0 18px"
      }
    }, "A saved match on this device may be damaged. Start a fresh local session if reloading does not fix it."), React.createElement("div", {
      className: "modal-actions"
    }, React.createElement("button", {
      className: "btn ghost",
      onClick: () => location.reload()
    }, "Reload"), React.createElement("button", {
      className: "btn primary",
      onClick: () => {
        if (!confirm("Clear local matches on this device? Cloud leaderboard data stays.")) return;
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ACTIVE_KEY);
        location.reload();
      }
    }, "Start Fresh"))));
  }
}
function HelpModal({
  open,
  onClose
}) {
  return React.createElement(Modal, {
    open: open,
    onClose: onClose,
    className: "help-modal"
  }, React.createElement("div", {
    className: "stinger"
  }, "App Guide"), React.createElement("h2", null, "How to use ", React.createElement("em", null, "Striker.")), React.createElement("p", {
    className: "help-intro"
  }, "Use this app to run singles or doubles carrom matches, choose 1 or 3 sets, track every board, move between sets automatically, and keep a match history."), React.createElement("div", {
    className: "help-grid"
  }, React.createElement("div", {
    className: "help-step"
  }, React.createElement("span", {
    className: "help-num"
  }, "1"), React.createElement("h3", null, "Choose competitors"), React.createElement("p", null, "Select Singles for one name per side or Doubles for Team A and Team B with two names each. Coin color is decided after the toss.")), React.createElement("div", {
    className: "help-step"
  }, React.createElement("span", {
    className: "help-num"
  }, "2"), React.createElement("h3", null, "Choose match rules"), React.createElement("p", null, "Pick 1 set or 3 sets, then choose either 25 points / 8 boards or 15 points / 4 boards. A set ends when either limit is reached first.")), React.createElement("div", {
    className: "help-step"
  }, React.createElement("span", {
    className: "help-num"
  }, "3"), React.createElement("h3", null, "Toss and break"), React.createElement("p", null, "Flip the striker. The toss winner chooses either Break first or Choose your side. Break first automatically means White coins.")), React.createElement("div", {
    className: "help-step"
  }, React.createElement("span", {
    className: "help-num"
  }, "4"), React.createElement("h3", null, "Choose side"), React.createElement("p", null, "If the toss winner chooses a side instead of breaking, they pick White or Black and the opponent breaks first.")), React.createElement("div", {
    className: "help-step"
  }, React.createElement("span", {
    className: "help-num"
  }, "5"), React.createElement("h3", null, "Enter points"), React.createElement("p", null, "After each board, enter how many coins the losing player has left, turn Queen on only if covered, then tap the board winner.")), React.createElement("div", {
    className: "help-step"
  }, React.createElement("span", {
    className: "help-num"
  }, "6"), React.createElement("h3", null, "Scoring rule"), React.createElement("p", null, "The app adds the losing player's coins left as points. Queen +3 counts while the winner's score before the board is 22 or less in 25-point games, or 11 or less in 15-point games. It is ignored only after that.")), React.createElement("div", {
    className: "help-step"
  }, React.createElement("span", {
    className: "help-num"
  }, "7"), React.createElement("h3", null, "Sets and match"), React.createElement("p", null, "In a 1-set match, the first set winner wins the match. In a 3-set match, first to 2 sets wins the match."))), React.createElement("div", {
    className: "help-note"
  }, "Use Undo if you enter a board wrongly. Reset Set removes only the current set's boards. Reset Match keeps names and colors but starts scoring again. Export JSON or CSV from the match screen when you need a saved copy."), React.createElement("div", {
    className: "modal-actions",
    style: {
      marginTop: 22
    }
  }, React.createElement("button", {
    className: "btn primary",
    onClick: onClose
  }, "Got it")));
}
function TopBar({
  onNew,
  onHome,
  driveSlot
}) {
  return React.createElement("div", {
    className: "topbar"
  }, React.createElement("div", {
    className: "brand",
    style: {
      cursor: "pointer"
    },
    onClick: onHome
  }, React.createElement(BrandMark, null), React.createElement("div", {
    className: "brand-name"
  }, "Striker ", React.createElement("em", null, "/"), " Carrom")), React.createElement("div", {
    className: "row",
    style: {
      gap: 10
    }
  }, driveSlot, React.createElement("button", {
    className: "btn ghost sm",
    onClick: onNew
  }, "+ New Match")));
}
Object.assign(window, {
  BrandMark,
  Coin,
  Avatar,
  Chip,
  SetPips,
  Confetti,
  Modal,
  ErrorBoundary,
  HelpModal,
  TopBar
});


// ---- cloud.jsx ----
const SUPABASE_URL = "https://csdrlzvkwtkpjfjzglsl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZHJsenZrd3RrcGpmanpnbHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTY1NjQsImV4cCI6MjA5MjMzMjU2NH0.0_QrLivfuNpDcIm0p4bOsFAbFUKDTgQD-amQOPFFkas";
const SESSION_KEY = "striker.session.v1";
const ADMIN_PIN_KEY = "striker.admin.v1";
let _sbReady = null;
function getSupabase() {
  if (_sbReady) return _sbReady;
  _sbReady = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "vendor/supabase.min.js";
    s.onload = () => {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      resolve(client);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _sbReady;
}
async function hashPin(name, pin) {
  const msg = `striker|${name.toLowerCase().trim()}|${pin}`;
  const buf = new TextEncoder().encode(msg);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}
function setSession(s) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);
}
async function signInOrRegister(name, pin) {
  const sb = await getSupabase();
  const pinHash = await hashPin(name, pin);
  name = name.trim();
  const {
    data: existing,
    error: findErr
  } = await sb.from("players").select("id,name,pin_hash").ilike("name", name).limit(1).maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (existing) {
    if (existing.pin_hash !== pinHash) throw new Error("Wrong PIN for that name.");
    const session = {
      id: existing.id,
      name: existing.name
    };
    setSession(session);
    return session;
  }
  const {
    data: created,
    error: insErr
  } = await sb.from("players").insert({
    name,
    pin_hash: pinHash
  }).select("id,name").single();
  if (insErr) {
    if (String(insErr.message).includes("duplicate")) throw new Error("That name is taken. Use a different PIN / spelling.");
    throw new Error(insErr.message);
  }
  const session = {
    id: created.id,
    name: created.name
  };
  setSession(session);
  return session;
}
function signOut() {
  setSession(null);
}
function matchToRow(match, ownerId) {
  return {
    id: match.id,
    owner_player_id: ownerId,
    p1_name: match.p1.name,
    p2_name: match.p2.name,
    p1_color: match.p1.color,
    p2_color: match.p2.color,
    p1_sets_won: match.p1.setsWon,
    p2_sets_won: match.p2.setsWon,
    winner_name: (() => {
      const mw = matchWinner(match);
      return mw ? match[mw].name : null;
    })(),
    phase: match.phase,
    data: match,
    started_at: match.startedAt ? new Date(match.startedAt).toISOString() : null,
    ended_at: match.endedAt ? new Date(match.endedAt).toISOString() : null,
    updated_at: new Date().toISOString()
  };
}
const _sbTimers = new Map();
const _sbLast = new Map();
function scheduleSupabaseSync(match, ownerId, opts = {}) {
  const {
    delay = 1200,
    onStatus
  } = opts;
  const snap = JSON.stringify(match);
  if (_sbLast.get(match.id) === snap) return;
  _sbLast.set(match.id, snap);
  if (_sbTimers.has(match.id)) clearTimeout(_sbTimers.get(match.id));
  const t = setTimeout(async () => {
    _sbTimers.delete(match.id);
    try {
      onStatus && onStatus("syncing");
      const sb = await getSupabase();
      const row = matchToRow(match, ownerId);
      const {
        error
      } = await sb.from("matches").upsert(row, {
        onConflict: "id"
      });
      if (error) throw error;
      onStatus && onStatus("synced");
    } catch (e) {
      console.warn("Supabase sync failed:", e);
      onStatus && onStatus("error", e.message);
    }
  }, delay);
  _sbTimers.set(match.id, t);
}
async function fetchAllMatches({
  limit = 200
} = {}) {
  const sb = await getSupabase();
  const {
    data,
    error
  } = await sb.from("matches").select("*").order("updated_at", {
    ascending: false
  }).limit(limit);
  if (error) throw error;
  return data || [];
}
async function deleteMatchById(id) {
  const sb = await getSupabase();
  const {
    error
  } = await sb.from("matches").delete().eq("id", id);
  if (error) throw error;
}
async function subscribeMatches(onChange) {
  const sb = await getSupabase();
  const ch = sb.channel("matches-live").on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "matches"
  }, payload => {
    onChange(payload);
  }).subscribe();
  return () => {
    sb.removeChannel(ch);
  };
}
Object.assign(window, {
  SUPABASE_URL,
  SUPABASE_ANON,
  SESSION_KEY,
  ADMIN_PIN_KEY,
  getSupabase,
  hashPin,
  getSession,
  setSession,
  signInOrRegister,
  signOut,
  scheduleSupabaseSync,
  fetchAllMatches,
  deleteMatchById,
  subscribeMatches
});


// ---- signin.jsx ----
function SignIn({
  onSignedIn
}) {
  const [name, setName] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const go = async e => {
    e.preventDefault();
    if (!name.trim() || pin.length < 4) return;
    setBusy(true);
    setErr(null);
    try {
      const session = await signInOrRegister(name, pin);
      onSignedIn(session);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };
  return React.createElement("div", {
    className: "welcome"
  }, React.createElement("form", {
    className: "welcome-card",
    onSubmit: go,
    style: {
      maxWidth: 560
    }
  }, React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 14
    }
  }, "Sign in \xB7 first time? Pick a PIN"), React.createElement("h1", {
    style: {
      fontSize: "clamp(40px, 6vw, 72px)"
    }
  }, "Welcome, ", React.createElement("em", null, "striker.")), React.createElement("p", {
    className: "lede"
  }, "Enter your name and a 4-digit PIN. New name = new account. Your PIN stops anyone else from editing your matches."), React.createElement("div", {
    style: {
      display: "grid",
      gap: 14,
      marginTop: 18
    }
  }, React.createElement("div", {
    className: "name-field"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Your name"), React.createElement("input", {
    autoFocus: true,
    placeholder: "e.g. Raj",
    value: name,
    onChange: e => setName(e.target.value),
    maxLength: 24
  })), React.createElement("div", {
    className: "name-field"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "4\u20136 digit PIN"), React.createElement("input", {
    type: "password",
    inputMode: "numeric",
    pattern: "[0-9]*",
    placeholder: "\u2022\u2022\u2022\u2022",
    value: pin,
    onChange: e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6)),
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.5em"
    }
  }))), err && React.createElement("div", {
    className: "drive-error",
    style: {
      marginTop: 12
    }
  }, err), React.createElement("div", {
    className: "row",
    style: {
      justifyContent: "space-between",
      marginTop: 18,
      flexWrap: "wrap",
      gap: 12
    }
  }, React.createElement("div", {
    className: "tip"
  }, "Your PIN is hashed before being stored \u2014 we never see it in plain text."), React.createElement("button", {
    type: "submit",
    className: "btn primary",
    disabled: busy || !name.trim() || pin.length < 4
  }, busy ? "Signing in…" : "Enter →"))));
}
Object.assign(window, {
  SignIn
});


// ---- welcome.jsx ----
function Welcome({
  onStart,
  onHelp
}) {
  const [matchType, setMatchType] = React.useState("singles");
  const [totalSets, setTotalSets] = React.useState(3);
  const [scoreFormat, setScoreFormat] = React.useState("standard");
  const [n1, setN1] = React.useState("");
  const [n2, setN2] = React.useState("");
  const [teamA1, setTeamA1] = React.useState("");
  const [teamA2, setTeamA2] = React.useState("");
  const [teamB1, setTeamB1] = React.useState("");
  const [teamB2, setTeamB2] = React.useState("");
  const trim = v => v.trim();
  const singlesReady = trim(n1) && trim(n2) && trim(n1) !== trim(n2);
  const doublesReady = trim(teamA1) && trim(teamA2) && trim(teamB1) && trim(teamB2);
  const ready = matchType === "doubles" ? doublesReady : singlesReady;
  const rules = scoreRules(scoreFormat);
  const submit = e => {
    e.preventDefault();
    if (!ready) return;
    onStart({
      matchType,
      totalSets,
      scoreFormat,
      name1: trim(n1),
      name2: trim(n2),
      teamA1: trim(teamA1),
      teamA2: trim(teamA2),
      teamB1: trim(teamB1),
      teamB2: trim(teamB2)
    });
  };
  return React.createElement("div", {
    className: "welcome"
  }, React.createElement("form", {
    className: "welcome-card",
    onSubmit: submit
  }, React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 14
    }
  }, "Strike / Pocket / Win"), React.createElement("h1", null, "A new match", React.createElement("br", null), React.createElement("em", null, "begins.")), React.createElement("p", {
    className: "lede"
  }, "Enter the competitors, choose the match rules, then toss the striker. Coin colors are decided after the toss."), React.createElement("div", {
    className: "setup-controls"
  }, React.createElement("div", {
    className: "setup-block"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Players"), React.createElement("div", {
    className: "option-row"
  }, React.createElement("button", {
    type: "button",
    className: `option-pill ${matchType === "singles" ? "active" : ""}`,
    onClick: () => setMatchType("singles")
  }, "Singles"), React.createElement("button", {
    type: "button",
    className: `option-pill ${matchType === "doubles" ? "active" : ""}`,
    onClick: () => setMatchType("doubles")
  }, "Doubles"))), React.createElement("div", {
    className: "setup-block"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Sets"), React.createElement("div", {
    className: "option-row"
  }, React.createElement("button", {
    type: "button",
    className: `option-pill ${totalSets === 1 ? "active" : ""}`,
    onClick: () => setTotalSets(1)
  }, "1 set"), React.createElement("button", {
    type: "button",
    className: `option-pill ${totalSets === 3 ? "active" : ""}`,
    onClick: () => setTotalSets(3)
  }, "3 sets"))), React.createElement("div", {
    className: "setup-block wide"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Scoring"), React.createElement("div", {
    className: "option-row"
  }, React.createElement("button", {
    type: "button",
    className: `option-pill ${scoreFormat === "standard" ? "active" : ""}`,
    onClick: () => setScoreFormat("standard")
  }, "25 pts / 8 boards"), React.createElement("button", {
    type: "button",
    className: `option-pill ${scoreFormat === "quick" ? "active" : ""}`,
    onClick: () => setScoreFormat("quick")
  }, "15 pts / 4 boards")))), matchType === "singles" ? React.createElement("div", {
    className: "names"
  }, React.createElement("div", {
    className: "name-field"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Player one"), React.createElement("input", {
    autoFocus: true,
    placeholder: "Name...",
    value: n1,
    onChange: e => setN1(e.target.value),
    maxLength: 24
  })), React.createElement("div", {
    className: "versus"
  }, "vs."), React.createElement("div", {
    className: "name-field"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Player two"), React.createElement("input", {
    placeholder: "Name...",
    value: n2,
    onChange: e => setN2(e.target.value),
    maxLength: 24
  }))) : React.createElement("div", {
    className: "names doubles-names"
  }, React.createElement("div", {
    className: "name-field team-field"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Team A"), React.createElement("input", {
    autoFocus: true,
    placeholder: "Player A1...",
    value: teamA1,
    onChange: e => setTeamA1(e.target.value),
    maxLength: 24
  }), React.createElement("input", {
    placeholder: "Player A2...",
    value: teamA2,
    onChange: e => setTeamA2(e.target.value),
    maxLength: 24
  })), React.createElement("div", {
    className: "versus"
  }, "vs."), React.createElement("div", {
    className: "name-field team-field"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Team B"), React.createElement("input", {
    placeholder: "Player B1...",
    value: teamB1,
    onChange: e => setTeamB1(e.target.value),
    maxLength: 24
  }), React.createElement("input", {
    placeholder: "Player B2...",
    value: teamB2,
    onChange: e => setTeamB2(e.target.value),
    maxLength: 24
  }))), React.createElement("div", {
    className: "row",
    style: {
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12
    }
  }, React.createElement("div", {
    className: "tip"
  }, "Next: toss the striker / ", totalSets, " set", totalSets === 1 ? "" : "s", " / ", rules.limitPoints, " points or ", rules.limitBoards, " boards"), React.createElement("div", {
    className: "row",
    style: {
      flexWrap: "wrap",
      gap: 10
    }
  }, onHelp && React.createElement("button", {
    type: "button",
    className: "btn ghost",
    onClick: onHelp
  }, "How it works"), React.createElement("button", {
    type: "submit",
    className: "btn primary",
    disabled: !ready
  }, "Toss the Striker ->")))));
}
Object.assign(window, {
  Welcome
});


// ---- toss.jsx ----
function Toss({
  match,
  onDone
}) {
  const [phase, setPhase] = React.useState("idle");
  const [winner, setWinner] = React.useState(null);
  const p1 = match.p1,
    p2 = match.p2;
  const winnerPlayer = winner ? match[winner] : null;
  const winnerName = winnerPlayer ? winnerPlayer.name : "";
  const spin = () => {
    setPhase("spinning");
    ping(520, 0.1, "triangle", 0.06);
    setTimeout(() => ping(660, 0.08, "triangle", 0.05), 200);
    setTimeout(() => ping(780, 0.08, "triangle", 0.04), 400);
    setTimeout(() => {
      const w = Math.random() < 0.5 ? "p1" : "p2";
      setWinner(w);
      setPhase("winner");
      chord([523, 659, 784], 0.25);
    }, 1300);
  };
  const chooseBreak = who => {
    if (!winner) return;
    const newP1Color = winner === "p1" ? "White" : "Black";
    const newP2Color = winner === "p2" ? "White" : "Black";
    onDone({
      matchId: match.id,
      tossWinner: winner,
      tossChoice: "break",
      breakPlayer: winner,
      p1Color: newP1Color,
      p2Color: newP2Color
    });
  };
  const chooseSide = () => {
    if (winner) setPhase("choosing");
  };
  const confirmSide = chosenColor => {
    if (!winner) return;
    const other = winner === "p1" ? "p2" : "p1";
    let newP1Color = match.p1.color,
      newP2Color = match.p2.color;
    if (winner === "p1" && match.p1.color !== chosenColor) {
      newP1Color = chosenColor;
      newP2Color = chosenColor === "White" ? "Black" : "White";
    }
    if (winner === "p2" && match.p2.color !== chosenColor) {
      newP2Color = chosenColor;
      newP1Color = chosenColor === "White" ? "Black" : "White";
    }
    onDone({
      matchId: match.id,
      tossWinner: winner,
      tossChoice: "side",
      breakPlayer: other,
      p1Color: newP1Color,
      p2Color: newP2Color
    });
  };
  return React.createElement("div", {
    className: "shell"
  }, React.createElement("div", {
    className: "welcome-card",
    style: {
      maxWidth: 780,
      margin: "0 auto"
    }
  }, React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 10
    }
  }, "The Toss"), React.createElement("h1", {
    style: {
      fontSize: "clamp(36px, 6vw, 72px)"
    }
  }, phase === "idle" && React.createElement(React.Fragment, null, "Spin the ", React.createElement("em", null, "striker.")), phase === "spinning" && React.createElement(React.Fragment, null, "Spinning\u2026"), phase === "winner" && React.createElement(React.Fragment, null, "The toss goes to ", React.createElement("em", null, winnerName, ".")), phase === "choosing" && React.createElement(React.Fragment, null, React.createElement("em", null, winnerName), " picks a side.")), React.createElement("div", {
    className: "toss-stage"
  }, React.createElement("div", {
    className: `striker ${phase === "spinning" ? "spin" : ""}`
  }, React.createElement("div", {
    className: "ring"
  }), React.createElement("div", {
    className: "center"
  })), phase === "idle" && React.createElement(React.Fragment, null, React.createElement("p", {
    className: "tip",
    style: {
      textAlign: "center",
      maxWidth: 460
    }
  }, p1.name, " vs ", p2.name, ". The winner of the toss chooses whether to break or pick a side."), React.createElement("button", {
    className: "btn primary",
    onClick: spin
  }, "Flip the Striker")), phase === "winner" && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "toss-result"
  }, "Choose, ", React.createElement("em", null, winnerName), "."), React.createElement("div", {
    className: "toss-choice"
  }, React.createElement("button", {
    type: "button",
    className: "choice-card",
    onClick: chooseBreak
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Option A"), React.createElement("div", {
    className: "big"
  }, "Break first"), React.createElement("div", {
    className: "sub"
  }, "You strike first on board 1 with the ", React.createElement("strong", null, "White"), " coins.")), React.createElement("button", {
    type: "button",
    className: "choice-card",
    onClick: chooseSide
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Option B"), React.createElement("div", {
    className: "big"
  }, "Choose your side"), React.createElement("div", {
    className: "sub"
  }, "Pick White or Black. Opponent breaks first."))), React.createElement("button", {
    className: "btn ghost sm",
    onClick: spin,
    style: {
      marginTop: 8
    }
  }, "Re-spin")), phase === "choosing" && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "toss-choice"
  }, React.createElement("button", {
    type: "button",
    className: "choice-card",
    onClick: () => confirmSide("White")
  }, React.createElement("div", {
    className: "row",
    style: {
      gap: 14
    }
  }, React.createElement(Coin, {
    color: "white",
    size: 36
  }), React.createElement("div", null, React.createElement("div", {
    className: "big"
  }, "Take White"), React.createElement("div", {
    className: "sub"
  }, "You play the ivory coins.")))), React.createElement("button", {
    type: "button",
    className: "choice-card",
    onClick: () => confirmSide("Black")
  }, React.createElement("div", {
    className: "row",
    style: {
      gap: 14
    }
  }, React.createElement(Coin, {
    color: "black",
    size: 36
  }), React.createElement("div", null, React.createElement("div", {
    className: "big"
  }, "Take Black"), React.createElement("div", {
    className: "sub"
  }, "You play the ebony coins."))))), React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => setPhase("winner")
  }, "\u2190 Back")))));
}
Object.assign(window, {
  Toss
});


// ---- drive.jsx ----
const DRIVE_CLIENT_KEY = "striker.drive.clientId";
const DRIVE_TOKEN_KEY = "striker.drive.token";
const DRIVE_FOLDER_KEY = "striker.drive.folderId";
const DRIVE_FILEMAP_KEY = "striker.drive.fileMap";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME = "Striker Carrom Scores";
let _tokenClient = null;
let _gisReady = false;
function loadGIS() {
  return new Promise((resolve, reject) => {
    if (_gisReady) return resolve();
    if (document.getElementById("gis-script")) {
      const check = setInterval(() => {
        if (window.google && window.google.accounts) {
          _gisReady = true;
          clearInterval(check);
          resolve();
        }
      }, 100);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.id = "gis-script";
    s.onload = () => {
      _gisReady = true;
      resolve();
    };
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
}
function getStoredToken() {
  try {
    const raw = localStorage.getItem(DRIVE_TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (t.expiresAt && t.expiresAt < Date.now() + 30_000) return null;
    return t;
  } catch {
    return null;
  }
}
function storeToken(token) {
  localStorage.setItem(DRIVE_TOKEN_KEY, JSON.stringify(token));
}
function clearToken() {
  localStorage.removeItem(DRIVE_TOKEN_KEY);
}
async function requestAccessToken({
  clientId,
  interactive = true
}) {
  await loadGIS();
  return new Promise((resolve, reject) => {
    try {
      _tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        prompt: interactive ? "" : "none",
        callback: resp => {
          if (resp.error) return reject(new Error(resp.error_description || resp.error));
          const token = {
            accessToken: resp.access_token,
            expiresAt: Date.now() + resp.expires_in * 1000
          };
          storeToken(token);
          resolve(token);
        }
      });
      _tokenClient.requestAccessToken();
    } catch (e) {
      reject(e);
    }
  });
}
async function driveFetch(path, opts = {}, token) {
  const t = token || getStoredToken();
  if (!t) throw new Error("Not signed in");
  const res = await fetch(`https://www.googleapis.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${t.accessToken}`,
      ...(opts.headers || {})
    }
  });
  if (res.status === 401) {
    clearToken();
    throw new Error("Token expired");
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Drive ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res;
}
async function ensureFolder() {
  let folderId = localStorage.getItem(DRIVE_FOLDER_KEY);
  if (folderId) {
    try {
      await driveFetch(`/drive/v3/files/${folderId}?fields=id,trashed`);
      return folderId;
    } catch {
      folderId = null;
      localStorage.removeItem(DRIVE_FOLDER_KEY);
    }
  }
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const search = await driveFetch(`/drive/v3/files?q=${q}&fields=files(id,name)`);
  const data = await search.json();
  if (data.files && data.files[0]) {
    localStorage.setItem(DRIVE_FOLDER_KEY, data.files[0].id);
    return data.files[0].id;
  }
  const create = await driveFetch(`/drive/v3/files`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder"
    })
  });
  const folder = await create.json();
  localStorage.setItem(DRIVE_FOLDER_KEY, folder.id);
  return folder.id;
}
function getFileMap() {
  try {
    return JSON.parse(localStorage.getItem(DRIVE_FILEMAP_KEY) || "{}");
  } catch {
    return {};
  }
}
function setFileMap(m) {
  localStorage.setItem(DRIVE_FILEMAP_KEY, JSON.stringify(m));
}
async function uploadOrUpdate({
  existingId,
  name,
  mimeType,
  content,
  parentId
}) {
  const boundary = "strikerboundary" + Math.random().toString(36).slice(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const close = `\r\n--${boundary}--`;
  const metadata = existingId ? {
    name,
    mimeType
  } : {
    name,
    mimeType,
    parents: [parentId]
  };
  const body = delimiter + "Content-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metadata) + delimiter + `Content-Type: ${mimeType}\r\n\r\n` + content + close;
  const url = existingId ? `/upload/drive/v3/files/${existingId}?uploadType=multipart` : `/upload/drive/v3/files?uploadType=multipart`;
  const res = await driveFetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });
  return res.json();
}
function matchToCSV(match) {
  const rows = [["Set", "Board", "Winner", "OppLeft", "Queen", "Pts", "Set A", "Set B", "Time"]];
  (match.history || []).filter(h => h.kind === "board").forEach(h => {
    rows.push([h.set, h.board, h.winnerName, h.oppLeft, h.queen ? "Counted +3" : h.queenIgnored ? "Ignored" : "No", h.pts, h.setA, h.setB, new Date(h.at).toISOString()]);
  });
  return rows.map(r => r.map(v => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}
async function syncMatch(match) {
  const folderId = await ensureFolder();
  const map = getFileMap();
  const existing = map[match.id] || {};
  const baseName = `${(match.p1.name || "A").replace(/[\\\/:\*\?"<>\|]/g, "")}-vs-${(match.p2.name || "B").replace(/[\\\/:\*\?"<>\|]/g, "")}-${match.id}`;
  const jsonRes = await uploadOrUpdate({
    existingId: existing.jsonId,
    name: `${baseName}.json`,
    mimeType: "application/json",
    content: JSON.stringify(match, null, 2),
    parentId: folderId
  });
  const csvRes = await uploadOrUpdate({
    existingId: existing.csvId,
    name: `${baseName}.csv`,
    mimeType: "text/csv",
    content: matchToCSV(match),
    parentId: folderId
  });
  map[match.id] = {
    jsonId: jsonRes.id,
    csvId: csvRes.id
  };
  setFileMap(map);
  return {
    json: jsonRes,
    csv: csvRes
  };
}
const _timers = new Map();
const _lastPayload = new Map();
function scheduleSync(match, opts = {}) {
  const {
    delay = 2000,
    onStatus
  } = opts;
  if (!getStoredToken()) return;
  const snap = JSON.stringify(match);
  if (_lastPayload.get(match.id) === snap) return;
  _lastPayload.set(match.id, snap);
  if (_timers.has(match.id)) clearTimeout(_timers.get(match.id));
  const t = setTimeout(async () => {
    _timers.delete(match.id);
    try {
      onStatus && onStatus("syncing");
      await syncMatch(match);
      onStatus && onStatus("synced");
    } catch (e) {
      console.warn("Drive sync failed:", e);
      onStatus && onStatus("error", e.message);
    }
  }, delay);
  _timers.set(match.id, t);
}
Object.assign(window, {
  DRIVE_CLIENT_KEY,
  DRIVE_TOKEN_KEY,
  DRIVE_FOLDER_KEY,
  DRIVE_FILEMAP_KEY,
  loadGIS,
  requestAccessToken,
  getStoredToken,
  clearToken,
  ensureFolder,
  syncMatch,
  scheduleSync
});


// ---- drive_ui.jsx ----
function DrivePanel({
  active,
  matches
}) {
  const [clientId, setClientId] = React.useState(() => localStorage.getItem(DRIVE_CLIENT_KEY) || "");
  const [connected, setConnected] = React.useState(() => !!getStoredToken());
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState(null);
  React.useEffect(() => {
    if (clientId) localStorage.setItem(DRIVE_CLIENT_KEY, clientId);
  }, [clientId]);
  React.useEffect(() => {
    if (!connected || !active) return;
    scheduleSync(active, {
      delay: 1500,
      onStatus: (s, msg) => {
        setStatus(s);
        if (s === "error") setError(msg);
      }
    });
  }, [active && JSON.stringify(active), connected]);
  const connect = async () => {
    try {
      setError(null);
      if (!clientId) {
        setError("Paste your OAuth Client ID first.");
        return;
      }
      await requestAccessToken({
        clientId: clientId.trim()
      });
      setConnected(true);
      for (const m of matches) {
        scheduleSync(m, {
          delay: 200,
          onStatus: setStatus
        });
      }
    } catch (e) {
      setError(e.message || String(e));
    }
  };
  const disconnect = () => {
    clearToken();
    setConnected(false);
    setStatus("idle");
  };
  const syncNow = async () => {
    if (!active) return;
    try {
      setStatus("syncing");
      setError(null);
      await syncMatch(active);
      setStatus("synced");
    } catch (e) {
      setStatus("error");
      setError(e.message);
    }
  };
  const openFolder = () => {
    const folderId = localStorage.getItem(DRIVE_FOLDER_KEY);
    if (folderId) window.open(`https://drive.google.com/drive/folders/${folderId}`, "_blank");else window.open("https://drive.google.com/drive/my-drive", "_blank");
  };
  const pill = connected ? status === "syncing" ? {
    txt: "Syncing…",
    cls: "syncing"
  } : status === "error" ? {
    txt: "Sync error",
    cls: "err"
  } : {
    txt: "Synced to Drive",
    cls: "ok"
  } : {
    txt: "Drive off",
    cls: "off"
  };
  return React.createElement(React.Fragment, null, React.createElement("button", {
    className: `drive-pill ${pill.cls}`,
    onClick: () => setOpen(o => !o),
    title: "Google Drive sync"
  }, React.createElement("span", {
    className: "drive-ico",
    "aria-hidden": true
  }, "\u25B2"), React.createElement("span", null, pill.txt)), open && React.createElement("div", {
    className: "drive-panel"
  }, React.createElement("div", {
    className: "panel-head",
    style: {
      marginBottom: 10
    }
  }, React.createElement("h3", {
    style: {
      fontSize: 22
    }
  }, "Google Drive sync"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => setOpen(false)
  }, "\u2715")), !connected ? React.createElement(React.Fragment, null, React.createElement("p", {
    className: "tip",
    style: {
      marginBottom: 10
    }
  }, "Paste your OAuth ", React.createElement("strong", null, "Client ID"), " (Web application type). Scores auto-upload to a folder called ", React.createElement("em", null, "\u201CStriker Carrom Scores\u201D"), " in your Drive."), React.createElement("label", {
    className: "eyebrow"
  }, "OAuth Client ID"), React.createElement("input", {
    className: "drive-input",
    placeholder: "xxxxxxxx.apps.googleusercontent.com",
    value: clientId,
    onChange: e => setClientId(e.target.value)
  }), React.createElement("div", {
    className: "row",
    style: {
      marginTop: 12,
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    className: "btn primary",
    onClick: connect,
    disabled: !clientId
  }, "Connect Google"), React.createElement("a", {
    className: "btn ghost sm",
    href: "https://console.cloud.google.com/apis/credentials",
    target: "_blank",
    rel: "noopener"
  }, "Get a Client ID \u2197")), React.createElement("details", {
    style: {
      marginTop: 16
    }
  }, React.createElement("summary", {
    className: "tip",
    style: {
      cursor: "pointer"
    }
  }, "Setup steps"), React.createElement("ol", {
    className: "tip",
    style: {
      lineHeight: 1.7,
      paddingLeft: 18
    }
  }, React.createElement("li", null, "Google Cloud \u2192 APIs & Services \u2192 Enable ", React.createElement("strong", null, "Google Drive API")), React.createElement("li", null, "Credentials \u2192 Create OAuth client ID \u2192 ", React.createElement("strong", null, "Web application")), React.createElement("li", null, "Add this page's URL as Authorized JavaScript origin"), React.createElement("li", null, "Copy the Client ID and paste it above")))) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 12,
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("span", {
    className: `sync-status ${pill.cls}`
  }, "\u25CF"), React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, status === "syncing" ? "Uploading changes to your Drive…" : status === "error" ? "Last sync failed — click retry" : "Every score change auto-saves to your Drive.")), React.createElement("div", {
    className: "row",
    style: {
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    className: "btn primary sm",
    onClick: syncNow,
    disabled: !active
  }, "Sync now"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: openFolder
  }, "Open folder \u2197"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: disconnect
  }, "Disconnect"))), error && React.createElement("div", {
    className: "drive-error"
  }, error)));
}
Object.assign(window, {
  DrivePanel
});


// ---- scoreboard.jsx ----
function useMatchTimer(match) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (match.phase !== "live") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [match.phase]);
  const elapsed = match.startedAt ? (match.endedAt || now) - match.startedAt : 0;
  return elapsed;
}
function Scoreboard({
  match,
  onUpdate,
  onClose
}) {
  const [oppLeft, setOppLeft] = React.useState(0);
  const [queen, setQueen] = React.useState(false);
  const [confettiKey, setConfettiKey] = React.useState(0);
  const [setModal, setSetModal] = React.useState(null);
  const [matchModal, setMatchModal] = React.useState(false);
  const elapsed = useMatchTimer(match);
  const limitPoints = matchLimitPoints(match);
  const limitBoards = matchLimitBoards(match);
  const queenCutoff = matchQueenCutoff(match);
  const totalSetCount = safeTotalSets(match.totalSets);
  const neededSets = matchSetsToWin(match);
  const mw = matchWinner(match);
  const lastHistoryIdRef = React.useRef(match.history.length);
  React.useEffect(() => {
    const len = match.history.length;
    if (len > lastHistoryIdRef.current) {
      const lastNew = match.history.slice(lastHistoryIdRef.current).reverse().find(h => h.kind === "set-end");
      if (lastNew) {
        chord([523, 659, 784, 1047], 0.3);
        setConfettiKey(k => k + 1);
        if (matchWinner(match)) setMatchModal(true);else setSetModal(lastNew);
      }
    }
    lastHistoryIdRef.current = len;
  }, [match.history.length]);
  const award = to => {
    if (mw) return;
    onUpdate(m => awardBoard(m, to, oppLeft, queen));
    setOppLeft(0);
    setQueen(false);
    ping(720, 0.08, "triangle", 0.05);
  };
  const doUndo = () => {
    const next = popUndo(match);
    if (!next) return;
    onUpdate(() => next);
    ping(360, 0.08, "sine", 0.05);
  };
  const doResetSet = () => {
    if (!confirm(`Reset current Set ${match.setNo}? This removes this set's boards.`)) return;
    onUpdate(m => resetSet(m));
  };
  const doResetMatch = () => {
    if (!confirm("Reset the entire match? Names & colors kept.")) return;
    onUpdate(m => resetMatch(m));
  };
  const doSwap = () => {
    onUpdate(m => swapPlayers(m));
  };
  const p1Lead = match.p1.setPts > match.p2.setPts;
  const p2Lead = match.p2.setPts > match.p1.setPts;
  const setPoint = !mw && (match.p1.setPts >= queenCutoff || match.p2.setPts >= queenCutoff);
  React.useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        doUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [match]);
  return React.createElement("div", {
    className: "shell"
  }, React.createElement(Confetti, {
    trigger: confettiKey
  }), React.createElement("div", {
    className: "score-grid"
  }, React.createElement(PlayerCard, {
    player: match.p1,
    playerKey: "p1",
    match: match,
    leading: p1Lead,
    winner: mw === "p1",
    breakPlayer: match.breakPlayer
  }), React.createElement("div", {
    className: "center-card"
  }, mw ? React.createElement("span", {
    className: "status-tag match-over"
  }, "Match Won") : setPoint ? React.createElement("span", {
    className: "status-tag setpoint"
  }, "Set Point") : React.createElement("span", {
    className: "status-tag"
  }, React.createElement("span", {
    className: "live-dot"
  }), "Live"), React.createElement("div", {
    className: "set-of",
    style: {
      marginTop: 14
    }
  }, "Set"), React.createElement("div", {
    className: "big-set"
  }, match.setNo), React.createElement("div", {
    className: "set-of"
  }, "of ", totalSetCount), React.createElement("div", {
    className: "board-line"
  }, React.createElement("span", null, "Board"), React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--cream)"
    }
  }, Math.min(match.boardNo, limitBoards), " / ", limitBoards)), React.createElement("div", {
    className: "set-of",
    style: {
      marginTop: 12
    }
  }, limitPoints, " pts / Queen while ", "<=", " ", queenCutoff), React.createElement("div", {
    className: "timer"
  }, fmtTime(elapsed))), React.createElement(PlayerCard, {
    player: match.p2,
    playerKey: "p2",
    match: match,
    leading: p2Lead,
    winner: mw === "p2",
    breakPlayer: match.breakPlayer
  })), !mw && React.createElement("div", {
    className: "award"
  }, React.createElement("h3", null, "Award the current board"), React.createElement("div", {
    className: "award-row"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 8
    }
  }, "Opponent coins left"), React.createElement("div", {
    className: "coin-stepper"
  }, React.createElement("button", {
    onClick: () => setOppLeft(v => Math.max(0, v - 1)),
    "aria-label": "decrease"
  }, "\u2212"), React.createElement("div", {
    className: "val"
  }, oppLeft), React.createElement("button", {
    onClick: () => setOppLeft(v => Math.min(9, v + 1)),
    "aria-label": "increase"
  }, "+"))), React.createElement("div", null, React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 8
    }
  }, "Queen"), React.createElement("button", {
    type: "button",
    className: `queen-toggle ${queen ? "on" : ""}`,
    onClick: () => setQueen(q => !q)
  }, React.createElement("span", {
    className: "queen-coin"
  }), queen ? "Covered (+3 if allowed)" : "Not covered")), React.createElement("div", null), React.createElement("div", {
    className: "award-actions"
  }, React.createElement("button", {
    className: "btn dark",
    onClick: () => award("p1")
  }, "\u2192 ", match.p1.name), React.createElement("button", {
    className: "btn primary",
    onClick: () => award("p2")
  }, "\u2192 ", match.p2.name)), React.createElement("div", {
    className: "award-hint"
  }, "Enter how many of the ", React.createElement("strong", null, "losing"), " player's coins remain. Queen +3 is ignored only when the board winner already has more than ", queenCutoff, " points before this board."))), React.createElement("div", {
    className: "panel",
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, React.createElement("button", {
    className: "btn ghost sm",
    onClick: doUndo,
    disabled: !match.stack?.length
  }, "\u21B6 Undo"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: doResetSet
  }, "Reset Set"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: doResetMatch
  }, "Reset Match"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: doSwap
  }, "Swap Players"), React.createElement("div", {
    className: "spacer"
  }), React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => exportJSON(match)
  }, "Export JSON"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => exportCSV(match)
  }, "Export CSV"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: onClose
  }, "Close Match")), React.createElement(HistoryPanel, {
    match: match
  }), React.createElement(Modal, {
    open: !!setModal,
    onClose: () => setSetModal(null)
  }, setModal && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "stinger"
  }, "Set ", setModal.set, " complete"), React.createElement("h2", null, setModal.winner ? React.createElement(React.Fragment, null, "Set to ", React.createElement("em", null, setModal.winnerName)) : React.createElement(React.Fragment, null, "Tied set")), React.createElement("div", {
    className: "modal-score"
  }, match.p1.name, " ", setModal.finalA, " \xA0\xB7\xA0 ", setModal.finalB, " ", match.p2.name), React.createElement("div", {
    className: "modal-actions"
  }, React.createElement("button", {
    className: "btn primary",
    onClick: () => setSetModal(null)
  }, "Next Set \u2192")))), React.createElement(Modal, {
    open: matchModal,
    onClose: () => setMatchModal(false)
  }, React.createElement("div", {
    className: "stinger crimson"
  }, "Match Complete"), React.createElement("h2", null, "\uD83C\uDFC6 ", React.createElement("em", null, mw ? match[mw].name : ""), " wins"), React.createElement("div", {
    className: "modal-score"
  }, "Sets ", match.p1.setsWon, " \u2013 ", match.p2.setsWon, " \xA0\xB7\xA0 first to ", neededSets, " \xA0\xB7\xA0 ", fmtTime(elapsed)), React.createElement("div", {
    className: "modal-actions"
  }, React.createElement("button", {
    className: "btn primary",
    onClick: () => {
      doResetMatch();
      setMatchModal(false);
    }
  }, "Rematch"), React.createElement("button", {
    className: "btn ghost",
    onClick: () => setMatchModal(false)
  }, "Review Board"))));
}
function PlayerCard({
  player,
  playerKey,
  match,
  leading,
  winner,
  breakPlayer
}) {
  const cls = `player-card ${leading ? "leading" : ""} ${winner ? "winner-match" : ""}`;
  const displayName = cleanName(player && player.name, playerKey === "p1" ? "Player One" : "Player Two");
  const displayLabel = player && player.label ? player.label : "";
  const color = cleanName(player && player.color, playerKey === "p1" ? "White" : "Black");
  const members = player && Array.isArray(player.members) ? player.members.map(n => cleanName(n, "")).filter(Boolean) : [];
  const setPts = Number(player && player.setPts) || 0;
  const setsWon = Number(player && player.setsWon) || 0;
  return React.createElement("div", {
    className: cls
  }, React.createElement("div", {
    className: "player-head"
  }, React.createElement(Avatar, {
    name: displayName,
    color: color
  }), React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, React.createElement("div", {
    className: "player-name"
  }, displayName), displayLabel && React.createElement("div", {
    className: "player-label eyebrow"
  }, displayLabel), match.matchType === "doubles" && members.length > 1 && React.createElement("div", {
    className: "member-list"
  }, members.join(" + ")), React.createElement("div", {
    className: "player-meta"
  }, React.createElement("span", {
    className: "chip"
  }, React.createElement(Coin, {
    color: color.toLowerCase(),
    size: 10
  }), " ", color), breakPlayer === playerKey && React.createElement("span", {
    className: "chip break"
  }, "Breaks")))), React.createElement("div", {
    className: "score-rows"
  }, React.createElement("div", {
    className: "score-cell"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Set points"), React.createElement("div", {
    className: "num"
  }, setPts)), React.createElement("div", {
    className: "score-cell"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "Sets won"), React.createElement("div", {
    className: "num small"
  }, setsWon), React.createElement(SetPips, {
    won: setsWon,
    max: matchSetsToWin(match)
  }))));
}
function HistoryPanel({
  match
}) {
  const rows = match.history;
  return React.createElement("div", {
    className: "panel"
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("h3", null, "Match history"), React.createElement("div", {
    className: "panel-actions"
  }, React.createElement("span", {
    className: "tip"
  }, rows.filter(r => r.kind === "board").length, " boards played"))), !rows.length ? React.createElement("div", {
    className: "empty"
  }, "No boards yet \u2014 award the first one above.") : React.createElement("div", {
    style: {
      overflow: "auto"
    }
  }, React.createElement("table", {
    className: "history-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "#"), React.createElement("th", null, "Set"), React.createElement("th", null, "Board"), React.createElement("th", null, "Winner"), React.createElement("th", null, "Opp. Left"), React.createElement("th", null, "Queen"), React.createElement("th", null, "Pts"), React.createElement("th", null, match.p1.name), React.createElement("th", null, match.p2.name), React.createElement("th", null, "Time"))), React.createElement("tbody", null, (() => {
    let n = 0;
    return rows.map((h, i) => {
      if (h.kind === "set-end") {
        return React.createElement("tr", {
          key: i,
          className: "set-row"
        }, React.createElement("td", {
          colSpan: 10
        }, "\u2014 Set ", h.set, " to ", h.winnerName, " \xB7 final ", h.finalA, "\u2013", h.finalB, " \u2014"));
      }
      n += 1;
      return React.createElement("tr", {
        key: i
      }, React.createElement("td", {
        className: "mono"
      }, n), React.createElement("td", null, h.set), React.createElement("td", null, h.board), React.createElement("td", null, React.createElement("span", {
        className: "winner-badge"
      }, h.winnerName)), React.createElement("td", {
        className: "mono"
      }, h.oppLeft), React.createElement("td", null, h.queen ? React.createElement("span", {
        className: "queen-badge"
      }, "+3") : h.queenIgnored ? React.createElement("span", {
        className: "queen-badge ignored"
      }, "Ignored") : "—"), React.createElement("td", {
        className: "mono",
        style: {
          fontWeight: 700
        }
      }, h.pts), React.createElement("td", {
        className: "score-cell-inline"
      }, h.setA), React.createElement("td", {
        className: "score-cell-inline"
      }, h.setB), React.createElement("td", {
        className: "mono",
        style: {
          color: "var(--muted)"
        }
      }, new Date(h.at).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit"
      })));
    });
  })()))));
}
Object.assign(window, {
  Scoreboard,
  PlayerCard,
  HistoryPanel
});


// ---- leaderboard.jsx ----
function Leaderboard({
  session,
  onOpenMatch,
  isAdmin,
  onDelete
}) {
  const [rows, setRows] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [tab, setTab] = React.useState("overall");
  const load = async () => {
    try {
      setRows(await fetchAllMatches({
        limit: 500
      }));
    } catch (e) {
      setErr(e.message);
    }
  };
  React.useEffect(() => {
    load();
  }, []);
  React.useEffect(() => {
    let off;
    (async () => {
      off = await subscribeMatches(() => load());
    })();
    return () => {
      if (off) off();
    };
  }, []);
  const stats = React.useMemo(() => computeStats(rows || []), [rows]);
  if (err) return React.createElement("div", {
    className: "shell"
  }, React.createElement("div", {
    className: "panel"
  }, React.createElement("div", {
    className: "drive-error"
  }, err)));
  if (!rows) return React.createElement("div", {
    className: "shell"
  }, React.createElement("div", {
    className: "panel"
  }, React.createElement("div", {
    className: "empty"
  }, "Loading leaderboard\u2026")));
  const finished = rows.filter(r => r.winner_name);
  return React.createElement("div", {
    className: "shell"
  }, React.createElement("div", {
    className: "panel"
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("h3", null, "Club leaderboard"), React.createElement("div", {
    className: "panel-actions"
  }, React.createElement("button", {
    className: `btn ghost sm ${tab === "overall" ? "" : ""}`,
    onClick: () => setTab("overall"),
    style: {
      borderColor: tab === "overall" ? "var(--gold)" : undefined
    }
  }, "Overall"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => setTab("feed"),
    style: {
      borderColor: tab === "feed" ? "var(--gold)" : undefined
    }
  }, "Recent"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => setTab("h2h"),
    style: {
      borderColor: tab === "h2h" ? "var(--gold)" : undefined
    }
  }, "Head-to-head"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => setTab("monthly"),
    style: {
      borderColor: tab === "monthly" ? "var(--gold)" : undefined
    }
  }, "Monthly"))), tab === "overall" && React.createElement(OverallTable, {
    stats: stats
  }), tab === "feed" && React.createElement(RecentFeed, {
    rows: rows,
    onOpen: onOpenMatch,
    isAdmin: isAdmin,
    onDelete: onDelete
  }), tab === "h2h" && React.createElement(HeadToHead, {
    stats: stats
  }), tab === "monthly" && React.createElement(MonthlyStats, {
    rows: finished
  })));
}
function computeStats(rows) {
  const players = new Map();
  const h2h = new Map();
  const finished = rows.filter(r => r.winner_name);
  const chrono = [...finished].sort((a, b) => new Date(a.ended_at || a.updated_at) - new Date(b.ended_at || b.updated_at));
  const getP = n => {
    if (!players.has(n)) players.set(n, {
      name: n,
      wins: 0,
      losses: 0,
      matches: 0,
      setsWon: 0,
      setsLost: 0,
      currentStreak: 0,
      bestStreak: 0
    });
    return players.get(n);
  };
  for (const r of chrono) {
    const a = getP(r.p1_name),
      b = getP(r.p2_name);
    a.matches++;
    b.matches++;
    a.setsWon += r.p1_sets_won;
    a.setsLost += r.p2_sets_won;
    b.setsWon += r.p2_sets_won;
    b.setsLost += r.p1_sets_won;
    if (r.winner_name === r.p1_name) {
      a.wins++;
      b.losses++;
      a.currentStreak = Math.max(1, a.currentStreak + 1);
      b.currentStreak = 0;
    } else if (r.winner_name === r.p2_name) {
      b.wins++;
      a.losses++;
      b.currentStreak = Math.max(1, b.currentStreak + 1);
      a.currentStreak = 0;
    }
    a.bestStreak = Math.max(a.bestStreak, a.currentStreak);
    b.bestStreak = Math.max(b.bestStreak, b.currentStreak);
    const [x, y] = [r.p1_name, r.p2_name].sort();
    const key = `${x}|${y}`;
    if (!h2h.has(key)) h2h.set(key, {
      a: x,
      b: y,
      wins_a: 0,
      wins_b: 0,
      matches: 0
    });
    const rec = h2h.get(key);
    rec.matches++;
    if (r.winner_name === x) rec.wins_a++;else if (r.winner_name === y) rec.wins_b++;
  }
  return {
    players: Array.from(players.values()).sort((a, b) => b.wins - a.wins || b.wins / Math.max(1, b.matches) - a.wins / Math.max(1, a.matches) || b.matches - a.matches),
    h2h: Array.from(h2h.values()).sort((a, b) => b.matches - a.matches)
  };
}
function OverallTable({
  stats
}) {
  if (!stats.players.length) return React.createElement("div", {
    className: "empty"
  }, "No completed matches yet \u2014 play some!");
  return React.createElement("div", {
    style: {
      overflow: "auto"
    }
  }, React.createElement("table", {
    className: "history-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "#"), React.createElement("th", null, "Player"), React.createElement("th", null, "W"), React.createElement("th", null, "L"), React.createElement("th", null, "Matches"), React.createElement("th", null, "Win %"), React.createElement("th", null, "Sets W-L"), React.createElement("th", null, "Best Streak"), React.createElement("th", null, "Current"))), React.createElement("tbody", null, stats.players.map((p, i) => React.createElement("tr", {
    key: p.name
  }, React.createElement("td", {
    className: "mono"
  }, i + 1), React.createElement("td", null, React.createElement("span", {
    className: "winner-badge"
  }, p.name)), React.createElement("td", {
    className: "mono",
    style: {
      color: "var(--leaf)",
      fontWeight: 700
    }
  }, p.wins), React.createElement("td", {
    className: "mono",
    style: {
      color: "var(--queen)"
    }
  }, p.losses), React.createElement("td", {
    className: "mono"
  }, p.matches), React.createElement("td", {
    className: "mono"
  }, p.matches ? Math.round(p.wins / p.matches * 100) : 0, "%"), React.createElement("td", {
    className: "mono"
  }, p.setsWon, "-", p.setsLost), React.createElement("td", {
    className: "mono",
    style: {
      color: "var(--gold)"
    }
  }, p.bestStreak), React.createElement("td", {
    className: "mono"
  }, p.currentStreak > 0 ? `🔥 ${p.currentStreak}` : "—"))))));
}
function RecentFeed({
  rows,
  onOpen,
  isAdmin,
  onDelete
}) {
  if (!rows.length) return React.createElement("div", {
    className: "empty"
  }, "No matches yet.");
  return React.createElement("div", {
    style: {
      overflow: "auto"
    }
  }, React.createElement("table", {
    className: "history-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "When"), React.createElement("th", null, "Match"), React.createElement("th", null, "Score"), React.createElement("th", null, "Winner"), React.createElement("th", null, "Status"), React.createElement("th", null))), React.createElement("tbody", null, rows.map(r => React.createElement("tr", {
    key: r.id
  }, React.createElement("td", {
    className: "mono",
    style: {
      color: "var(--muted)"
    }
  }, fmtDate(r.updated_at)), React.createElement("td", null, r.p1_name, " vs ", r.p2_name), React.createElement("td", {
    className: "mono"
  }, r.p1_sets_won, " \u2013 ", r.p2_sets_won), React.createElement("td", null, r.winner_name ? React.createElement("span", {
    className: "winner-badge"
  }, r.winner_name) : "—"), React.createElement("td", null, React.createElement("span", {
    className: `chip ${r.winner_name ? "" : ""}`,
    style: {
      color: r.winner_name ? "var(--gold)" : "var(--muted)"
    }
  }, r.winner_name ? "Final" : r.phase)), React.createElement("td", {
    style: {
      textAlign: "right"
    }
  }, React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => onOpen && onOpen(r)
  }, "Open"), isAdmin && React.createElement("button", {
    className: "btn ghost sm",
    style: {
      marginLeft: 6,
      color: "var(--queen)"
    },
    onClick: () => onDelete && onDelete(r)
  }, "Delete")))))));
}
function HeadToHead({
  stats
}) {
  if (!stats.h2h.length) return React.createElement("div", {
    className: "empty"
  }, "No head-to-head records yet.");
  return React.createElement("div", {
    style: {
      overflow: "auto"
    }
  }, React.createElement("table", {
    className: "history-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Rivalry"), React.createElement("th", null, "Record"), React.createElement("th", null, "Matches"), React.createElement("th", null, "Edge"))), React.createElement("tbody", null, stats.h2h.map(r => {
    const edge = r.wins_a === r.wins_b ? "Even" : r.wins_a > r.wins_b ? `${r.a} +${r.wins_a - r.wins_b}` : `${r.b} +${r.wins_b - r.wins_a}`;
    return React.createElement("tr", {
      key: `${r.a}|${r.b}`
    }, React.createElement("td", null, r.a, " vs ", r.b), React.createElement("td", {
      className: "mono"
    }, r.wins_a, " \u2013 ", r.wins_b), React.createElement("td", {
      className: "mono"
    }, r.matches), React.createElement("td", null, React.createElement("span", {
      className: "winner-badge"
    }, edge)));
  }))));
}
function MonthlyStats({
  rows
}) {
  const byMonth = {};
  for (const r of rows) {
    const d = new Date(r.ended_at || r.updated_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[key] = byMonth[key] || {
      month: key,
      matches: 0,
      players: new Set(),
      topPlayer: {}
    };
    byMonth[key].matches++;
    byMonth[key].players.add(r.p1_name);
    byMonth[key].players.add(r.p2_name);
    if (r.winner_name) byMonth[key].topPlayer[r.winner_name] = (byMonth[key].topPlayer[r.winner_name] || 0) + 1;
  }
  const list = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));
  if (!list.length) return React.createElement("div", {
    className: "empty"
  }, "No finished matches yet.");
  return React.createElement("div", {
    style: {
      overflow: "auto"
    }
  }, React.createElement("table", {
    className: "history-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Month"), React.createElement("th", null, "Matches"), React.createElement("th", null, "Players"), React.createElement("th", null, "Top"))), React.createElement("tbody", null, list.map(m => {
    const top = Object.entries(m.topPlayer).sort((a, b) => b[1] - a[1])[0];
    return React.createElement("tr", {
      key: m.month
    }, React.createElement("td", null, new Date(m.month + "-01").toLocaleDateString(undefined, {
      year: "numeric",
      month: "long"
    })), React.createElement("td", {
      className: "mono"
    }, m.matches), React.createElement("td", {
      className: "mono"
    }, m.players.size), React.createElement("td", null, top ? React.createElement("span", {
      className: "winner-badge"
    }, top[0], " \xB7 ", top[1], "W") : "—"));
  }))));
}
Object.assign(window, {
  Leaderboard
});


// ---- app.jsx ----
function AdminPanel({
  open,
  onClose,
  isAdmin,
  setIsAdmin
}) {
  const [pinInput, setPinInput] = React.useState("");
  const [err, setErr] = React.useState(null);
  const storedAdminHash = localStorage.getItem(ADMIN_PIN_KEY);
  const [setupMode] = React.useState(!storedAdminHash);
  const tryLogin = async () => {
    setErr(null);
    const h = await hashPin("_admin_", pinInput);
    if (setupMode) {
      localStorage.setItem(ADMIN_PIN_KEY, h);
      setIsAdmin(true);
      onClose();
      return;
    }
    if (h === storedAdminHash) {
      setIsAdmin(true);
      onClose();
    } else setErr("Wrong admin PIN.");
  };
  if (!open) return null;
  return React.createElement("div", {
    className: "modal-backdrop",
    onClick: onClose
  }, React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation(),
    style: {
      padding: "32px 28px"
    }
  }, React.createElement("div", {
    className: "stinger"
  }, setupMode ? "Set Admin PIN" : "Admin Access"), React.createElement("h2", {
    style: {
      fontSize: 36
    }
  }, setupMode ? React.createElement(React.Fragment, null, "Create ", React.createElement("em", null, "admin PIN.")) : React.createElement(React.Fragment, null, "Admin ", React.createElement("em", null, "login."))), React.createElement("p", {
    className: "tip",
    style: {
      margin: "10px 0 18px"
    }
  }, setupMode ? "First-time setup. Pick an admin PIN — stored locally on this device only. Admin can edit or delete any match in the leaderboard." : "Enter your admin PIN to enable edit/delete on all matches."), React.createElement("input", {
    type: "password",
    inputMode: "numeric",
    value: pinInput,
    onChange: e => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 8)),
    placeholder: "\u2022\u2022\u2022\u2022",
    className: "drive-input",
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.5em",
      fontSize: 20,
      textAlign: "center"
    }
  }), err && React.createElement("div", {
    className: "drive-error"
  }, err), React.createElement("div", {
    className: "modal-actions",
    style: {
      marginTop: 18
    }
  }, React.createElement("button", {
    className: "btn ghost",
    onClick: onClose
  }, "Cancel"), React.createElement("button", {
    className: "btn primary",
    onClick: tryLogin,
    disabled: pinInput.length < 4
  }, setupMode ? "Save PIN" : "Unlock"))));
}
function App() {
  const [session, setSessionState] = React.useState(() => getSession());
  const [view, setView] = React.useState("play");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState("idle");
  const {
    state,
    active,
    createMatch,
    closeMatch,
    setActive,
    updateMatch
  } = useStore();
  React.useEffect(() => {
    if (!session || !active) return;
    scheduleSupabaseSync(active, session.id, {
      onStatus: (s, msg) => setSyncStatus(s)
    });
  }, [active && JSON.stringify(active), session]);
  if (!session) {
    return React.createElement(React.Fragment, null, React.createElement("div", {
      className: "topbar"
    }, React.createElement("div", {
      className: "brand"
    }, React.createElement(BrandMark, null), React.createElement("div", {
      className: "brand-name"
    }, "Striker ", React.createElement("em", null, "/"), " Carrom")), React.createElement("button", {
      className: "btn ghost sm",
      onClick: () => setHelpOpen(true)
    }, "Help")), React.createElement(SignIn, {
      onSignedIn: s => setSessionState(s)
    }), React.createElement(HelpModal, {
      open: helpOpen,
      onClose: () => setHelpOpen(false)
    }));
  }
  const startNew = () => setActive(null);
  const goHome = () => {
    setView("play");
    setActive(null);
  };
  const onStartFromWelcome = opts => {
    const id = createMatch(opts);
    updateMatch(id, m => ({
      ...m,
      phase: "toss"
    }));
  };
  const onTossDone = res => {
    const id = res.matchId || active?.id || state.activeId;
    if (!id) return;
    updateMatch(id, m => {
      const p1 = m.p1 || {};
      const p2 = m.p2 || {};
      const isDoubles = m.matchType === "doubles";
      return {
        ...m,
        phase: "live",
        startedAt: Date.now(),
        tossWinner: res.tossWinner,
        tossChoice: res.tossChoice,
        breakPlayer: res.breakPlayer,
        p1: normalizeCompetitorForLive({
          ...p1,
          color: res.p1Color || p1.color
        }, isDoubles ? "Team A" : "Player One", "White"),
        p2: normalizeCompetitorForLive({
          ...p2,
          color: res.p2Color || p2.color
        }, isDoubles ? "Team B" : "Player Two", "Black")
      };
    });
  };
  const openFromCloud = async row => {
    const m = row.data;
    if (!state.matches.find(x => x.id === m.id)) {
      createMatch();
      updateMatch(state.activeId || m.id, () => m);
    }
    setActive(m.id);
    setView("play");
  };
  const deleteFromCloud = async row => {
    if (!isAdmin) return;
    if (!confirm(`Delete match "${row.p1_name} vs ${row.p2_name}"? This cannot be undone.`)) return;
    try {
      await deleteMatchById(row.id);
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };
  const syncPill = React.createElement("span", {
    className: `drive-pill ${syncStatus === "synced" ? "ok" : syncStatus === "syncing" ? "syncing" : syncStatus === "error" ? "err" : "off"}`
  }, React.createElement("span", {
    className: "drive-ico"
  }, "\u25CF"), syncStatus === "syncing" ? "Syncing…" : syncStatus === "synced" ? "Cloud synced" : syncStatus === "error" ? "Sync error" : "Cloud");
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "topbar"
  }, React.createElement("div", {
    className: "brand",
    style: {
      cursor: "pointer"
    },
    onClick: goHome
  }, React.createElement(BrandMark, null), React.createElement("div", {
    className: "brand-name"
  }, "Striker ", React.createElement("em", null, "/"), " Carrom")), React.createElement("div", {
    className: "row",
    style: {
      gap: 10,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    className: `tab ${view === "play" ? "active" : ""}`,
    onClick: () => setView("play")
  }, "Play"), React.createElement("button", {
    className: `tab ${view === "leaderboard" ? "active" : ""}`,
    onClick: () => setView("leaderboard")
  }, "Leaderboard"), syncPill, React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => setHelpOpen(true)
  }, "Help"), React.createElement("span", {
    className: "chip hide-sm",
    style: {
      color: "var(--cream)"
    }
  }, React.createElement("span", {
    style: {
      color: "var(--gold)"
    }
  }, "\u25CF"), " ", session.name), !isAdmin ? React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => setAdminOpen(true)
  }, "Admin") : React.createElement("span", {
    className: "chip break"
  }, "Admin"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: startNew
  }, "+ New"), React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => {
      signOut();
      setSessionState(null);
    }
  }, "Sign out"))), state.matches.length > 0 && view === "play" && React.createElement("div", {
    className: "tab-row"
  }, state.matches.map(m => {
    const label = `${m.p1.name || "A"} vs ${m.p2.name || "B"}`;
    const isActive = m.id === state.activeId;
    return React.createElement("div", {
      key: m.id,
      className: `tab ${isActive ? "active" : ""}`,
      onClick: () => setActive(m.id),
      role: "button"
    }, React.createElement("span", null, label), React.createElement("span", {
      style: {
        opacity: .6
      },
      className: "mono"
    }, m.p1.setsWon, "-", m.p2.setsWon), React.createElement("button", {
      className: "close",
      onClick: e => {
        e.stopPropagation();
        if (confirm(`Close ${label}? Cloud copy stays.`)) closeMatch(m.id);
      }
    }, "\xD7"));
  }), React.createElement("button", {
    className: "tab",
    onClick: () => setActive(null)
  }, "+ New")), view === "leaderboard" && React.createElement(Leaderboard, {
    session: session,
    isAdmin: isAdmin,
    onOpenMatch: openFromCloud,
    onDelete: deleteFromCloud
  }), view === "play" && !active && React.createElement(Welcome, {
    onStart: onStartFromWelcome,
    onHelp: () => setHelpOpen(true)
  }), view === "play" && active?.phase === "toss" && React.createElement(Toss, {
    match: active,
    onDone: onTossDone
  }), view === "play" && active && (active.phase === "live" || active.phase === "over") && React.createElement(Scoreboard, {
    match: active,
    onUpdate: u => updateMatch(active.id, u),
    onClose: () => {
      if (confirm("Close this match locally? Cloud copy stays.")) closeMatch(active.id);
    }
  }), view === "play" && active?.phase === "setup" && React.createElement(Welcome, {
    onStart: onStartFromWelcome,
    onHelp: () => setHelpOpen(true)
  }), React.createElement(HelpModal, {
    open: helpOpen,
    onClose: () => setHelpOpen(false)
  }), React.createElement(AdminPanel, {
    open: adminOpen,
    onClose: () => setAdminOpen(false),
    isAdmin: isAdmin,
    setIsAdmin: setIsAdmin
  }));
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(ErrorBoundary, null, React.createElement(App, null)));
