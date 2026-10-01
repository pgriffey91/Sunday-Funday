// Builds static/players.json — the player database + weekly projections the
// site needs (names, positions, NFL teams, injury status, projected points).
//
// The original League Page computed this on a server (/api/fetch_players_info).
// GitHub Pages has no server, so instead the deploy workflow runs this script
// right before every build (on each push, and on a daily schedule) and ships
// the result as a plain static file. Sleeper asks that /players/nfl be pulled
// no more than once a day, which this respects.
//
// Usage: node scripts/build-players.mjs   (Node 18+)
import { writeFileSync, readFileSync } from 'node:fs';

const leagueID = readFileSync(new URL('../src/lib/utils/leagueInfo.js', import.meta.url), 'utf8')
    .match(/export const leagueID\s*=\s*["'](\d+)["']/)[1];

const getJSON = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return res.json();
};

const round = (n) => Math.round(n * 100) / 100;

const main = async () => {
    const [nflState, leagueData, playoffs] = await Promise.all([
        getJSON('https://api.sleeper.app/v1/state/nfl'),
        getJSON(`https://api.sleeper.app/v1/league/${leagueID}`),
        getJSON(`https://api.sleeper.app/v1/league/${leagueID}/winners_bracket`).catch(() => []),
    ]);

    const year = nflState.league_season;
    const regularSeasonLength = leagueData.settings.playoff_week_start - 1;
    const playoffLength = (Array.isArray(playoffs) && playoffs.length) ? playoffs[playoffs.length - 1].r : 3;
    const fullSeasonLength = regularSeasonLength + playoffLength;

    const positions = ['DB', 'DEF', 'DL', 'FLEX', 'IDP_FLEX', 'K', 'LB', 'QB', 'RB', 'REC_FLEX', 'SUPER_FLEX', 'TE', 'WR', 'WRRB_FLEX']
        .map((p) => `position[]=${p}`).join('&');

    const playerData = await getJSON('https://api.sleeper.app/v1/players/nfl');
    const weeklyData = [];
    for (let week = 1; week <= fullSeasonLength + 3; week++) {
        weeklyData.push(
            await getJSON(`https://api.sleeper.app/projections/nfl/${year}/${week}?season_type=regular&${positions}&order_by=ppr`).catch(() => [])
        );
    }

    const scoring = leagueData.scoring_settings;
    const players = {};
    for (const id in playerData) {
        const p = playerData[id];
        const player = { fn: p.first_name, ln: p.last_name, pos: p.position };
        if (p.team) {
            player.t = p.team;
            player.wi = {};
        }
        if (p.team && p.injury_status) player.is = p.injury_status;
        players[id] = player;
    }
    weeklyData.forEach((week, i) => {
        for (const proj of week || []) {
            const player = players[proj.player_id];
            if (!player || !player.wi) continue;
            let score = 0;
            for (const stat in proj.stats || {}) score += proj.stats[stat] * (scoring[stat] || 0);
            player.wi[i + 1] = { p: round(score), o: proj.opponent };
        }
    });
    players['OAK'] = players['LV'];

    writeFileSync(new URL('../static/players.json', import.meta.url), JSON.stringify(players));
    console.log(`Wrote static/players.json (${Object.keys(players).length} players, ${year} season, ${weeklyData.length} weeks of projections)`);
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
