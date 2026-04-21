// Shared small components

const { useState, useEffect, useRef, useCallback, useMemo } = React;

function BrandMark({ size = 34 }) {
  return <div className="brand-mark" style={{ width: size, height: size }} />;
}

function Coin({ color = "white", size = 18 }) {
  return <div className={`coin-dot ${color === "Black" || color === "black" ? "black" : ""}`}
              style={{ width: size, height: size }} />;
}

function Avatar({ name, color }) {
  const cls = (color === "Black") ? "black" : "white";
  return <div className={`avatar ${cls}`} title={name}>{initials(name)}</div>;
}

function Chip({ children, variant }) {
  return <span className={`chip ${variant || ""}`}>{children}</span>;
}

function SetPips({ won, max = 2 }) {
  const pips = [];
  for (let i = 0; i < max; i++) pips.push(<span key={i} className={`pip ${i < won ? "won" : ""}`} />);
  return <div className="setpips" title={`${won} of ${max} sets won`}>{pips}</div>;
}

function Confetti({ trigger, onDone }) {
  const [bits, setBits] = useState([]);
  useEffect(() => {
    if (!trigger) return;
    const colors = ["#c8a65a", "#f3e7cf", "#d94562", "#6b8e3d", "#fbf5e8", "#8e1f30"];
    const arr = Array.from({ length: 140 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 2.2 + Math.random() * 2,
      bg: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      w: 6 + Math.random() * 8,
      h: 10 + Math.random() * 14,
    }));
    setBits(arr);
    const t = setTimeout(() => { setBits([]); onDone && onDone(); }, 4500);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!bits.length) return null;
  return (
    <div className="confetti">
      {bits.map(b => (
        <i key={b.id} style={{
          left: `${b.left}vw`,
          background: b.bg,
          width: b.w, height: b.h,
          transform: `rotate(${b.rot}deg)`,
          animationDuration: `${b.dur}s`,
          animationDelay: `${b.delay}s`,
        }} />
      ))}
    </div>
  );
}

function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// Topbar shared
function TopBar({ onNew, onHome, driveSlot }) {
  return (
    <div className="topbar">
      <div className="brand" style={{ cursor: "pointer" }} onClick={onHome}>
        <BrandMark />
        <div className="brand-name">Striker <em>/</em> Carrom</div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        {driveSlot}
        <button className="btn ghost sm" onClick={onNew}>+ New Match</button>
      </div>
    </div>
  );
}

Object.assign(window, { BrandMark, Coin, Avatar, Chip, SetPips, Confetti, Modal, TopBar });
