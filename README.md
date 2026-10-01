<div align="center">
  <img alt="Sunday Funday Dynasty" src="static/badge.png" width="160" />

  # Sunday Funday Dynasty

  The league site for Sunday Funday — a 10-team, SuperFlex, full-PPR dynasty league on Sleeper, founded in 2021.
</div>

Built on [League Page](https://github.com/nmelhado/league-page) (see `LEAGUE_PAGE_README.md` for the original docs), with three tabs brought over from the [Federation of Fantasy Footballers](https://github.com/pgriffey91/Federation-of-Fantasy-Footballers) site:

- **Draft & FA** — live 2027 rookie draft board (picks 1–4 by Max PF among non-playoff teams, 5–10 by playoff finish, the 2.11 consolation pick), traded picks resolved with "via" labels, and a click-through showing the trade that moved each pick. Plus the rookie draft, FAAB, taxi, and trade rules.
- **Record Book** — champions wall, sortable career leaderboard (record, titles, finals, playoffs, #1 seeds, top-3 scoring seasons, PF per season, lineup efficiency, trades, rookie pick conversion), and a trophy room with each manager's all-time head-to-head (regular season + playoffs).
- **On This Day** — every trade and every startup/rookie draft from today's date in any past season, with prev/next day buttons.

The blog and Resources/news pages from League Page were removed, and the Constitution page now holds the Sunday Funday rulebook (with search).

## How it's hosted

The site is fully static and deploys to **GitHub Pages**. All league data is pulled live from the public Sleeper API in each visitor's browser, so there's nothing to update week to week.

The one thing League Page used to compute on a server — the player database + projections — is now built by `scripts/build-players.mjs` during each deploy and shipped as `players.json`. The deploy workflow (`.github/workflows/deploy.yml`) runs on every push to `main` and once a day to keep it fresh.

### One-time setup

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: "GitHub Actions".**
3. **Actions** tab → "Deploy to GitHub Pages" → **Run workflow** (or just push a commit).
4. The site goes live at `https://<your-username>.github.io/<repo-name>/` in a couple of minutes.

### Custom domain (later)

When you buy a `.com`: add a file `static/CNAME` containing just the domain (e.g. `sundayfundaydynasty.com`), push, then enter the same domain under Settings → Pages → Custom domain and point your DNS at GitHub ([GitHub's guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)). The workflow notices the CNAME and builds for the domain root automatically.

## Things to edit

Everything league-specific lives in **`src/lib/utils/leagueInfo.js`**:

- `leagueID` — **update this every season** when Sleeper renews the league (the new ID is in the Sleeper league URL). Older seasons are found automatically.
- `homepageText` — the intro on the home page.
- `managers` — bios, photos, favorite teams, rivals, etc. Each entry is tied to a manager by their Sleeper `managerID`; leave `photo: null` to use their Sleeper avatar, or drop an image in `static/managers/` and set `photo: "/managers/name.jpg"`.
- `consolationWinnerRosterId` — set to the consolation bracket winner's roster ID (1–10) to fill in pick 2.11 on the draft board.

The rulebook text is in `src/routes/constitution/+page.svelte`; the rule summaries on the Draft & FA tab are at the top of `src/lib/SundayFunday/DraftFA.svelte`. Colors come from the logo and live in `src/theme/` (light and dark).

## Running it locally

```bash
npm install
node scripts/build-players.mjs   # creates static/players.json (once a day is plenty)
npm run dev                      # http://localhost:5173
```
