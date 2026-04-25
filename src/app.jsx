// App root — sign-in gate, scoreboard, leaderboard, admin

function AdminPanel({ open, onClose, session, isAdmin, setIsAdmin }) {
  const [pinInput, setPinInput] = React.useState("");
  const [err, setErr]           = React.useState(null);
  const [busy, setBusy]         = React.useState(false);

  const eligible  = isAdminEligible(session);
  const configured = adminConfigured();

  React.useEffect(() => {
    if (!open) { setPinInput(""); setErr(null); }
  }, [open]);

  const tryLogin = async () => {
    setErr(null);
    if (!configured) { setErr("Admin is not configured yet. Edit src/cloud.jsx (see README)."); return; }
    if (!eligible)   { setErr("Your account is not the admin account."); return; }
    setBusy(true);
    try {
      const ok = await verifyAdminPin(pinInput);
      if (!ok) { setErr("Wrong admin PIN."); return; }
      setIsAdmin(true);
      onClose();
    } finally { setBusy(false); }
  };

  const stepDown = () => { setIsAdmin(false); onClose(); };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: "32px 28px" }}>
        {isAdmin ? (
          <>
            <div className="stinger">Admin Mode</div>
            <h2 style={{ fontSize: 36 }}>You are <em>admin.</em></h2>
            <p className="tip" style={{ margin: "10px 0 18px" }}>
              Admin powers stay active until you sign out or tap "Step down".
            </p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={onClose}>Close</button>
              <button className="btn crimson" onClick={stepDown}>Step down</button>
            </div>
          </>
        ) : !configured ? (
          <>
            <div className="stinger">Admin Not Configured</div>
            <h2 style={{ fontSize: 32 }}>Setup <em>required.</em></h2>
            <p className="tip" style={{ margin: "10px 0 18px", lineHeight: 1.5 }}>
              Admin is locked off until the owner of the app edits <code>src/cloud.jsx</code>
              to set <code>ADMIN_NAME</code> and <code>ADMIN_PIN_HASH</code>.
              Open <code>admin-setup.html</code> to generate the two values, then reload.
            </p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={onClose}>Got it</button>
            </div>
          </>
        ) : !eligible ? (
          <>
            <div className="stinger">Access Denied</div>
            <h2 style={{ fontSize: 32 }}>Not an <em>admin.</em></h2>
            <p className="tip" style={{ margin: "10px 0 18px", lineHeight: 1.5 }}>
              Admin rights are reserved for a specific account. If that's you,
              sign out and sign in with the correct username.
            </p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <div className="stinger">Admin Access</div>
            <h2 style={{ fontSize: 36 }}>Enter admin <em>PIN.</em></h2>
            <p className="tip" style={{ margin: "10px 0 18px" }}>
              Signed in as <strong>{session?.name}</strong>. Enter your admin PIN to unlock edit/delete on any match.
            </p>
            <input type="password" inputMode="numeric" value={pinInput}
                   autoFocus
                   onKeyDown={(e) => { if (e.key === "Enter") tryLogin(); }}
                   onChange={e => setPinInput(e.target.value.replace(/\D/g,"").slice(0,8))}
                   placeholder="••••" className="drive-input"
                   style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.5em", fontSize: 20, textAlign: "center" }} />
            {err && <div className="drive-error">{err}</div>}
            <div className="modal-actions" style={{ marginTop: 18 }}>
              <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn primary" onClick={tryLogin} disabled={busy || pinInput.length < 4}>
                {busy ? "Checking…" : "Unlock"}
              </button>
            </div>
          </>
        )}
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

  const {
    state, active,
    createMatch, closeMatch, setActive, updateMatch,
    upsertAndActivate, replaceMatch,
  } = useStore();

  // If you lose admin-eligibility (e.g. sign out), strip admin status.
  React.useEffect(() => {
    if (!session || !isAdminEligible(session)) setIsAdmin(false);
  }, [session && session.id]);

  // Auto-sync: only the OWNER (or admin) pushes to cloud. Spectators never overwrite.
  React.useEffect(() => {
    if (!session || !active) return;
    const canWrite = !active.ownerId || active.ownerId === session.id || isAdmin;
    if (!canWrite) return;
    scheduleSupabaseSync(active, session.id, {
      onStatus: (s, msg) => setSyncStatus(s),
    });
  }, [active && JSON.stringify(active), session, isAdmin]);

  // Spectator live-sync: if the active match isn't ours, subscribe to realtime updates.
  React.useEffect(() => {
    if (!session || !active) return;
    const canWrite = !active.ownerId || active.ownerId === session.id || isAdmin;
    if (canWrite) return; // owner/admin uses outbound sync instead
    let off = null; let cancelled = false;
    (async () => {
      try {
        off = await subscribeToMatch(active.id, (payload) => {
          const row = payload.new || payload.record;
          if (!row || !row.data) return;
          if (cancelled) return;
          replaceMatch(row.data);
        });
      } catch (e) { console.warn("spectator subscribe failed:", e); }
    })();
    return () => { cancelled = true; if (off) off(); };
  }, [active?.id, session?.id, isAdmin]);

  // App-wide realtime listener: if admin deletes a match remotely, drop any local copy
  // of it so the owner's next auto-sync doesn't accidentally recreate it.
  React.useEffect(() => {
    if (!session) return;
    let off = null;
    (async () => {
      try {
        off = await subscribeMatches((payload) => {
          if (payload.eventType === "DELETE") {
            const id = payload.old?.id;
            if (id) closeMatch(id);
          }
        });
      } catch (e) { console.warn("global subscribe failed:", e); }
    })();
    return () => { if (off) off(); };
  }, [session?.id]);

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
    const id = createMatch({ ...opts, ownerId: session.id, ownerName: session.name });
    updateMatch(id, m => ({ ...m, phase: "toss" }));
  };
  const onTossDone = (res) => {
    if (!active) return;
    updateMatch(active.id, m => ({
      ...m, phase: "live", startedAt: Date.now(),
      tossWinner: res.tossWinner, tossChoice: res.tossChoice, breakPlayer: res.breakPlayer,
      p1: { ...m.p1, color: res.p1Color || m.p1.color },
      p2: { ...m.p2, color: res.p2Color || m.p2.color },
    }));
  };

  // Load a match from the cloud into local state and make it active.
  const openFromCloud = async (row) => {
    if (!row?.data) return;
    upsertAndActivate(row.data);
    setView("play");
  };

  const deleteFromCloud = async (row) => {
    if (!isAdmin) return;
    if (!confirm(`Delete match "${row.p1_name} vs ${row.p2_name}"? This cannot be undone.`)) return;
    try {
      await deleteMatchById(row.id);
      // Also remove it locally if present
      closeMatch(row.id);
    } catch (e) { alert("Delete failed: " + e.message); }
  };

  const syncPill = (
    <span className={`drive-pill ${syncStatus==="synced"?"ok":syncStatus==="syncing"?"syncing":syncStatus==="error"?"err":"off"}`}>
      <span className="drive-ico">●</span>
      {syncStatus==="syncing"?"Syncing…":syncStatus==="synced"?"Cloud synced":syncStatus==="error"?"Sync error":"Cloud"}
    </span>
  );

  // Admin button is always visible to signed-in users.  The AdminPanel modal
  // itself handles all gating: "not configured" / "not the admin account" /
  // "wrong PIN".  Keeping the entry point visible makes setup discoverable —
  // a user who hasn't yet edited cloud.jsx can tap Admin and see clear
  // instructions in the modal instead of a missing button.
  const showAdminButton = true;

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
          {showAdminButton && (
            !isAdmin
              ? <button className="btn ghost sm" onClick={() => setAdminOpen(true)}>Admin</button>
              : <span className="chip break" onClick={() => setAdminOpen(true)} style={{ cursor: "pointer" }}>Admin ✓</span>
          )}
          <button className="btn ghost sm" onClick={startNew}>+ New</button>
          <button className="btn ghost sm" onClick={() => { signOut(); setSessionState(null); setIsAdmin(false); }}>Sign out</button>
        </div>
      </div>

      {state.matches.length > 0 && view === "play" && (
        <div className="tab-row">
          {state.matches.map(m => {
            const label = `${m.p1.name || "A"} vs ${m.p2.name || "B"}`;
            const isActive = m.id === state.activeId;
            const isMine = m.ownerId === session.id;
            return (
              <div key={m.id} className={`tab ${isActive ? "active" : ""}`}
                   onClick={() => setActive(m.id)} role="button"
                   title={m.ownerName ? `Started by ${m.ownerName}` : ""}>
                <span>{label}{!isMine && m.ownerName ? ` · ${m.ownerName}` : ""}</span>
                <span style={{ opacity: .6 }} className="mono">{m.p1.setsWon}-{m.p2.setsWon}</span>
                <button className="close" onClick={(e) => { e.stopPropagation();
                  if (confirm(`Close ${label} locally? Cloud copy stays.`)) closeMatch(m.id); }}>×</button>
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
          session={session}
          isAdmin={isAdmin}
          onUpdate={(u) => updateMatch(active.id, u)}
          onClose={() => { if (confirm("Close this match locally? Cloud copy stays.")) closeMatch(active.id); }} />
      )}
      {view === "play" && active?.phase === "setup" && <Welcome onStart={onStartFromWelcome} onHelp={() => setHelpOpen(true)} />}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)}
                  session={session}
                  isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
