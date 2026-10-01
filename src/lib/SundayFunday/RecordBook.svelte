<script>
    import { onMount } from 'svelte';
    import { buildRecordBook } from './history';
    import Drawer from './Drawer.svelte';
    import Loading from './Loading.svelte';

    let data = null;
    let error = null;
    let selected = null;

    onMount(async () => {
        try {
            data = await buildRecordBook();
        } catch (e) {
            console.error(e);
            error = e;
        }
    });

    const pct = (n, d) => (d > 0 ? (n / d) * 100 : null);
    const rec = (w, l, t) => `${w}-${l}${t ? `-${t}` : ''}`;

    // Leaderboard columns (value() drives sorting)
    const columns = [
        { key: 'record', label: 'Record', value: (m) => {
            const g = m.c.wins + m.c.losses + m.c.ties;
            return g ? (m.c.wins + m.c.ties / 2) / g : 0;
        } },
        { key: 'titles', label: 'Titles', value: (m) => m.t.championships },
        { key: 'finals', label: 'Finals', value: (m) => m.t.championships + m.t.runnerups },
        { key: 'playoffs', label: 'Playoffs', value: (m) => m.t.playoffs },
        { key: 'seed1', label: '#1 Seeds', value: (m) => m.c.firstSeedSeasons },
        { key: 'top3', label: 'Top-3 PF', value: (m) => m.c.top3Seasons },
        { key: 'ppg', label: 'PF / Season', value: (m) => (m.c.completeSeasons ? m.c.completePF / m.c.completeSeasons : 0) },
        { key: 'eff', label: 'Lineup Eff.', value: (m) => pct(m.c.pointsFor, m.c.maxPF) ?? -1 },
        { key: 'trades', label: 'Trades', value: (m) => m.c.trades },
        { key: 'conv', label: 'Pick Conv.', value: (m) => (m.c.picksEligible ? m.c.picksConverted / m.c.picksEligible : -1) },
    ];
    let sortKey = 'titles';
    let sortDir = -1;
    const sortBy = (key) => {
        if (sortKey === key) sortDir = -sortDir;
        else { sortKey = key; sortDir = -1; }
    };
    const defaultOrder = (a, b) =>
        b.t.championships - a.t.championships ||
        b.t.runnerups - a.t.runnerups ||
        b.t.playoffs - a.t.playoffs ||
        b.c.wins - a.c.wins;

    $: rows = data ? [...data.managers].sort((a, b) => {
        const col = columns.find((c) => c.key === sortKey);
        const d = (col.value(b) - col.value(a)) * (sortDir < 0 ? 1 : -1);
        return d || defaultOrder(a, b);
    }) : [];

    $: cards = data ? [...data.managers].sort(defaultOrder) : [];

    $: h2hRows = (data && selected)
        ? data.managers
            .filter((m) => m.uid !== selected.uid)
            .map((opp) => ({
                opp,
                r: data.h2h.get(`${selected.uid}|${opp.uid}`) || { wins: 0, losses: 0, ties: 0, pWins: 0, pLosses: 0 },
            }))
            .sort((a, b) => (b.r.wins - b.r.losses) - (a.r.wins - a.r.losses) || a.opp.info.name.localeCompare(b.opp.info.name))
        : [];
</script>

<div class="sf-page">
    <header class="sf-hero">
        <span class="material-icons" aria-hidden="true">menu_book</span>
        <div>
            <div class="sf-eyebrow">Record Book &amp; Trophy Room</div>
            <h1>All-Time Sunday Funday</h1>
            <p>
                {#if data}
                    Every season from {data.seasons[0]} to {data.seasons[data.seasons.length - 1]}, by manager. Labeled by Sleeper username, since team names get rebranded but usernames stick.
                {:else}
                    Career records, trophies, and head-to-head history for every manager.
                {/if}
            </p>
        </div>
    </header>

    {#if error}
        <div class="sf-card sf-empty">Couldn't load league history from Sleeper right now. Try refreshing in a minute.</div>
    {:else if !data}
        <Loading message="Walking every season back to the league's founding…" />
    {:else}
        {#if data.champions.length}
            <h2 class="sf-section-title">Champions</h2>
            <div class="champs">
                {#each data.champions as ch}
                    <div class="champ sf-card">
                        <div class="champ-year">{ch.season}</div>
                        {#if ch.avatar}<img class="sf-avatar sf-avatar-lg" src={ch.avatar} alt="" />{/if}
                        <div class="champ-name">🏆 {ch.name}</div>
                    </div>
                {/each}
            </div>
        {/if}

        <h2 class="sf-section-title">Career Leaderboard</h2>
        <p class="sf-sub">Tap a column to sort. Record is regular season only.</p>
        <div class="sf-table-wrap">
            <table class="sf-table leaderboard">
                <thead>
                    <tr>
                        <th>Manager</th>
                        {#each columns as col}
                            <th class="num sortable" class:sorted={sortKey === col.key} on:click={() => sortBy(col.key)}>
                                {col.label}{sortKey === col.key ? (sortDir < 0 ? ' ▾' : ' ▴') : ''}
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each rows as m}
                        <tr on:click={() => (selected = m)} class="clickable">
                            <td><div class="team-cell">{#if m.info.avatar}<img class="sf-avatar" src={m.info.avatar} alt="" />{/if}<strong>{m.info.name}</strong></div></td>
                            <td class="num" data-label="Record">{rec(m.c.wins, m.c.losses, m.c.ties)}</td>
                            <td class="num" data-label="Titles">{m.t.championships}</td>
                            <td class="num" data-label="Finals">{m.t.championships + m.t.runnerups}</td>
                            <td class="num" data-label="Playoffs">{m.t.playoffs}</td>
                            <td class="num" data-label="#1 Seeds">{m.c.firstSeedSeasons}</td>
                            <td class="num" data-label="Top-3 PF">{m.c.top3Seasons}</td>
                            <td class="num" data-label="PF / Season">{m.c.completeSeasons ? (m.c.completePF / m.c.completeSeasons).toFixed(1) : '—'}</td>
                            <td class="num" data-label="Lineup Eff.">{pct(m.c.pointsFor, m.c.maxPF) != null ? pct(m.c.pointsFor, m.c.maxPF).toFixed(1) + '%' : '—'}</td>
                            <td class="num" data-label="Trades">{m.c.trades}</td>
                            <td class="num" data-label="Pick Conv.">{m.c.picksEligible ? `${Math.round((m.c.picksConverted / m.c.picksEligible) * 100)}% (${m.c.picksConverted}/${m.c.picksEligible})` : '—'}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <p class="sf-sub small">
            <strong>Top-3 PF</strong> — completed seasons finishing top 3 in points for. <strong>PF / Season</strong> — average points for across completed seasons.
            <strong>Lineup Eff.</strong> — career points for ÷ Max PF (Sleeper's potential points); higher means fewer points left on the bench.
            <strong>Pick Conv.</strong> — rookie picks the manager kept at least two seasons (or traded) instead of cutting, out of picks old enough to judge. The startup draft isn't counted.
        </p>

        <h2 class="sf-section-title">Trophy Room</h2>
        <p class="sf-sub">🏆 Championships · 🥈 Runner-up · 🥉 3rd place · ⛳ Playoff appearances — tap a manager for their all-time head-to-head.</p>
        <div class="cards">
            {#each cards as m}
                <button class="mcard sf-card" on:click={() => (selected = m)}>
                    {#if m.info.avatar}<img class="sf-avatar sf-avatar-lg" src={m.info.avatar} alt="" />{:else}<span class="sf-avatar sf-avatar-lg" />{/if}
                    <span class="mname">{m.info.name}</span>
                    <span class="mrec">{rec(m.c.wins, m.c.losses, m.c.ties)}</span>
                    <span class="badges">
                        {#if m.t.championships}<span class="sf-pill sf-pill-gold" title="Championships">🏆 {m.t.championships}</span>{/if}
                        {#if m.t.runnerups}<span class="sf-pill" title="Runner-up finishes">🥈 {m.t.runnerups}</span>{/if}
                        {#if m.t.thirds}<span class="sf-pill" title="3rd-place finishes">🥉 {m.t.thirds}</span>{/if}
                        <span class="sf-pill sf-pill-slate" title="Playoff appearances">⛳ {m.t.playoffs}</span>
                    </span>
                    <span class="hint">Head-to-head ▸</span>
                </button>
            {/each}
        </div>
    {/if}
</div>

<Drawer open={!!selected} label="Head-to-head" on:close={() => (selected = null)}>
    {#if selected}
        <div class="drawer-head">
            {#if selected.info.avatar}<img class="sf-avatar sf-avatar-lg" src={selected.info.avatar} alt="" />{/if}
            <div>
                <div class="sf-eyebrow">Head-to-head</div>
                <h2>{selected.info.name}</h2>
            </div>
        </div>
        <p class="sf-sub">
            {selected.t.championships} title{selected.t.championships === 1 ? '' : 's'}{selected.t.titleYears.length ? ` (${[...selected.t.titleYears].sort().join(', ')})` : ''} ·
            {selected.t.runnerups} runner-up · {selected.t.thirds} third ·
            {selected.t.playoffs} playoff trip{selected.t.playoffs === 1 ? '' : 's'}{selected.t.seasons.length ? ` (${[...selected.t.seasons].sort().join(', ')})` : ''}
        </p>
        {#if selected.c.bestSeason}
            <p class="sf-sub">Best scoring season: <strong>{selected.c.bestSeason.points.toFixed(2)}</strong> in {selected.c.bestSeason.season}.</p>
        {/if}
        <div class="sf-table-wrap">
            <table class="sf-table">
                <thead>
                    <tr><th>Opponent</th><th class="num">Regular Season</th><th class="num">Playoffs</th></tr>
                </thead>
                <tbody>
                    {#each h2hRows as row}
                        <tr>
                            <td><div class="team-cell">{#if row.opp.info.avatar}<img class="sf-avatar" src={row.opp.info.avatar} alt="" />{/if}{row.opp.info.name}</div></td>
                            <td class="num" class:winning={row.r.wins > row.r.losses} class:losing={row.r.wins < row.r.losses}>{rec(row.r.wins, row.r.losses, row.r.ties)}</td>
                            <td class="num">{row.r.pWins + row.r.pLosses ? `${row.r.pWins}-${row.r.pLosses}` : '—'}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</Drawer>

<style>
    .champs {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 0.75em;
    }
    .champ {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.45em;
        padding: 1em 0.75em;
        text-align: center;
        border-top: 3px solid var(--sfGold);
    }
    .champ-year { font-weight: 800; font-size: 1.3em; color: var(--sfAccentText); }
    .champ-name { font-weight: 600; font-size: 0.92em; }

    .leaderboard .clickable { cursor: pointer; }
    .small { font-size: 0.82em; margin-top: 0.7em; }

    .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 0.8em;
    }
    .mcard {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4em;
        padding: 1.1em 0.8em;
        font: inherit;
        color: var(--sfText);
        cursor: pointer;
        transition: transform 0.12s ease, border-color 0.12s ease;
    }
    .mcard:hover, .mcard:focus-visible { transform: translateY(-2px); border-color: var(--sfGold); outline: none; }
    .mname { font-weight: 700; }
    .mrec { font-size: 0.82em; color: var(--sfMuted); font-variant-numeric: tabular-nums; }
    .badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.3em; }
    .hint { font-size: 0.75em; color: var(--sfMuted); margin-top: 0.2em; }

    .drawer-head { display: flex; align-items: center; gap: 0.8em; margin-bottom: 0.4em; }
    .winning { color: #2f8f5b; font-weight: 700; }
    .losing { color: #c0492b; font-weight: 700; }

    /* Stack the wide leaderboard into cards on phones */
    @media (max-width: 760px) {
        .leaderboard thead { display: none; }
        .leaderboard, .leaderboard tbody, .leaderboard tr, .leaderboard td { display: block; width: 100%; box-sizing: border-box; }
        .leaderboard tr { border-bottom: 1px solid var(--sfBorder); padding: 0.4em 0; }
        .leaderboard td { border: none; padding: 0.25em 0.9em; }
        .leaderboard td.num { display: flex; justify-content: space-between; }
        .leaderboard td.num::before { content: attr(data-label); color: var(--sfMuted); font-size: 0.85em; }
    }
</style>
