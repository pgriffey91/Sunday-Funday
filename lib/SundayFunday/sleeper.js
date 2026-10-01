// Shared Sleeper-API plumbing for the Draft & FA, Record Book, and On This Day
// pages (ported from the Federation of Fantasy Footballers site).
//
// Everything here runs in the visitor's browser against Sleeper's public,
// read-only API. Responses are memoized for the life of the page session, so
// moving between Record Book, On This Day, and the Draft Board pick lookup
// only walks league history once.

import { leagueID } from '$lib/utils/leagueInfo';
import { loadPlayers } from '$lib/utils/helperFunctions/players';

export const API = 'https://api.sleeper.app/v1';

const responseCache = new Map(); // url -> Promise<json>

export async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return res.json();
}

// Retries a couple times with a short backoff. The history walks fan out to a
// few hundred calls, and one transient blip shouldn't silently drop a season.
export async function fetchJSONWithRetry(url, attempts = 3, delayMs = 500) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fetchJSON(url);
        } catch (err) {
            lastErr = err;
            if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        }
    }
    throw lastErr;
}

// Memoized fetch. A failed request is evicted so the next caller retries.
export function cachedJSON(url) {
    if (!responseCache.has(url)) {
        const p = fetchJSONWithRetry(url);
        responseCache.set(url, p);
        p.catch(() => responseCache.delete(url));
    }
    return responseCache.get(url);
}

// Runs `fn` over `items` with at most `limit` in flight (Sleeper is generous,
// but a polite cap keeps a history walk from firing 300 requests at once).
export async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const i = next++;
            out[i] = await fn(items[i], i);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return out;
}

/* ---------- Season chain ---------- */

let chainPromise = null;

// Every season of the league, newest first, by walking previous_league_id
// back to the founding season.
export function collectSeasonChain() {
    if (chainPromise) return chainPromise;
    chainPromise = (async () => {
        const chain = [];
        let id = leagueID;
        const seen = new Set();
        while (id && id !== '0' && !seen.has(id)) {
            seen.add(id);
            const league = await cachedJSON(`${API}/league/${id}`);
            chain.push(league);
            id = league.previous_league_id || null;
        }
        return chain;
    })();
    chainPromise.catch(() => { chainPromise = null; });
    return chainPromise;
}

// Users + rosters for one season, plus lookups keyed the way the history
// features need them. Team names are "as they were that season".
const seasonShellCache = new Map();
export function getSeasonShell(league) {
    const id = league.league_id;
    if (seasonShellCache.has(id)) return seasonShellCache.get(id);
    const p = (async () => {
        const [users, rosters] = await Promise.all([
            cachedJSON(`${API}/league/${id}/users`),
            cachedJSON(`${API}/league/${id}/rosters`),
        ]);
        const userMap = new Map((users || []).map((u) => [u.user_id, u]));
        const rosterToUser = new Map();
        const rosterName = new Map();
        const rosterAvatar = new Map();
        for (const r of rosters || []) {
            const u = userMap.get(r.owner_id) || {};
            if (r.owner_id) rosterToUser.set(r.roster_id, r.owner_id);
            rosterName.set(r.roster_id, (u.metadata && u.metadata.team_name) || u.display_name || `Team ${r.roster_id}`);
            rosterAvatar.set(r.roster_id, avatarURL(u));
        }
        return { league, users: users || [], rosters: rosters || [], userMap, rosterToUser, rosterName, rosterAvatar };
    })();
    seasonShellCache.set(id, p);
    p.catch(() => seasonShellCache.delete(id));
    return p;
}

export function avatarURL(user) {
    if (!user) return null;
    if (user.metadata && user.metadata.avatar) return user.metadata.avatar; // custom team avatar
    return user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null;
}

// Every week that can hold transactions for a season. Sleeper files offseason
// moves (trades of future picks, offseason FAAB adds) under week 0/1 and
// in-season moves under their week, so 0-18 covers a whole league year.
export function seasonWeeks() {
    return Array.from({ length: 19 }, (_, i) => i);
}

export function regularSeasonLength(league) {
    return ((league.settings && league.settings.playoff_week_start) || 15) - 1;
}

// All complete transactions for a season, de-duplicated (Sleeper repeats a
// transaction in more than one week's list on occasion).
const seasonTxCache = new Map();
export function getSeasonTransactions(league) {
    const id = league.league_id;
    if (seasonTxCache.has(id)) return seasonTxCache.get(id);
    const p = (async () => {
        const weeks = seasonWeeks(league);
        const lists = await mapLimit(weeks, 6, (w) => cachedJSON(`${API}/league/${id}/transactions/${w}`).catch(() => []));
        const seen = new Set();
        const out = [];
        for (const tx of lists.flat()) {
            if (!tx || tx.status !== 'complete' || seen.has(tx.transaction_id)) continue;
            seen.add(tx.transaction_id);
            out.push(tx);
        }
        return out;
    })();
    seasonTxCache.set(id, p);
    p.catch(() => seasonTxCache.delete(id));
    return p;
}

// Picks the rookie draft out of a season's drafts. Sleeper's draft.type is the
// FORMAT (snake / linear / auction), so the startup draft (33 rounds) is told
// apart from a rookie draft (4 rounds) by its length.
export function pickRookieDraft(drafts) {
    const candidates = (drafts || []).filter((d) => d.type !== 'auction' && ((d.settings && d.settings.rounds) || 99) <= 6);
    if (!candidates.length) return null;
    return candidates.reduce((best, d) =>
        ((d.settings && d.settings.rounds) || 99) < ((best.settings && best.settings.rounds) || 99) ? d : best, candidates[0]);
}

export function isStartupDraft(draft) {
    return ((draft.settings && draft.settings.rounds) || 0) > 6;
}

/* ---------- Players ---------- */

let playersPromise = null;
export function getPlayers() {
    if (!playersPromise) {
        playersPromise = loadPlayers(null).then((r) => r.players || {}).catch(() => ({}));
    }
    return playersPromise;
}

export function playerLabel(players, id) {
    const p = players && players[id];
    if (!p) return `Player #${id}`;
    const name = [p.fn, p.ln].filter(Boolean).join(' ') || `Player #${id}`;
    return p.pos ? `${name} (${p.pos})` : name;
}

export const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const roundLabel = (round) => `${ordinal(round)}-round`;

/* ---------- Standings helpers ---------- */

export function rosterStats(r) {
    const s = r.settings || {};
    return {
        rid: r.roster_id,
        wins: s.wins || 0,
        losses: s.losses || 0,
        ties: s.ties || 0,
        pointsFor: (s.fpts || 0) + (s.fpts_decimal || 0) / 100,
        pointsAgainst: (s.fpts_against || 0) + (s.fpts_against_decimal || 0) / 100,
        maxPF: s.ppts != null ? (s.ppts || 0) + (s.ppts_decimal || 0) / 100 : null,
    };
}

const byRecord = (a, b) => {
    const pa = a.wins + a.ties / 2;
    const pb = b.wins + b.ties / 2;
    if (pb !== pa) return pb - pa;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return b.pointsFor - a.pointsFor;
};

// Sunday Funday seeding (Constitution 2.3 + 2024 amendment):
//   Seeds 1-4: best overall record (ties broken by total points for).
//   Seeds 5-6: the two highest points-for among everyone else, then ordered
//              between themselves by record, then points.
//   Seeds 7-10: everyone else (the rookie-draft lottery teams), by record.
export function seedTeams(teams) {
    const sorted = [...teams].sort(byRecord);
    const top4 = sorted.slice(0, 4);
    const rest = sorted.slice(4);
    const wildcards = [...rest].sort((a, b) => b.pointsFor - a.pointsFor).slice(0, 2);
    const wcIds = new Set(wildcards.map((t) => t.rid));
    const out = [...rest].filter((t) => !wcIds.has(t.rid));
    return [...top4, ...wildcards.sort(byRecord), ...out];
}

/* ---------- Max PF fallback ---------- */

function eligiblePositionsForSlot(slot) {
    switch (slot) {
        case 'FLEX': return ['RB', 'WR', 'TE'];
        case 'SUPER_FLEX': return ['QB', 'RB', 'WR', 'TE'];
        case 'WRRB_FLEX': return ['WR', 'RB'];
        case 'REC_FLEX':
        case 'WRTE_FLEX': return ['WR', 'TE'];
        default: return [slot];
    }
}
const NON_STARTING = new Set(['BN', 'IR', 'TAXI']);

// Greedy best-lineup solver — only used when Sleeper doesn't report a team's
// potential points (ppts) for a season. Fills the most restrictive slots
// first, each with the highest scorer still available.
export function optimalLineupPoints(playerIds, playersPoints, rosterPositions, players) {
    const slots = (rosterPositions || []).filter((p) => !NON_STARTING.has(p))
        .map((slot, i) => ({ i, elig: eligiblePositionsForSlot(slot) }))
        .sort((a, b) => a.elig.length - b.elig.length || a.i - b.i);
    const available = new Set(playerIds || []);
    let total = 0;
    for (const { elig } of slots) {
        let best = null;
        let bestPts = -Infinity;
        for (const pid of available) {
            const pos = players && players[pid] ? players[pid].pos : null;
            if (!pos || !elig.includes(pos)) continue;
            const pts = playersPoints[pid] ?? 0;
            if (pts > bestPts) { bestPts = pts; best = pid; }
        }
        if (best != null) { available.delete(best); total += bestPts; }
    }
    return total;
}
