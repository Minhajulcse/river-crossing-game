# River Crossing — Logic Challenge

## Run locally
Open `index.html` for the game UI.

## Global ranking architecture
- Frontend: static `index.html` hosted by Vercel.
- Server endpoints: `api/submit-score.js` and `api/leaderboard.js`.
- Database: Supabase Postgres.
- The browser gets a random local `playerId` and submits each level's best result.
- The database stores one best row per player per level.
- Overall ranking aggregates the player's best result from each completed level.
- **Normal** priority: fewer hints → less total time → fewer total moves.
- **Move** priority: fewer hints → fewer total moves → less total time.

## Supabase setup
1. Create a Supabase project.
2. Open SQL Editor and run `supabase_ranking.sql`.
3. In the Supabase project, copy the Project URL and the current server-side secret key.
4. In Vercel, add:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   The older `SUPABASE_SERVICE_ROLE_KEY` is also supported by the included functions.
5. Deploy the repo to Vercel.
6. Open `/` and use the **Ranking** button.

Keep the secret key only in Vercel Environment Variables. Never put it in client-side JavaScript.

## Important anti-cheat note
This version validates the score shape on the server and only allows a player to replace a level result with a better lexicographic result. Because the game has no account system, a determined user can still manipulate client-side requests or create new player IDs. For a serious competitive leaderboard, add Supabase Auth or another server-authoritative verification layer.
