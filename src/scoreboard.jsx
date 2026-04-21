// Scoreboard + Award panel + History + Match timer

function useMatchTimer(match) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (match.phase !== "live") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [match.phase]);
  const elapsed = match.startedAt ? ((match.endedAt || now) - match.startedAt) : 0;
  return elapsed;
}

function Scoreboard({ match, onUpdate, onClose }) {
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
  const neededSets = Number(match.setsToWin) || setsNeeded(match);

  const mw = matchWinner(match);

  // Detect new set-end rows to trigger modals/confetti (only once per id)
  const lastHistoryIdRef = React.useRef(match.history.length);
  React.useEffect(() => {
    const len = match.history.length;
    if (len > lastHistoryIdRef.current) {
      const lastNew = match.history.slice(lastHistoryIdRef.current).reverse()
        .find(h => h.kind === "set-end");
      if (lastNew) {
        chord([523, 659, 784, 1047], 0.3);
        setConfettiKey(k => k + 1);
        if (matchWinner(match)) setMatchModal(true);
        else setSetModal(lastNew);
      }
    }
    lastHistoryIdRef.current = len;
  }, [match.history.length]);

  const award = (to) => {
    if (mw) return;
    onUpdate(m => awardBoard(m, to, oppLeft, queen));
    setOppLeft(0); setQueen(false);
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

  // Leader logic
  const p1Lead = match.p1.setPts > match.p2.setPts;
  const p2Lead = match.p2.setPts > match.p1.setPts;

  // Set point flag follows the selected scoring format's queen cutoff.
  const setPoint = !mw && (match.p1.setPts >= queenCutoff || match.p2.setPts >= queenCutoff);

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); doUndo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [match]);

  return (
    <div className="shell">
      <Confetti trigger={confettiKey} />

      <div className="score-grid">
        {/* Player 1 */}
        <PlayerCard player={match.p1} playerKey="p1" match={match}
                    leading={p1Lead} winner={mw === "p1"} breakPlayer={match.breakPlayer} />

        {/* Center */}
        <div className="center-card">
          {mw ? (
            <span className="status-tag match-over">Match Won</span>
          ) : setPoint ? (
            <span className="status-tag setpoint">Set Point</span>
          ) : (
            <span className="status-tag"><span className="live-dot" />Live</span>
          )}
          <div className="set-of" style={{ marginTop: 14 }}>Set</div>
          <div className="big-set">{match.setNo}</div>
          <div className="set-of">of {totalSetCount}</div>
          <div className="board-line">
            <span>Board</span>
            <span className="mono" style={{ color: "var(--cream)" }}>
              {Math.min(match.boardNo, limitBoards)} / {limitBoards}
            </span>
          </div>
          <div className="set-of" style={{ marginTop: 12 }}>{limitPoints} pts / Queen at {queenCutoff}+</div>
          <div className="timer">{fmtTime(elapsed)}</div>
        </div>

        {/* Player 2 */}
        <PlayerCard player={match.p2} playerKey="p2" match={match}
                    leading={p2Lead} winner={mw === "p2"} breakPlayer={match.breakPlayer} />
      </div>

      {/* Award panel */}
      {!mw && (
        <div className="award">
          <h3>Award the current board</h3>
          <div className="award-row">
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Opponent coins left</div>
              <div className="coin-stepper">
                <button onClick={() => setOppLeft(v => Math.max(0, v - 1))} aria-label="decrease">−</button>
                <div className="val">{oppLeft}</div>
                <button onClick={() => setOppLeft(v => Math.min(9, v + 1))} aria-label="increase">+</button>
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Queen</div>
              <button type="button"
                      className={`queen-toggle ${queen ? "on" : ""}`}
                      onClick={() => setQueen(q => !q)}>
                <span className="queen-coin" />
                {queen ? "Covered (+3 if allowed)" : "Not covered"}
              </button>
            </div>
            <div />
            <div className="award-actions">
              <button className="btn dark" onClick={() => award("p1")}>
                → {match.p1.name}
              </button>
              <button className="btn primary" onClick={() => award("p2")}>
                → {match.p2.name}
              </button>
            </div>
            <div className="award-hint">
              Enter how many of the <strong>losing</strong> player's coins remain. Queen +3 is ignored only when the board winner already has {queenCutoff}+ points before this board.
            </div>
          </div>
        </div>
      )}

      {/* Admin bar */}
      <div className="panel" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn ghost sm" onClick={doUndo} disabled={!match.stack?.length}>↶ Undo</button>
        <button className="btn ghost sm" onClick={doResetSet}>Reset Set</button>
        <button className="btn ghost sm" onClick={doResetMatch}>Reset Match</button>
        <button className="btn ghost sm" onClick={doSwap}>Swap Players</button>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={() => exportJSON(match)}>Export JSON</button>
        <button className="btn ghost sm" onClick={() => exportCSV(match)}>Export CSV</button>
        <button className="btn ghost sm" onClick={onClose}>Close Match</button>
      </div>

      {/* History */}
      <HistoryPanel match={match} />

      {/* Set modal */}
      <Modal open={!!setModal} onClose={() => setSetModal(null)}>
        {setModal && <>
          <div className="stinger">Set {setModal.set} complete</div>
          <h2>
            {setModal.winner
              ? <>Set to <em>{setModal.winnerName}</em></>
              : <>Tied set</>}
          </h2>
          <div className="modal-score">
            {match.p1.name} {setModal.finalA} &nbsp;·&nbsp; {setModal.finalB} {match.p2.name}
          </div>
          <div className="modal-actions">
            <button className="btn primary" onClick={() => setSetModal(null)}>
              Next Set →
            </button>
          </div>
        </>}
      </Modal>

      {/* Match modal */}
      <Modal open={matchModal} onClose={() => setMatchModal(false)}>
        <div className="stinger crimson">Match Complete</div>
        <h2>🏆 <em>{mw ? match[mw].name : ""}</em> wins</h2>
        <div className="modal-score">
          Sets {match.p1.setsWon} – {match.p2.setsWon} &nbsp;·&nbsp; first to {neededSets} &nbsp;·&nbsp; {fmtTime(elapsed)}
        </div>
        <div className="modal-actions">
          <button className="btn primary" onClick={() => { doResetMatch(); setMatchModal(false); }}>
            Rematch
          </button>
          <button className="btn ghost" onClick={() => setMatchModal(false)}>Review Board</button>
        </div>
      </Modal>
    </div>
  );
}

function PlayerCard({ player, playerKey, match, leading, winner, breakPlayer }) {
  const cls = `player-card ${leading ? "leading" : ""} ${winner ? "winner-match" : ""}`;
  return (
    <div className={cls}>
      <div className="player-head">
        <Avatar name={player.name} color={player.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="player-name">{player.name}</div>
          {player.label && <div className="player-label eyebrow">{player.label}</div>}
          {match.matchType === "doubles" && player.members?.length > 1 && (
            <div className="member-list">{player.members.join(" + ")}</div>
          )}
          <div className="player-meta">
            <span className="chip"><Coin color={player.color.toLowerCase()} size={10} /> {player.color}</span>
            {breakPlayer === playerKey && <span className="chip break">Breaks</span>}
          </div>
        </div>
      </div>

      <div className="score-rows">
        <div className="score-cell">
          <div className="eyebrow">Set points</div>
          <div className="num">{player.setPts}</div>
        </div>
        <div className="score-cell">
          <div className="eyebrow">Sets won</div>
          <div className="num small">{player.setsWon}</div>
          <SetPips won={player.setsWon} max={Number(match.setsToWin) || setsNeeded(match)} />
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ match }) {
  const rows = match.history;
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Match history</h3>
        <div className="panel-actions">
          <span className="tip">
            {rows.filter(r => r.kind === "board").length} boards played
          </span>
        </div>
      </div>
      {!rows.length ? (
        <div className="empty">No boards yet — award the first one above.</div>
      ) : (
        <div style={{ overflow: "auto" }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>#</th><th>Set</th><th>Board</th><th>Winner</th>
                <th>Opp. Left</th><th>Queen</th><th>Pts</th>
                <th>{match.p1.name}</th><th>{match.p2.name}</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let n = 0;
                return rows.map((h, i) => {
                  if (h.kind === "set-end") {
                    return (
                      <tr key={i} className="set-row">
                        <td colSpan={10}>
                          — Set {h.set} to {h.winnerName} · final {h.finalA}–{h.finalB} —
                        </td>
                      </tr>
                    );
                  }
                  n += 1;
                  return (
                    <tr key={i}>
                      <td className="mono">{n}</td>
                      <td>{h.set}</td>
                      <td>{h.board}</td>
                      <td><span className="winner-badge">{h.winnerName}</span></td>
                      <td className="mono">{h.oppLeft}</td>
                      <td>{h.queen ? <span className="queen-badge">+3</span> : h.queenIgnored ? <span className="queen-badge ignored">Ignored</span> : "—"}</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{h.pts}</td>
                      <td className="score-cell-inline">{h.setA}</td>
                      <td className="score-cell-inline">{h.setB}</td>
                      <td className="mono" style={{ color: "var(--muted)" }}>
                        {new Date(h.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Scoreboard, PlayerCard, HistoryPanel });
