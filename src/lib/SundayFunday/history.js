// Data builders for the Record Book, On This Day, and Draft & FA pages.
// Ported from the Federation of Fantasy Footballers site and adapted to the
// Sunday Funday constitution (no salaries; 6-team playoff; rookie order by
// Max PF for non-playoff teams and by playoff finish for the rest).

import { leagueID, consolationWinnerRosterId } from '$lib/utils/leagueInfo';
import {
    API, cachedJSON, mapLimit, collectSeasonChain, getSeasonShell, getSeasonTransactions,
    pickRookieDraft, isStartupDraft, getPlayers, playerLabel, roundLabel, rosterStats, seedTeams,
    regularSeasonLength, optimalLineupPoints, avatarURL,
} from './sleeper';

const TWO_SEASONS_MS = 2 * 365 * 24 * 3600 * 1000;

/* ======================================================================
   Draft pick → drafted player resolution (shared by trade descriptions)
   ====================================================================== */

// A traded pick's original draft slot doesn't move when it's traded — only
// who makes the pick does — so the draft's slot_to_roster_id tells us which
// pick_no was "originalRid's Nth-rounder", whoever ended up using it.
const draftInfoCache = new Map();
async function getRookieDraftInfo(seasonToLeagueId, season) {
    const id = seasonToLeagueId.get(String(season));
    if (!id) return null;
    if (draftInfoCache.has(id)) return draftInfoCache.get(id);
    const p = (async () => {
        try {
            const drafts = await cachedJSON(`${API}/league/${id}/drafts`);
            const summary = pickRookieDraft(drafts);
            if (!summary) return null;
            const [draft, picks] = await Promise.all([
                cachedJSON(`${API}/draft/${summary.draft_id}`),
                cachedJSON(`${API}/draft/${summary.draft_id}/picks`),
            ]);
            if (!draft || !draft.slot_to_roster_id || !picks || !picks.length) return null;
            const slotByRoster = new Map(Object.entries(draft.slot_to_roster_id).map(([slot, rid]) => [Number(rid), Number(slot)]));
            const teamCount = Object.keys(draft.slot_to_roster_id).length || 10;
            return { slotByRoster, picksByNo: new Map(picks.map((pk) => [pk.pick_no, pk])), teamCount };
        } catch (err) {
            console.error(`Draft lookup failed for ${season}`, err);
            return null;
        }
    })();
    draftInfoCache.set(id, p);
    return p;
}

async function resolveDraftedPlayer(seasonToLeagueId, players, season, round, originalRid) {
    const info = await getRookieDraftInfo(seasonToLeagueId, season);
    if (!info) return null;
    const slot = info.slotByRoster.get(Number(originalRid));
    if (!slot) return null;
    const pick = info.picksByNo.get((round - 1) * info.teamCount + slot);
    if (!pick) return null;
    if (pick.player_id) return playerLabel(players, pick.player_id);
    const meta = pick.metadata || {};
    return [meta.first_name, meta.last_name].filter(Boolean).join(' ') || null;
}

// Turns a Sleeper trade into "who received what", per team. Picks from a
// season whose draft already happened show the player they became.
async function describeTrade(tx, shell, players, seasonToLeagueId) {
    const gains = new Map();
    const add = (rid, item) => {
        if (!gains.has(rid)) gains.set(rid, []);
        if (item) gains.get(rid).push(item);
    };
    for (const rid of tx.roster_ids || []) add(rid, null);
    for (const [pid, rid] of Object.entries(tx.adds || {})) add(rid, { kind: 'player', text: playerLabel(players, pid), playerId: String(pid) });
    for (const pick of tx.draft_picks || []) {
        const from = shell.rosterName.get(pick.roster_id) || `Team ${pick.roster_id}`;
        const drafted = await resolveDraftedPlayer(seasonToLeagueId, players, pick.season, pick.round, pick.roster_id);
        add(pick.owner_id, {
            kind: 'pick',
            text: drafted
                ? `${pick.season} ${roundLabel(pick.round)} pick → ${drafted}`
                : `${pick.season} ${roundLabel(pick.round)} pick (${from}'s)`,
        });
    }
    for (const move of tx.waiver_budget || []) add(move.receiver, { kind: 'faab', text: `$${move.amount} FAAB` });
    return Array.from(gains.entries()).map(([rid, items]) => ({
        rid,
        name: shell.rosterName.get(rid) || `Team ${rid}`,
        avatar: shell.rosterAvatar.get(rid) || null,
        gained: items.length ? items : [{ kind: 'none', text: 'Nothing notable' }],
    }));
}

/* ======================================================================
   RECORD BOOK
   ====================================================================== */

export async function buildRecordBook() {
    const [chain, players] = await Promise.all([collectSeasonChain(), getPlayers()]);

    const userInfo = new Map(); // user_id -> { name, avatar }  (newest season wins)
    const h2h = new Map(); // `${a}|${b}` -> { wins, losses, ties, pWins, pLosses }
    const trophies = new Map(); // user_id -> { championships, runnerups, thirds, playoffs, seasons[], titleYears[] }
    const career = new Map(); // user_id -> leaderboard stats
    const dropsByUserPlayer = new Map(); // `${uid}|${playerId}` -> earliest drop ts
    const rookiePicks = []; // { uid, playerId, draftDate }
    const seasonsSummary = []; // per-season champion etc.

    const ensureUser = (uid, name, avatar) => {
        if (!uid || userInfo.has(uid)) return;
        userInfo.set(uid, { name: name || `Manager ${uid}`, avatar: avatar || null });
    };
    const T = (uid) => {
        if (!trophies.has(uid)) trophies.set(uid, { championships: 0, runnerups: 0, thirds: 0, playoffs: 0, seasons: [], titleYears: [] });
        return trophies.get(uid);
    };
    const C = (uid) => {
        if (!career.has(uid)) career.set(uid, {
            seasons: 0, completeSeasons: 0, completePF: 0, wins: 0, losses: 0, ties: 0, pointsFor: 0, maxPF: 0, maxPFSeasons: 0,
            top3Seasons: 0, firstSeedSeasons: 0, trades: 0, picksEligible: 0, picksConverted: 0,
            bestSeason: null,
        });
        return career.get(uid);
    };
    const bump = (a, b, field) => {
        const key = `${a}|${b}`;
        if (!h2h.has(key)) h2h.set(key, { wins: 0, losses: 0, ties: 0, pWins: 0, pLosses: 0 });
        h2h.get(key)[field]++;
    };

    const seasonToLeagueId = new Map(chain.map((l) => [String(l.season), l.league_id]));

    // Name/avatar labels come from the newest season each manager played in
    // (chain is newest-first). Usernames, not team names, since team names
    // get rebranded but a Sleeper username sticks.
    for (const league of chain) {
        try {
            const sh = await getSeasonShell(league);
            for (const [, uid] of sh.rosterToUser) {
                const u = sh.userMap.get(uid) || {};
                ensureUser(uid, u.display_name, avatarURL(u));
            }
        } catch (e) { /* handled per-season below */ }
    }

    await mapLimit(chain, 2, async (league) => {
        const season = league.season;
        const id = league.league_id;
        let shell;
        try {
            shell = await getSeasonShell(league);
        } catch (err) {
            console.error(`Record Book: users/rosters failed for ${season}`, err);
            return;
        }
        const { rosterToUser } = shell;
        const complete = league.status === 'complete';
        const regLen = regularSeasonLength(league);

        // Regular-season record / points / Max PF (Sleeper's own season totals)
        const teams = shell.rosters.filter((r) => r.owner_id).map(rosterStats);
        const usesSleeperMaxPF = teams.every((t) => t.maxPF != null && t.maxPF > 0);
        for (const t of teams) {
            const uid = rosterToUser.get(t.rid);
            const c = C(uid);
            c.seasons++;
            c.wins += t.wins; c.losses += t.losses; c.ties += t.ties;
            c.pointsFor += t.pointsFor;
            if (complete) { c.completeSeasons++; c.completePF += t.pointsFor; }
            if (usesSleeperMaxPF) { c.maxPF += t.maxPF; c.maxPFSeasons++; }
            if (complete && (!c.bestSeason || t.pointsFor > c.bestSeason.points)) c.bestSeason = { season, points: t.pointsFor };
        }
        const hasPlayed = teams.some((t) => t.wins + t.losses + t.ties > 0);
        if (hasPlayed && complete) {
            const seeded = seedTeams(teams);
            const firstSeed = rosterToUser.get(seeded[0].rid);
            if (firstSeed) C(firstSeed).firstSeedSeasons++;
            for (const t of [...teams].sort((a, b) => b.pointsFor - a.pointsFor).slice(0, 3)) {
                const uid = rosterToUser.get(t.rid);
                if (uid) C(uid).top3Seasons++;
            }
        }

        // Regular-season head-to-head (and Max PF fallback if Sleeper didn't report ppts)
        const weeks = Array.from({ length: regLen }, (_, i) => i + 1);
        const weekData = await mapLimit(weeks, 6, (w) => cachedJSON(`${API}/league/${id}/matchups/${w}`).catch(() => []));
        for (const wk of weekData) {
            if (!Array.isArray(wk) || !wk.length) continue;
            const pairs = new Map();
            for (const e of wk) {
                if (e.matchup_id == null) continue;
                if (!pairs.has(e.matchup_id)) pairs.set(e.matchup_id, []);
                pairs.get(e.matchup_id).push(e);
                if (!usesSleeperMaxPF && (e.points || 0) > 0) {
                    const uid = rosterToUser.get(e.roster_id);
                    if (uid) {
                        const opt = optimalLineupPoints(e.players, e.players_points || {}, league.roster_positions, players);
                        C(uid).maxPF += Math.max(opt, e.points || 0);
                    }
                }
            }
            for (const pair of pairs.values()) {
                if (pair.length !== 2) continue;
                const [x, y] = pair;
                const ux = rosterToUser.get(x.roster_id);
                const uy = rosterToUser.get(y.roster_id);
                const px = x.points || 0;
                const py = y.points || 0;
                if (!ux || !uy || (px === 0 && py === 0)) continue; // not played yet
                if (px === py) { bump(ux, uy, 'ties'); bump(uy, ux, 'ties'); }
                else if (px > py) { bump(ux, uy, 'wins'); bump(uy, ux, 'losses'); }
                else { bump(ux, uy, 'losses'); bump(uy, ux, 'wins'); }
            }
        }
        if (!usesSleeperMaxPF) {
            for (const t of teams) {
                const uid = rosterToUser.get(t.rid);
                if (uid) C(uid).maxPFSeasons++;
            }
        }

        // Playoffs: appearances, trophies, and playoff head-to-head
        try {
            const bracket = await cachedJSON(`${API}/league/${id}/winners_bracket`);
            const inPlayoffs = new Set();
            let champion = null;
            for (const m of bracket || []) {
                for (const rid of [m.t1, m.t2]) {
                    if (typeof rid === 'number' && rosterToUser.get(rid)) inPlayoffs.add(rosterToUser.get(rid));
                }
                if (m.w != null && m.l != null) {
                    const uw = rosterToUser.get(m.w);
                    const ul = rosterToUser.get(m.l);
                    // Only real playoff games (not placement games below 3rd) count as playoff H2H
                    if (uw && ul && (m.p == null || m.p <= 3)) { bump(uw, ul, 'pWins'); bump(ul, uw, 'pLosses'); }
                }
                if (m.p === 1 && m.w != null) {
                    const cu = rosterToUser.get(m.w);
                    const ru = m.l != null ? rosterToUser.get(m.l) : null;
                    if (cu) { T(cu).championships++; T(cu).titleYears.push(season); champion = cu; }
                    if (ru) T(ru).runnerups++;
                }
                if (m.p === 3 && m.w != null) {
                    const tu = rosterToUser.get(m.w);
                    if (tu) T(tu).thirds++;
                }
            }
            if (hasPlayed) {
                inPlayoffs.forEach((uid) => { const t = T(uid); t.playoffs++; t.seasons.push(season); });
            }
            seasonsSummary.push({ season, champion, complete });
        } catch (err) {
            console.error(`Record Book: bracket failed for ${season}`, err);
            seasonsSummary.push({ season, champion: null, complete });
        }

        // Trades + drops (for pick conversion)
        const txs = await getSeasonTransactions(league);
        for (const tx of txs) {
            const ts = tx.status_updated || tx.created;
            if (tx.type === 'trade') {
                for (const rid of tx.roster_ids || []) {
                    const uid = rosterToUser.get(rid);
                    if (uid) C(uid).trades++;
                }
            }
            if (tx.drops && ts) {
                for (const [pid, rid] of Object.entries(tx.drops)) {
                    const uid = rosterToUser.get(rid);
                    if (!uid) continue;
                    const key = `${uid}|${pid}`;
                    const prev = dropsByUserPlayer.get(key);
                    if (prev == null || ts < prev) dropsByUserPlayer.set(key, ts);
                }
            }
        }

        // Rookie-draft picks (startup draft excluded)
        try {
            const drafts = await cachedJSON(`${API}/league/${id}/drafts`);
            const rookie = pickRookieDraft(drafts);
            const draftDate = rookie && (rookie.start_time || rookie.last_picked);
            if (rookie && draftDate) {
                const picks = await cachedJSON(`${API}/draft/${rookie.draft_id}/picks`).catch(() => []);
                for (const p of picks || []) {
                    const uid = rosterToUser.get(p.roster_id);
                    if (p.player_id && uid) rookiePicks.push({ uid, playerId: p.player_id, draftDate });
                }
            }
        } catch (err) {
            console.error(`Record Book: drafts failed for ${season}`, err);
        }
    });

    // Pick conversion: a rookie pick "converted" if the GM who drafted him
    // didn't cut him within two seasons. Picks younger than two seasons aren't
    // judged yet.
    const now = Date.now();
    for (const pick of rookiePicks) {
        if (now - pick.draftDate < TWO_SEASONS_MS) continue;
        const c = C(pick.uid);
        c.picksEligible++;
        const droppedAt = dropsByUserPlayer.get(`${pick.uid}|${pick.playerId}`);
        if (droppedAt == null || droppedAt - pick.draftDate > TWO_SEASONS_MS) c.picksConverted++;
    }

    // Current managers (from the newest season) get cards.
    const currentShell = await getSeasonShell(chain[0]);
    const currentUserIds = [...new Set(currentShell.rosters.map((r) => r.owner_id).filter(Boolean))];

    const emptyT = { championships: 0, runnerups: 0, thirds: 0, playoffs: 0, seasons: [], titleYears: [] };
    const managers = currentUserIds.map((uid) => ({
        uid,
        info: userInfo.get(uid) || { name: `Manager ${uid}`, avatar: null },
        t: trophies.get(uid) || emptyT,
        c: career.get(uid) || C(uid),
    }));

    const champions = seasonsSummary
        .filter((s) => s.champion)
        .sort((a, b) => Number(b.season) - Number(a.season))
        .map((s) => ({ season: s.season, uid: s.champion, ...(userInfo.get(s.champion) || { name: 'Unknown' }) }));

    return {
        managers,
        h2h,
        userInfo,
        champions,
        seasons: chain.map((l) => l.season).sort(),
    };
}

/* ======================================================================
   ON THIS DAY
   ====================================================================== */

export async function buildOnThisDay(date = new Date()) {
    const [chain, players] = await Promise.all([collectSeasonChain(), getPlayers()]);
    const month = date.getMonth();
    const day = date.getDate();
    const sameDay = (ts) => {
        if (!ts) return false;
        const d = new Date(ts);
        return d.getMonth() === month && d.getDate() === day;
    };
    const seasonToLeagueId = new Map(chain.map((l) => [String(l.season), l.league_id]));

    const trades = [];
    const drafts = [];

    await mapLimit(chain, 2, async (league) => {
        const season = league.season;
        let shell;
        try {
            shell = await getSeasonShell(league);
        } catch (err) {
            console.error(`On This Day: users/rosters failed for ${season}`, err);
            return;
        }

        const txs = await getSeasonTransactions(league);
        for (const tx of txs) {
            if (tx.type !== 'trade') continue;
            const ts = tx.status_updated || tx.created;
            if (!sameDay(ts)) continue;
            trades.push({ season, ts, teams: await describeTrade(tx, shell, players, seasonToLeagueId) });
        }

        try {
            const seasonDrafts = await cachedJSON(`${API}/league/${league.league_id}/drafts`);
            for (const draft of seasonDrafts || []) {
                // A slow draft runs for days; it shows up on the day it started.
                if (!sameDay(draft.start_time)) continue;
                const picks = await cachedJSON(`${API}/draft/${draft.draft_id}/picks`).catch(() => []);
                if (!picks || !picks.length) continue;
                const teamCount = (draft.settings && draft.settings.teams) || shell.rosters.length || 10;
                const rows = [...picks]
                    .sort((a, b) => a.pick_no - b.pick_no)
                    .map((p) => {
                        const meta = p.metadata || {};
                        return {
                            label: `${p.round}.${String(((p.pick_no - 1) % teamCount) + 1).padStart(2, '0')}`,
                            team: shell.rosterName.get(p.roster_id) || `Team ${p.roster_id}`,
                            player: p.player_id ? playerLabel(players, p.player_id)
                                : [meta.first_name, meta.last_name].filter(Boolean).join(' ') || '—',
                        };
                    });
                drafts.push({
                    season,
                    ts: draft.start_time,
                    kind: isStartupDraft(draft) ? 'Startup Draft' : 'Rookie Draft',
                    rounds: (draft.settings && draft.settings.rounds) || null,
                    picks: rows,
                });
            }
        } catch (err) {
            console.error(`On This Day: drafts failed for ${season}`, err);
        }
    });

    trades.sort((a, b) => b.ts - a.ts);
    drafts.sort((a, b) => Number(b.season) - Number(a.season));

    return {
        trades,
        drafts,
        dateLabel: date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
        seasons: chain.map((l) => l.season).sort(),
    };
}

/* ======================================================================
   DRAFT & FA — next season's rookie draft board
   ====================================================================== */

// Final placements from a completed winners bracket (Sleeper marks the
// title game p=1, 3rd-place game p=3, 5th-place game p=5).
function playoffPlacements(bracket) {
    const place = new Map(); // place number -> roster_id
    for (const m of bracket || []) {
        if (m.w == null || m.l == null) continue;
        if (m.p === 1) { place.set(1, m.w); place.set(2, m.l); }
        if (m.p === 3) { place.set(3, m.w); place.set(4, m.l); }
        if (m.p === 5) { place.set(5, m.w); place.set(6, m.l); }
    }
    return place;
}

export async function buildDraftBoard() {
    const chain = await collectSeasonChain();
    const league = chain[0];
    const shell = await getSeasonShell(league);
    const [bracket, tradedPicks] = await Promise.all([
        cachedJSON(`${API}/league/${league.league_id}/winners_bracket`).catch(() => []),
        cachedJSON(`${API}/league/${leagueID}/traded_picks`).catch(() => []),
    ]);

    const teams = shell.rosters.map((r) => ({
        ...rosterStats(r),
        name: shell.rosterName.get(r.roster_id),
        avatar: shell.rosterAvatar.get(r.roster_id),
    }));
    const byRid = new Map(teams.map((t) => [t.rid, t]));
    const seeded = seedTeams(teams);
    const playoffTeams = seeded.slice(0, 6);
    const lotteryTeams = seeded.slice(6);

    // Picks 1-4: non-playoff teams by Max PF, lowest first (ties: worse record first).
    const lotteryOrder = [...lotteryTeams].sort((a, b) => {
        const d = (a.maxPF ?? 0) - (b.maxPF ?? 0);
        if (d !== 0) return d;
        return (a.wins + a.ties / 2) - (b.wins + b.ties / 2);
    });

    // Picks 5-10 by playoff finish: 5 = 5th place, 6 = 6th, 7 = 4th, 8 = 3rd, 9 = 2nd, 10 = champion.
    const place = playoffPlacements(bracket);
    const final = [5, 6, 4, 3, 2, 1].every((p) => place.has(p));
    let playoffOrder;
    if (final) {
        playoffOrder = [5, 6, 4, 3, 2, 1].map((p) => byRid.get(place.get(p)));
    } else {
        // Not decided yet: project from current seeds (seed 6 -> pick 5 ... seed 1 -> pick 10)
        playoffOrder = [...playoffTeams].reverse();
    }

    const order = [...lotteryOrder, ...playoffOrder];
    const nextSeason = String(Number(league.season) + 1);

    const owner = new Map(); // `${round}:${originalRid}` -> current owner rid
    for (const tp of tradedPicks || []) {
        if (String(tp.season) === nextSeason) owner.set(`${tp.round}:${tp.roster_id}`, tp.owner_id);
    }

    const seedOf = new Map(seeded.map((t, i) => [t.rid, i + 1]));
    const rounds = [];
    const draftRounds = league.settings && league.settings.draft_rounds ? league.settings.draft_rounds : 4;
    for (let round = 1; round <= draftRounds; round++) {
        const picks = order.map((team, idx) => {
            const ownerRid = owner.get(`${round}:${team.rid}`) ?? team.rid;
            const ownerTeam = byRid.get(ownerRid);
            return {
                label: `${round}.${String(idx + 1).padStart(2, '0')}`,
                round,
                season: nextSeason,
                originalRid: team.rid,
                originalName: team.name,
                ownerRid,
                ownerName: ownerTeam ? ownerTeam.name : `Team ${ownerRid}`,
                ownerAvatar: ownerTeam ? ownerTeam.avatar : null,
                traded: ownerRid !== team.rid,
                basis: idx < 4
                    ? `Max PF ${team.maxPF != null ? team.maxPF.toFixed(2) : '—'}`
                    : final ? `${['5th', '6th', '4th', '3rd', '2nd', 'Champion'][idx - 4]} place` : `Seed ${seedOf.get(team.rid)}`,
                acquisition: null,
            };
        });
        if (round === 2) {
            // 2023 amendment: consolation bracket winner gets pick 2.11
            const rid = consolationWinnerRosterId;
            const t = rid != null ? byRid.get(Number(rid)) : null;
            picks.push({
                label: '2.11', round, season: nextSeason, bonus: true,
                originalRid: t ? t.rid : null, originalName: t ? t.name : null,
                ownerRid: t ? t.rid : null, ownerName: t ? t.name : 'Consolation champ',
                ownerAvatar: t ? t.avatar : null, traded: false,
                basis: t ? 'Consolation winner' : 'TBD — consolation bracket',
            });
        }
        rounds.push({ round, picks });
    }

    const regLen = regularSeasonLength(league);
    return {
        season: nextSeason,
        currentSeason: league.season,
        status: league.status,
        final,
        week: league.settings && league.settings.leg,
        regLen,
        rounds,
        standings: seeded.map((t, i) => ({ ...t, seed: i + 1 })),
    };
}

/* ---------- "How was this pick acquired?" (full-history lookup) ---------- */

let tradeIndexPromise = null;
async function buildPickTradeIndex() {
    const [chain, players] = await Promise.all([collectSeasonChain(), getPlayers()]);
    const seasonToLeagueId = new Map(chain.map((l) => [String(l.season), l.league_id]));
    const index = [];
    await mapLimit(chain, 2, async (league) => {
        let shell;
        try { shell = await getSeasonShell(league); } catch (e) { return; }
        const txs = await getSeasonTransactions(league);
        for (const tx of txs) {
            if (tx.type !== 'trade' || !tx.draft_picks || !tx.draft_picks.length) continue;
            index.push({
                ts: tx.status_updated || tx.created || 0,
                draftPicks: tx.draft_picks,
                teams: await describeTrade(tx, shell, players, seasonToLeagueId),
            });
        }
    });
    return index;
}

// Sleeper's traded_picks only reports the final owner, so if a pick moved more
// than once this returns the most recent trade that routed it to its owner.
export async function findPickAcquisition(pick) {
    if (pick.ownerRid === pick.originalRid) return { type: 'original' };
    if (!tradeIndexPromise) {
        tradeIndexPromise = buildPickTradeIndex();
        tradeIndexPromise.catch(() => { tradeIndexPromise = null; });
    }
    let index;
    try {
        index = await tradeIndexPromise;
    } catch (err) {
        console.error('Pick history lookup failed', err);
        return { type: 'error' };
    }
    let match = null;
    for (const entry of index) {
        const hit = entry.draftPicks.some((p) =>
            String(p.season) === String(pick.season) && p.round === pick.round &&
            p.roster_id === pick.originalRid && p.owner_id === pick.ownerRid);
        if (hit && (!match || entry.ts > match.ts)) match = entry;
    }
    if (!match) return { type: 'unknown' };
    return { type: 'trade', ts: match.ts, teams: match.teams };
}

/* ======================================================================
   PAST ROOKIE DRAFTS
   ====================================================================== */

// Seasons that have a completed rookie draft on Sleeper, newest first.
// (The 2021 startup draft is 33 rounds, so pickRookieDraft skips it.)
export async function listPastRookieDrafts() {
    const chain = await collectSeasonChain();
    const out = [];
    await mapLimit(chain, 3, async (league) => {
        try {
            const drafts = await cachedJSON(`${API}/league/${league.league_id}/drafts`);
            const rookie = pickRookieDraft(drafts);
            if (rookie && rookie.status === 'complete') out.push({ season: String(league.season), league, draftId: rookie.draft_id });
        } catch (e) { /* skip season */ }
    });
    return out.sort((a, b) => Number(b.season) - Number(a.season));
}

// One past rookie draft as a board: who picked, who they took, and whose
// pick it originally was (a pick's draft_slot never changes when it's traded).
export async function buildPastDraftBoard(entry) {
    const [shell, players, draft, picks] = await Promise.all([
        getSeasonShell(entry.league),
        getPlayers(),
        cachedJSON(`${API}/draft/${entry.draftId}`),
        cachedJSON(`${API}/draft/${entry.draftId}/picks`),
    ]);
    const slotToRoster = draft.slot_to_roster_id || {};
    const teams = (draft.settings && draft.settings.teams) || Object.keys(slotToRoster).length || 10;

    const rounds = new Map();
    for (const p of [...(picks || [])].sort((a, b) => a.pick_no - b.pick_no)) {
        const slot = p.draft_slot || ((p.pick_no - 1) % teams) + 1;
        const originalRid = Number(slotToRoster[slot] ?? p.roster_id);
        const ownerRid = Number(p.roster_id);
        const meta = p.metadata || {};
        const player = players[p.player_id];
        const name = player ? [player.fn, player.ln].filter(Boolean).join(' ')
            : [meta.first_name, meta.last_name].filter(Boolean).join(' ') || '—';
        const pos = (player && player.pos) || meta.position || '';
        const nflTeam = meta.team || (player && player.t) || '';
        if (!rounds.has(p.round)) rounds.set(p.round, []);
        rounds.get(p.round).push({
            label: `${p.round}.${String(((p.pick_no - 1) % teams) + 1).padStart(2, '0')}`,
            round: p.round,
            season: entry.season,
            past: true,
            playerName: name,
            pos,
            nflTeam,
            originalRid,
            originalName: shell.rosterName.get(originalRid) || `Team ${originalRid}`,
            ownerRid,
            ownerName: shell.rosterName.get(ownerRid) || `Team ${ownerRid}`,
            ownerAvatar: shell.rosterAvatar.get(ownerRid) || null,
            traded: ownerRid !== originalRid,
            acquisition: null,
        });
    }
    return {
        season: entry.season,
        rounds: [...rounds.entries()].sort((a, b) => a[0] - b[0]).map(([round, picks]) => ({ round, picks })),
    };
}
