// Supabase client + auth (name + PIN) + match sync

const SUPABASE_URL = "https://csdrlzvkwtkpjfjzglsl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZHJsenZrd3RrcGpmanpnbHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTY1NjQsImV4cCI6MjA5MjMzMjU2NH0.0_QrLivfuNpDcIm0p4bOsFAbFUKDTgQD-amQOPFFkas";
const SESSION_KEY = "striker.session.v1";
const ADMIN_PIN_KEY = "striker.admin.v1"; // owner-only, set in admin panel

// Lazy-load supabase-js
let _sbReady = null;
function getSupabase() {
  if (_sbReady) return _sbReady;
  _sbReady = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
    s.onload = () => {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      resolve(client);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _sbReady;
}

// Simple PIN hashing (SHA-256 + salt). Not military-grade but prevents casual reading.
async function hashPin(name, pin) {
  const msg = `striker|${name.toLowerCase().trim()}|${pin}`;
  const buf = new TextEncoder().encode(msg);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function setSession(s) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

async function signInOrRegister(name, pin) {
  const sb = await getSupabase();
  const pinHash = await hashPin(name, pin);
  name = name.trim();

  // Try find existing
  const { data: existing, error: findErr } = await sb
    .from("players").select("id,name,pin_hash").ilike("name", name).limit(1).maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (existing) {
    if (existing.pin_hash !== pinHash) throw new Error("Wrong PIN for that name.");
    const session = { id: existing.id, name: existing.name };
    setSession(session);
    return session;
  }
  // Create new
  const { data: created, error: insErr } = await sb
    .from("players").insert({ name, pin_hash: pinHash }).select("id,name").single();
  if (insErr) {
    if (String(insErr.message).includes("duplicate")) throw new Error("That name is taken. Use a different PIN / spelling.");
    throw new Error(insErr.message);
  }
  const session = { id: created.id, name: created.name };
  setSession(session);
  return session;
}

function signOut() { setSession(null); }

// ---------- Match sync ----------

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
    updated_at: new Date().toISOString(),
  };
}

const _sbTimers = new Map();
const _sbLast = new Map();
function scheduleSupabaseSync(match, ownerId, opts = {}) {
  const { delay = 1200, onStatus } = opts;
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
      const { error } = await sb.from("matches").upsert(row, { onConflict: "id" });
      if (error) throw error;
      onStatus && onStatus("synced");
    } catch (e) {
      console.warn("Supabase sync failed:", e);
      onStatus && onStatus("error", e.message);
    }
  }, delay);
  _sbTimers.set(match.id, t);
}

async function fetchAllMatches({ limit = 200 } = {}) {
  const sb = await getSupabase();
  const { data, error } = await sb.from("matches")
    .select("*").order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function deleteMatchById(id) {
  const sb = await getSupabase();
  const { error } = await sb.from("matches").delete().eq("id", id);
  if (error) throw error;
}

// Realtime subscription
async function subscribeMatches(onChange) {
  const sb = await getSupabase();
  const ch = sb.channel("matches-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, (payload) => {
      onChange(payload);
    })
    .subscribe();
  return () => { sb.removeChannel(ch); };
}

Object.assign(window, {
  SUPABASE_URL, SUPABASE_ANON, SESSION_KEY, ADMIN_PIN_KEY,
  getSupabase, hashPin, getSession, setSession,
  signInOrRegister, signOut,
  scheduleSupabaseSync, fetchAllMatches, deleteMatchById, subscribeMatches,
});
