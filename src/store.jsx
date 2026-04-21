// Store hook — manages list of matches + active id + persistence

function useStore() {
  const [state, setState] = React.useState(() => {
    const { matches, activeId } = loadAll();
    return { matches: matches || [], activeId: activeId || null };
  });

  // Autosave on every change
  React.useEffect(() => {
    persistAll(state.matches, state.activeId);
  }, [state]);

  const createMatch = React.useCallback((opts) => {
    const m = defaultMatch(opts);
    setState(s => ({ matches: [...s.matches, m], activeId: m.id }));
    return m.id;
  }, []);

  const closeMatch = React.useCallback((id) => {
    setState(s => {
      const matches = s.matches.filter(m => m.id !== id);
      const activeId = s.activeId === id ? (matches[matches.length-1]?.id || null) : s.activeId;
      return { matches, activeId };
    });
  }, []);

  const setActive = React.useCallback((id) => setState(s => ({ ...s, activeId: id })), []);

  const updateMatch = React.useCallback((id, updater) => {
    setState(s => ({
      ...s,
      matches: s.matches.map(m => {
        if (m.id !== id) return m;
        const next = typeof updater === "function" ? updater(m) : { ...m, ...updater };
        next.updatedAt = Date.now();
        return next;
      })
    }));
  }, []);

  const active = state.matches.find(m => m.id === state.activeId) || null;

  return { state, active, createMatch, closeMatch, setActive, updateMatch };
}

// ------- Pure state transitions (match mutators) -------

function pushUndo(m) {
  const snap = JSON.stringify({ ...m, stack: [] });
  const stack = [...(m.stack || []), snap];
  if (stack.length > 100) stack.shift();
  return { ...m, stack };
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
  const pts = Math.max(0, Math.min(9, oppLeft)) + (queen ? 3 : 0);
  let next = pushUndo(m);
  const winnerName = next[toKey].name;
  next = {
    ...next,
    [toKey]: { ...next[toKey], setPts: next[toKey].setPts + pts },
  };
  const entry = {
    kind: "board",
    at: Date.now(),
    set: next.setNo,
    board: next.boardNo,
    winner: toKey,
    winnerName,
    oppLeft: Math.max(0, Math.min(9, oppLeft)),
    queen,
    pts,
    setA: next.p1.setPts + (toKey === "p1" ? 0 : 0),
    setB: next.p2.setPts + (toKey === "p2" ? 0 : 0),
  };
  // Patch setA/setB with the post-award values
  entry.setA = toKey === "p1" ? next.p1.setPts : next.p1.setPts;
  entry.setB = toKey === "p2" ? next.p2.setPts : next.p2.setPts;
  next = { ...next, history: [...next.history, entry], boardNo: next.boardNo + 1 };

  // Check set end
  const endedPts    = next.p1.setPts >= LIMIT_POINTS || next.p2.setPts >= LIMIT_POINTS;
  const endedBoards = next.boardNo > LIMIT_BOARDS;
  if (endedPts || endedBoards) {
    next = finalizeSet(next);
  }
  return next;
}

function finalizeSet(m) {
  const a = m.p1.setPts, b = m.p2.setPts;
  let next = { ...m };
  let setWinner = null;
  if (a > b) { next = { ...next, p1: { ...next.p1, setsWon: next.p1.setsWon + 1 } }; setWinner = "p1"; }
  else if (b > a) { next = { ...next, p2: { ...next.p2, setsWon: next.p2.setsWon + 1 } }; setWinner = "p2"; }

  next.history = [...next.history, {
    kind: "set-end",
    at: Date.now(),
    set: next.setNo,
    winner: setWinner,
    winnerName: setWinner ? next[setWinner].name : "Tied",
    finalA: a, finalB: b,
  }];

  const mw = matchWinner(next);
  if (mw) {
    next.phase = "over";
    next.endedAt = Date.now();
    return next;
  }
  // start next set
  next = {
    ...next,
    setNo: next.setNo + 1,
    boardNo: 1,
    p1: { ...next.p1, setPts: 0 },
    p2: { ...next.p2, setPts: 0 },
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
    p1: { ...next.p1, setPts: 0 },
    p2: { ...next.p2, setPts: 0 },
  };
}

function resetMatch(m) {
  const next = pushUndo(m);
  return {
    ...next,
    setNo: 1, boardNo: 1,
    startedAt: Date.now(),
    endedAt: null,
    phase: "live",
    p1: { ...next.p1, setPts: 0, setsWon: 0 },
    p2: { ...next.p2, setPts: 0, setsWon: 0 },
    history: [],
  };
}

function swapPlayers(m) {
  const next = pushUndo(m);
  return {
    ...next,
    p1: next.p2, p2: next.p1,
    breakPlayer: next.breakPlayer === "p1" ? "p2" : next.breakPlayer === "p2" ? "p1" : next.breakPlayer,
    tossWinner:  next.tossWinner  === "p1" ? "p2" : next.tossWinner  === "p2" ? "p1" : next.tossWinner,
  };
}

Object.assign(window, { useStore, pushUndo, popUndo, awardBoard, finalizeSet, resetSet, resetMatch, swapPlayers });
