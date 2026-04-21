// Sign-in screen (name + 4-digit PIN)

function SignIn({ onSignedIn }) {
  const [name, setName] = React.useState("");
  const [pin, setPin]   = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr]   = React.useState(null);

  const go = async (e) => {
    e.preventDefault();
    if (!name.trim() || pin.length < 4) return;
    setBusy(true); setErr(null);
    try {
      const session = await signInOrRegister(name, pin);
      onSignedIn(session);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="welcome">
      <form className="welcome-card" onSubmit={go} style={{ maxWidth: 560 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Sign in · first time? Pick a PIN</div>
        <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>Welcome, <em>striker.</em></h1>
        <p className="lede">
          Enter your name and a 4-digit PIN. New name = new account. Your PIN stops anyone else from editing your matches.
        </p>

        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <div className="name-field">
            <div className="eyebrow">Your name</div>
            <input autoFocus placeholder="e.g. Raj" value={name}
                   onChange={e => setName(e.target.value)} maxLength={24} />
          </div>
          <div className="name-field">
            <div className="eyebrow">4–6 digit PIN</div>
            <input type="password" inputMode="numeric" pattern="[0-9]*" placeholder="••••"
                   value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,"").slice(0,6))}
                   style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.5em" }} />
          </div>
        </div>

        {err && (
          <div className="drive-error" style={{ marginTop: 12 }}>{err}</div>
        )}

        <div className="row" style={{ justifyContent: "space-between", marginTop: 18, flexWrap: "wrap", gap: 12 }}>
          <div className="tip">Your PIN is hashed before being stored — we never see it in plain text.</div>
          <button type="submit" className="btn primary" disabled={busy || !name.trim() || pin.length < 4}>
            {busy ? "Signing in…" : "Enter →"}
          </button>
        </div>
      </form>
    </div>
  );
}

Object.assign(window, { SignIn });
