# Striker — Carrom Scoreboard

A browser-based scoreboard app for singles and doubles carrom matches, with multi-device cloud sync via Supabase.

## What's new in this build

This build fixes three classes of problems that existed in the previous version:

### 1. Only the player who starts a match controls its scoring
Every match now records the ID and display name of the account that created it (its **owner**). Other signed-in users can open the match from the Leaderboard and watch scores update in real time, but:

- the "Award the current board" panel is hidden for them
- Undo, Reset Set, Reset Match, Swap Players are hidden for them
- any local changes they attempt are blocked from syncing to the cloud
- a **"Read-only — this match is being run by X"** banner is shown

When the owner scores a board, everyone else's view updates within ~1 second via a Supabase realtime subscription.

### 2. Admin is locked to one hardcoded identity
The previous version let anyone become admin on their own device by tapping the Admin button and picking a PIN. That's gone. Admin is now guarded by **two** requirements, both of which must pass in the same session:

1. The signed-in user's name (case-insensitive) matches the hardcoded `ADMIN_NAME`.
2. The user enters a PIN whose SHA-256 hash matches the hardcoded `ADMIN_PIN_HASH`.

Both values live in `src/cloud.jsx`. Until you edit them away from their placeholder defaults, **admin is permanently disabled for everyone**. Since the Supabase `players` table enforces a unique name and every account is PIN-protected, no one else can impersonate your admin username.

Admin adds these powers on top of full editing on any match:
- **Rollback last set** — un-finalize the most recently completed set
- **Force-end current set** — end the set immediately, whoever's ahead takes it
- **Re-open match** — turn a finished match back to "live" for editing
- **Delete match** from the Leaderboard

### 3. Other fixes
- Loading a match from the Leaderboard now actually works (previous code created a new match with a different id and then tried to update a stale ref).
- `index.html` no longer double-loads `app.jsx`.
- `awardBoard` cleanup: removed redundant dead code around `setA`/`setB`.
- `pushUndo` no longer stores the whole undo stack inside each snapshot, preventing exponential memory growth on long matches.
- Sign-out now also strips admin status.
- When the admin deletes a match from the Leaderboard, the local copy is also closed so it doesn't reappear.

---

## One-time setup: enabling admin

1. Open **`admin-setup.html`** in your browser (double-click the file).
2. Type the username you will sign in with (pick something only you know or already use).
3. Type a 4–8 digit admin PIN. **This is separate from your sign-in PIN** — the app requires both.
4. Copy the two lines the page prints.
5. Open **`src/cloud.jsx`** in any text editor.
6. Find the `ADMIN CONFIGURATION` block near the top and replace the two placeholder lines:
   ```js
   const ADMIN_NAME = "__SET_YOUR_USERNAME__";
   const ADMIN_PIN_HASH = "__SET_YOUR_ADMIN_PIN_HASH__";
   ```
7. Save and reload the app.
8. Sign in with your chosen username and PIN. The **Admin** button will appear in the top bar — tap it, enter your admin PIN, done.

> ⚠️ If you ever forget the admin PIN, just regenerate a new one with `admin-setup.html` and replace the `ADMIN_PIN_HASH` line. There is no recovery flow by design.

---

## Running the app

This is a pure static app. Open `index.html` in any modern browser or host the folder on any static-file server (GitHub Pages, Netlify, a local `python -m http.server`, etc.).

## Security notes

- Sign-in PIN is salted with the username and SHA-256 hashed before leaving your device.
- Admin PIN is salted with a different context string and hashed; only the hash lives in source.
- The Supabase anon key is a **public** key by design — the actual lockdown is enforced by Row Level Security on the Supabase side if you want server-enforced rules. The client-side checks in this app protect against casual tampering; a determined user who can edit the code locally can still tamper with their own copy. This is the standard trade-off for any browser-hosted scorekeeper.
- For stronger server-side protection, add Supabase RLS policies that allow updates/deletes on `matches` only when `auth.uid() = owner_player_id` and allow admin operations only from a specific role.
