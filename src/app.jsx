// App root — sign-in gate, scoreboard, leaderboard, admin

function AdminPanel({ open, onClose, isAdmin, setIsAdmin }) {
  const [pinInput, setPinInput] = React.useState("");
  const [err, setErr] = React.useState(null);
  const storedAdminHash = localStorage.getItem(ADMIN_PIN_KEY); // sha256 of admin pin
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
    if (h === storedAdminHash) { setIsAdmin(true); onClose(); }
    else setErr("Wrong admin PIN.");
  };

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: "32px 28px" }}>
        <div className="stinger">{setupMode ? "Set Admin PIN" : "Admin Access"}</div>
        <h2 style={{ fontSize: 36 }}>{setupMode ? <>Create <em>admin PIN.</em></> : <>Admin <em>login.</em></>}</h2>
        <p className="tip" style={{ margin: "10px 0 18px" }}>
          {setupMode
            ? "First-time setup. Pick an admin PIN — stored locally on this device only. Admin can edit or delete any match in the leaderboard."
            : "Enter your admin PIN to enable edit/delete on all matches."}
        </p>
        <input type="password" inputMode="numeric" value={pinInput}
               onChange={e => setPinInput(e.target.value.replace(/\D/g,"").slice(0,8))}
               placeholder="••••" className="drive-input"
               style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.5em", fontSize: 20, textAlign: "center" }} />
        {err && <div className="drive-error">{err}</div>}
        <div className="modal-actions" style={{ marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={tryLogin} disabled={pinInput.length < 4}>
            {setupMode ? "Save PIN" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSessionState] = React.useState(() => getSession());
  const [view, setView] = React.useState("play"); // play | leaderboard
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState("idle");

  const { state, active, createMatch, closeMatch, setActive, updateMatch } = useStore();

  // Auto-sync every active match change to Supabase
  React.useEffect(() => {
    if (!session || !active) return;
    scheduleSupabaseSync(active, session.id, {
      onStatus: (s, msg) => setSyncStatus(s),
    });
  }, [active && JSON.stringify(active), session]);

  if (!session) {
    return <>
      <div className="topbar">
        <div className="brand"><BrandMark /><div className="brand-name">Striker <em>/</em> Carrom</div></div>
        <button className="btn ghost sm" onClick={() => setHelpOpen(true)}>Help</button>
      </div>
      <SignIn onSignedIn={(s) => setSessionState(s)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>;
  }

  const startNew = () => setActive(null);
  const goHome = () => { setView("play"); setActive(null); };

  const onStartFromWelcome = (opts) => {
    const id = createMatch(opts);
    updateMatch(id, m => ({ ...m, phase: "toss" }));
  };
  const onTossDone = (res) => {
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
        p1: normalizeCompetitorForLive({ ...p1, color: res.p1Color || p1.color }, isDoubles ? "Team A" : "Player One", "White"),
        p2: normalizeCompetitorForLive({ ...p2, color: res.p2Color || p2.color }, isDoubles ? "Team B" : "Player Two", "Black"),
      };
    });
  };

  const openFromCloud = async (row) => {
    // Load cloud data into local store (or replace if exists)
    const m = row.data;
    if (!state.matches.find(x => x.id === m.id)) {
      createMatch();
      // replace the just-created with cloud version
      updateMatch(state.activeId || m.id, () => m);
    }
    setActive(m.id);
    setView("play");
  };

  const deleteFromCloud = async (row) => {
    if (!isAdmin) return;
    if (!confirm(`Delete match "${row.p1_name} vs ${row.p2_name}"? This cannot be undone.`)) return;
    try { await deleteMatchById(row.id); }
    catch (e) { alert("Delete failed: " + e.message); }
  };

  const syncPill = (
    <span className={`drive-pill ${syncStatus==="synced"?"ok":syncStatus==="syncing"?"syncing":syncStatus==="error"?"err":"off"}`}>
      <span className="drive-ico">●</span>
      {syncStatus==="syncing"?"Syncing…":syncStatus==="synced"?"Cloud synced":syncStatus==="error"?"Sync error":"Cloud"}
    </span>
  );

  return (
    <>
      <div className="topbar">
        <div className="brand" style={{ cursor: "pointer" }} onClick={goHome}>
          <BrandMark />
          <div className="brand-name">Striker <em>/</em> Carrom</div>
        </div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className={`tab ${view==="play"?"active":""}`} onClick={() => setView("play")}>Play</button>
          <button className={`tab ${view==="leaderboard"?"active":""}`} onClick={() => setView("leaderboard")}>Leaderboard</button>
          {syncPill}
          <button className="btn ghost sm" onClick={() => setHelpOpen(true)}>Help</button>
          <span className="chip hide-sm" style={{ color: "var(--cream)" }}>
            <span style={{ color: "var(--gold)" }}>●</span> {session.name}
          </span>
          {!isAdmin
            ? <button className="btn ghost sm" onClick={() => setAdminOpen(true)}>Admin</button>
            : <span className="chip break">Admin</span>}
          <button className="btn ghost sm" onClick={startNew}>+ New</button>
          <button className="btn ghost sm" onClick={() => { signOut(); setSessionState(null); }}>Sign out</button>
        </div>
      </div>

      {state.matches.length > 0 && view === "play" && (
        <div className="tab-row">
          {state.matches.map(m => {
            const label = `${m.p1.name || "A"} vs ${m.p2.name || "B"}`;
            const isActive = m.id === state.activeId;
            return (
              <div key={m.id} className={`tab ${isActive ? "active" : ""}`}
                   onClick={() => setActive(m.id)} role="button">
                <span>{label}</span>
                <span style={{ opacity: .6 }} className="mono">{m.p1.setsWon}-{m.p2.setsWon}</span>
                <button className="close" onClick={(e) => { e.stopPropagation();
                  if (confirm(`Close ${label}? Cloud copy stays.`)) closeMatch(m.id); }}>×</button>
              </div>
            );
          })}
          <button className="tab" onClick={() => setActive(null)}>+ New</button>
        </div>
      )}

      {view === "leaderboard" && (
        <Leaderboard session={session}
                     isAdmin={isAdmin}
                     onOpenMatch={openFromCloud}
                     onDelete={deleteFromCloud} />
      )}

      {view === "play" && !active && <Welcome onStart={onStartFromWelcome} onHelp={() => setHelpOpen(true)} />}
      {view === "play" && active?.phase === "toss" && <Toss match={active} onDone={onTossDone} />}
      {view === "play" && active && (active.phase === "live" || active.phase === "over") && (
        <Scoreboard match={active}
          onUpdate={(u) => updateMatch(active.id, u)}
          onClose={() => { if (confirm("Close this match locally? Cloud copy stays.")) closeMatch(active.id); }} />
      )}
      {view === "play" && active?.phase === "setup" && <Welcome onStart={onStartFromWelcome} onHelp={() => setHelpOpen(true)} />}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)}
                  isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
