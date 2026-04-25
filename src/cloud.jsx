// Supabase client + auth (name + PIN) + match sync + admin lock

const SUPABASE_URL = "https://csdrlzvkwtkpjfjzglsl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZHJsenZrd3RrcGpmanpnbHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTY1NjQsImV4cCI6MjA5MjMzMjU2NH0.0_QrLivfuNpDcIm0p4bOsFAbFUKDTgQD-amQOPFFkas";
const SESSION_KEY = "striker.session.v1";

// =============================================================================
// ADMIN CONFIGURATION — EDIT BOTH VALUES BELOW BEFORE DEPLOYING
// -----------------------------------------------------------------------------
//  Admin rights are granted ONLY when BOTH conditions are true in one session:
//    1) The signed-in user's name (case-insensitive) matches ADMIN_NAME.
//    2) The user enters a PIN whose SHA-256 hash equals ADMIN_PIN_HASH.
//
//  Until BOTH values are set to non-placeholder strings, admin is permanently
//  disabled for everyone.  Other users can never become admin.
//
//  HOW TO SET UP (one time):
//    1. Open admin-setup.html in your browser.
//    2. Type your username (exactly as you'll sign in) and a 4–8 digit PIN.
//    3. The page prints the two lines below — paste them in, save, reload.
// =============================================================================
const ADMIN_NAME = "__SET_YOUR_USERNAME__";
const ADMIN_PIN_HASH = "__SET_YOUR_ADMIN_PIN_HASH__";
// =============================================================================

const ADMIN_NAME_PLACEHOLDER = "__SET_YOUR_USERNAME__";
const ADMIN_PIN_HASH_PLACEHOLDER = "__SET_YOUR_ADMIN_PIN_HASH__";

function adminConfigured() {
  return ADMIN_NAME !== ADMIN_NAME_PLACEHOLDER
      && ADMIN_PIN_HASH !== ADMIN_PIN_HASH_PLACEHOLDER
      && typeof ADMIN_NAME === "string" && ADMIN_NAME.trim().length > 0
      && typeof ADMIN_PIN_HASH === "string" && ADMIN_PIN_HASH.length === 64;
}

function isAdminEligible(session) {
  if (!adminConfigured()) return false;
  if (!session?.name) return false;
  return session.name.trim().toLowerCase() === ADMIN_NAME.trim().toLowerCase();
}

async function hashAdminPin(pin) {
  const msg = `striker_admin_v1|${pin}`;
  const buf = new TextEncoder().encode(msg);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyAdminPin(pin) {
  if (!adminConfigured()) return false;
  try {
    const h = await hashAdminPin(pin);
    if (h.length !== ADMIN_PIN_HASH.length) return false;
    let diff = 0;
    for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ ADMIN_PIN_HASH.charCodeAt(i);
    return diff === 0;
  } catch { return false; }
}

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

// Login PIN hashing (name-scoped salt)
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
  name = name.trim();
  if (!name) throw new Error("Enter a name.");
  const pinHash = await hashPin(name, pin);

  // Find existing by case-insensitive name match
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
    if (String(insErr.message).toLowerCase().includes("duplicate"))
      throw new Error("That name is taken — try a different spelling.");
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
    // Prefer owner recorded ON the match (set at creation) over the caller's id.
    // The owner's display name lives inside match.data.ownerName, so we don't need
    // an extra column for it.
    owner_player_id: match.ownerId || ownerId || null,
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

async function fetchMatchById(id) {
  const sb = await getSupabase();
  const { data, error } = await sb.from("matches").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function deleteMatchById(id) {
  const sb = await getSupabase();
  const { error } = await sb.from("matches").delete().eq("id", id);
  if (error) throw error;
}

// Realtime subscription to the whole matches table (used by Leaderboard)
async function subscribeMatches(onChange) {
  const sb = await getSupabase();
  const ch = sb.channel("matches-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, (payload) => {
      onChange(payload);
    })
    .subscribe();
  return () => { sb.removeChannel(ch); };
}

// Realtime subscription for ONE match (spectators see live score changes)
async function subscribeToMatch(matchId, onChange) {
  const sb = await getSupabase();
  const ch = sb.channel(`match-${matchId}`)
    .on("postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => { onChange(payload); })
    .subscribe();
  return () => { sb.removeChannel(ch); };
}

Object.assign(window, {
  SUPABASE_URL, SUPABASE_ANON, SESSION_KEY,
  ADMIN_NAME, ADMIN_PIN_HASH,
  adminConfigured, isAdminEligible, hashAdminPin, verifyAdminPin,
  getSupabase, hashPin, getSession, setSession,
  signInOrRegister, signOut,
  scheduleSupabaseSync, fetchAllMatches, fetchMatchById, deleteMatchById,
  subscribeMatches, subscribeToMatch,
});
