// Welcome screen: enter 2 names. Coin colors are decided by the toss.

function Welcome({ onStart, onHelp }) {
  const [n1, setN1] = React.useState("");
  const [n2, setN2] = React.useState("");

  const ready = n1.trim() && n2.trim() && n1.trim() !== n2.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    onStart({ name1: n1.trim(), name2: n2.trim() });
  };

  return (
    <div className="welcome">
      <form className="welcome-card" onSubmit={submit}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Strike · Pocket · Win</div>
        <h1>A new match<br/><em>begins.</em></h1>
        <p className="lede">
          Enter both players below. Your match auto-saves as you play — refresh anytime, pick up where you left off.
        </p>
        <p className="tip" style={{ margin: "-18px 0 24px" }}>
          Coin colors are set after the toss. A player who chooses to break starts with White.
        </p>

        <div className="names">
          <div className="name-field">
            <div className="eyebrow">Player one</div>
            <input autoFocus placeholder="Name..." value={n1} onChange={e => setN1(e.target.value)} maxLength={24} />
          </div>

          <div className="versus">vs.</div>

          <div className="name-field">
            <div className="eyebrow">Player two</div>
            <input placeholder="Name..." value={n2} onChange={e => setN2(e.target.value)} maxLength={24} />
          </div>
        </div>

        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="tip">
            Next: toss the striker · best of 3 sets · 25 points or 8 boards
          </div>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            {onHelp && (
              <button type="button" className="btn ghost" onClick={onHelp}>
                How it works
              </button>
            )}
            <button type="submit" className="btn primary" disabled={!ready}>
              Toss the Striker →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

Object.assign(window, { Welcome });
