// Welcome screen: enter 2 names + coin colors

function Welcome({ onStart }) {
  const [n1, setN1] = React.useState("");
  const [n2, setN2] = React.useState("");
  const [c1, setC1] = React.useState("White");
  const [c2, setC2] = React.useState("Black");

  const setColor = (who, col) => {
    if (who === 1) {
      setC1(col); setC2(col === "White" ? "Black" : "White");
    } else {
      setC2(col); setC1(col === "White" ? "Black" : "White");
    }
  };

  const ready = n1.trim() && n2.trim() && n1.trim() !== n2.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    onStart({ name1: n1.trim(), name2: n2.trim(), color1: c1, color2: c2 });
  };

  return (
    <div className="welcome">
      <form className="welcome-card" onSubmit={submit}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Strike · Pocket · Win</div>
        <h1>A new match<br/><em>begins.</em></h1>
        <p className="lede">
          Enter both players below. Your match auto-saves as you play — refresh anytime, pick up where you left off.
        </p>

        <div className="names">
          <div className="name-field">
            <div className="eyebrow">Player one</div>
            <input autoFocus placeholder="Name..." value={n1} onChange={e => setN1(e.target.value)} maxLength={24} />
            <div className="coin-row">
              <button type="button"
                      className={`coin-pick ${c1==="White"?"active":""}`}
                      onClick={() => setColor(1,"White")}>
                <Coin color="white" /> White
              </button>
              <button type="button"
                      className={`coin-pick ${c1==="Black"?"active":""}`}
                      onClick={() => setColor(1,"Black")}>
                <Coin color="black" /> Black
              </button>
            </div>
          </div>

          <div className="versus">vs.</div>

          <div className="name-field">
            <div className="eyebrow">Player two</div>
            <input placeholder="Name..." value={n2} onChange={e => setN2(e.target.value)} maxLength={24} />
            <div className="coin-row">
              <button type="button"
                      className={`coin-pick ${c2==="White"?"active":""}`}
                      onClick={() => setColor(2,"White")}>
                <Coin color="white" /> White
              </button>
              <button type="button"
                      className={`coin-pick ${c2==="Black"?"active":""}`}
                      onClick={() => setColor(2,"Black")}>
                <Coin color="black" /> Black
              </button>
            </div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="tip">
            Next: toss the striker · best of 3 sets · 25 points or 8 boards
          </div>
          <button type="submit" className="btn primary" disabled={!ready}>
            Toss the Striker →
          </button>
        </div>
      </form>
    </div>
  );
}

Object.assign(window, { Welcome });
