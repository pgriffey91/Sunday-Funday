<script>
    import { onMount } from 'svelte';
    import { buildDraftBoard, findPickAcquisition, listPastRookieDrafts, buildPastDraftBoard } from './history';
    import Drawer from './Drawer.svelte';
    import TradeTeams from './TradeTeams.svelte';
    import Loading from './Loading.svelte';

    let board = null;
    let error = null;
    let selected = null;
    let acq = null;
    let acqLoading = false;
    let token = 0;

    // Past rookie drafts (picked from the year buttons under the live board)
    let pastDrafts = [];
    let pastSeason = null;
    let pastBoard = null;
    let pastLoading = false;
    let pastError = false;
    const pastCache = new Map();
    let pastReq = 0;

    const showPast = async (entry) => {
        pastSeason = entry.season;
        pastError = false;
        if (pastCache.has(entry.season)) { pastBoard = pastCache.get(entry.season); return; }
        const my = ++pastReq;
        pastLoading = true;
        try {
            const b = await buildPastDraftBoard(entry);
            pastCache.set(entry.season, b);
            if (my === pastReq) pastBoard = b;
        } catch (e) {
            console.error(e);
            if (my === pastReq) pastError = true;
        } finally {
            if (my === pastReq) pastLoading = false;
        }
    };

    onMount(async () => {
        listPastRookieDrafts()
            .then((list) => { pastDrafts = list; if (list.length) showPast(list[0]); })
            .catch((e) => console.error(e));
        try {
            board = await buildDraftBoard();
        } catch (e) {
            console.error(e);
            error = e;
        }
    });

    const openPick = async (pick) => {
        selected = pick;
        const my = ++token;
        if (pick.bonus) { acq = { type: 'bonus' }; return; }
        if (pick.acquisition) { acq = pick.acquisition; return; }
        acq = null;
        acqLoading = true;
        const result = await findPickAcquisition(pick);
        pick.acquisition = result;
        if (my === token) { acq = result; acqLoading = false; }
    };

    const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const record = (t) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

    // Where each team's 1st-round pick currently lands
    $: pickByRid = board ? new Map(board.rounds[0].picks.map((p) => [p.originalRid, p.label])) : new Map();

    const rookieRules = [
        'Four rounds, held on Sleeper about two weeks after the NFL Draft (exact date set with the league).',
        'Linear, not snake — whoever holds 1.01 also picks first in rounds 2, 3, and 4 (unless those picks were traded).',
        'Slow draft: 8-hour clock per pick, paused from 9 PM to 8 AM. Miss your window and you get leap-frogged until you pick.',
        'Picks can be traded while the draft is live.',
        'Picks 1–4 go to the four non-playoff teams, ordered by potential points (Max PF), lowest first. Ties go to overall record.',
        'Picks 5–10 go to the playoff teams by finish: 1.05 winner of the 5th-place game · 1.06 loser of the 5th-place game · 1.07 4th place · 1.08 3rd place · 1.09 runner-up · 1.10 champion.',
        'Since 2023, the consolation-bracket winner is also awarded pick 2.11. The Toilet Bowl never affects draft order.',
    ];
    const faRules = [
        'Every dropped player goes to waivers — blind FAAB bidding, highest bid wins.',
        'In-season: $100 FAAB, starting Week 1. Off-season: a separate $100 budget one month after the Super Bowl, reset after the preseason.',
        'Minimum bid $0, $1 increments. Tied bids go to the team with the higher waiver priority.',
        'In-season waivers process daily, Wednesday through kickoff. Off-season waivers process daily.',
        'All transactions lock after Week 16 games until the off-season.',
        'Dues not paid one month after the Super Bowl cost a $25 FAAB fine.',
    ];
    const taxiRules = [
        'Five taxi spots, for players in their first or second NFL season.',
        'After a player\'s second season he has to move to the active roster or be released.',
        'Taxi squads lock when the regular season starts — no adding to taxi in-season.',
        'Off-season moves on and off taxi are unlimited until the preseason ends; after that, a player pulled off taxi can\'t go back until next off-season.',
    ];
    const tradeRules = [
        'Trade deadline: Week 13. Trades process immediately.',
        'Players, startup picks, and rookie picks are all tradable.',
        'Trading a pick in a season you haven\'t paid for yet? Pay that season within 24 hours or the trade is reversed.',
    ];
</script>

<div class="sf-page">
    <header class="sf-hero">
        <span class="material-icons" aria-hidden="true">format_list_numbered</span>
        <div>
            <div class="sf-eyebrow">Draft &amp; Free Agency</div>
            <h1>{board ? `${board.season} Rookie Draft Board` : 'Rookie Draft Board'}</h1>
            <p>Live draft order for next year's rookie draft, with every traded pick resolved. Tap any pick to see how its owner got it.</p>
        </div>
    </header>

    {#if error}
        <div class="sf-card sf-empty">Couldn't load the draft board from Sleeper right now. Try refreshing in a minute.</div>
    {:else if !board}
        <Loading message="Building the draft board from Sleeper…" />
    {:else}
        <p class="sf-sub">
            {#if board.final}
                Final order — the {board.currentSeason} playoffs are complete.
            {:else}
                <span class="sf-pill sf-pill-slate">Projected</span>
                Picks 1–4 use each non-playoff team's Max PF so far; picks 5–10 use current playoff seeds (seed 6 → 1.05 … seed 1 → 1.10) until the {board.currentSeason} playoffs finish and the real placements take over.
            {/if}
        </p>

        <div class="board">
            {#each board.rounds as r}
                <div class="round">
                    <div class="round-label">Round {r.round}</div>
                    <div class="round-picks" style="--cols: {r.picks.length}">
                        {#each r.picks as pick}
                            <button
                                class="pick"
                                class:traded={pick.traded}
                                class:bonus={pick.bonus}
                                on:click={() => openPick(pick)}
                                aria-label="Pick {pick.label}, owned by {pick.ownerName}"
                            >
                                <span class="pick-num">{pick.label}</span>
                                {#if pick.ownerAvatar}
                                    <img class="sf-avatar" src={pick.ownerAvatar} alt="" />
                                {:else}
                                    <span class="sf-avatar placeholder material-icons">{pick.bonus ? 'emoji_events' : 'person'}</span>
                                {/if}
                                <span class="pick-team">{pick.ownerName}</span>
                                {#if pick.traded}
                                    <span class="pick-via">via {pick.originalName}</span>
                                {:else if r.round === 1 || pick.bonus}
                                    <span class="pick-basis">{pick.basis}</span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>


        <h2 class="sf-section-title">Past Rookie Drafts</h2>
        {#if pastDrafts.length}
            <div class="years" role="tablist" aria-label="Draft year">
                {#each pastDrafts as d}
                    <button
                        class="sf-btn year"
                        class:active={pastSeason === d.season}
                        role="tab"
                        aria-selected={pastSeason === d.season}
                        on:click={() => showPast(d)}
                    >{d.season}</button>
                {/each}
            </div>
            <p class="sf-sub">Every pick from the {pastSeason} rookie draft. Tap a pick to see the trades behind it.</p>
            {#if pastError}
                <div class="sf-card sf-empty">Couldn't load the {pastSeason} draft from Sleeper. Try again in a minute.</div>
            {:else if pastLoading && !pastBoard}
                <Loading message="Loading the {pastSeason} rookie draft…" />
            {:else if pastBoard}
                <div class="board" class:dim={pastLoading}>
                    {#each pastBoard.rounds as r}
                        <div class="round">
                            <div class="round-label">Round {r.round}</div>
                            <div class="round-picks" style="--cols: {r.picks.length}">
                                {#each r.picks as pick}
                                    <button
                                        class="pick past"
                                        class:traded={pick.traded}
                                        on:click={() => openPick(pick)}
                                        aria-label="Pick {pick.label}: {pick.playerName}, drafted by {pick.ownerName}"
                                    >
                                        <span class="pick-num">{pick.label}</span>
                                        <span class="pick-player">{pick.playerName}</span>
                                        {#if pick.pos}<span class="pos pos-{pick.pos}">{pick.pos}{pick.nflTeam ? ` · ${pick.nflTeam}` : ''}</span>{/if}
                                        <span class="pick-team small-team">
                                            {#if pick.ownerAvatar}<img class="sf-avatar tiny" src={pick.ownerAvatar} alt="" />{/if}
                                            {pick.ownerName}
                                        </span>
                                        {#if pick.traded}<span class="pick-via">via {pick.originalName}</span>{/if}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else}
            <div class="sf-card sf-empty">No completed rookie drafts found yet.</div>
        {/if}

        <h2 class="sf-section-title">How the order is set</h2>
        <p class="sf-sub">During the season, the board above is a projection: the four teams outside the playoff picture draft 1.01–1.04 by Max PF, and the six playoff teams fill 1.05–1.10 by current seed. Once the playoffs are over, the final order is:</p>
        <ol class="sf-sub order-list">
            <li><strong>1.01–1.04:</strong> non-playoff teams by Max PF (potential points), lowest first</li>
            <li><strong>1.05:</strong> winner of the 5th-place game</li>
            <li><strong>1.06:</strong> loser of the 5th-place game</li>
            <li><strong>1.07:</strong> 4th place</li>
            <li><strong>1.08:</strong> 3rd place</li>
            <li><strong>1.09:</strong> runner-up</li>
            <li><strong>1.10:</strong> champion</li>
        </ol>
        <div class="sf-table-wrap">
            <table class="sf-table">
                <thead>
                    <tr>
                        <th>Seed</th>
                        <th>Team</th>
                        <th class="num">Record</th>
                        <th class="num">Points For</th>
                        <th class="num">Max PF</th>
                        <th class="num">1st-Rd Pick</th>
                    </tr>
                </thead>
                <tbody>
                    {#each board.standings as t}
                        <tr class:cutline={t.seed === 6}>
                            <td>
                                <span class="sf-pill {t.seed <= 4 ? 'sf-pill-gold' : t.seed <= 6 ? 'sf-pill-slate' : ''}">{t.seed}</span>
                            </td>
                            <td><div class="team-cell">{#if t.avatar}<img class="sf-avatar" src={t.avatar} alt="" />{/if}{t.name}</div></td>
                            <td class="num">{record(t)}</td>
                            <td class="num">{t.pointsFor.toFixed(2)}</td>
                            <td class="num">{t.maxPF != null ? t.maxPF.toFixed(2) : '—'}</td>
                            <td class="num"><strong>{pickByRid.get(t.rid) || '—'}</strong></td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <p class="sf-sub small">Max PF is Sleeper's "potential points" — the score of each team's best possible lineup every week.</p>
    {/if}

    <h2 class="sf-section-title">League rules</h2>
    <div class="sf-rules">
        <div class="sf-card">
            <h3><span class="material-icons">school</span>Rookie Draft</h3>
            <ul>{#each rookieRules as r}<li>{r}</li>{/each}</ul>
        </div>
        <div class="sf-card">
            <h3><span class="material-icons">gavel</span>Free Agency &amp; FAAB</h3>
            <ul>{#each faRules as r}<li>{r}</li>{/each}</ul>
        </div>
        <div class="sf-card">
            <h3><span class="material-icons">airport_shuttle</span>Taxi Squad</h3>
            <ul>{#each taxiRules as r}<li>{r}</li>{/each}</ul>
        </div>
        <div class="sf-card">
            <h3><span class="material-icons">swap_horiz</span>Trades</h3>
            <ul>{#each tradeRules as r}<li>{r}</li>{/each}</ul>
        </div>
    </div>
</div>

<Drawer open={!!selected} label="Pick details" on:close={() => { selected = null; token++; }}>
    {#if selected}
        <div class="sf-eyebrow">{selected.season} Rookie Draft</div>
        <h2>Pick {selected.label}</h2>
        {#if selected.past}
            <p class="sf-sub">
                <strong>{selected.ownerName}</strong> selected <strong>{selected.playerName}</strong>{selected.pos ? ` (${selected.pos}${selected.nflTeam ? `, ${selected.nflTeam}` : ''})` : ''}.
            </p>
        {:else}
            <p class="sf-sub">Currently owned by <strong>{selected.ownerName}</strong></p>
        {/if}

        {#if acq && acq.type === 'bonus'}
            <p class="sf-sub">Pick 2.11 goes to the consolation-bracket winner (2023 amendment). Sleeper can't hold an 11th pick, so the commissioner sets the winner in <code>leagueInfo.js</code> once the bracket is decided.</p>
        {:else if acqLoading && !acq}
            <Loading message="Searching every season's trades…" />
        {:else if acq && acq.type === 'original'}
            <p class="sf-sub">{selected.originalName}'s original pick — never traded.</p>
        {:else if acq && acq.type === 'trade'}
            <p class="sf-sub">{selected.past ? 'Pick acquired' : 'Acquired'} in a trade on {fmtDate(acq.ts)} (originally {selected.originalName}'s):</p>
            <TradeTeams teams={acq.teams} />
        {:else if acq && acq.type === 'error'}
            <p class="sf-sub">Couldn't look up this pick's history right now — try again in a moment.</p>
        {:else if acq}
            <p class="sf-sub">This pick changed hands, but a matching trade couldn't be found in the league's transaction history.</p>
        {/if}
    {/if}
</Drawer>

<style>
    .board { display: flex; flex-direction: column; gap: 0.9em; }
    .round-label {
        font-weight: 700;
        font-size: 0.8em;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--sfMuted);
        margin-bottom: 0.4em;
    }
    .round-picks {
        display: grid;
        grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
        gap: 0.5em;
    }
    .pick {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3em;
        padding: 0.7em 0.4em 0.75em;
        border-radius: 10px;
        border: 1px solid var(--sfBorder);
        background: var(--sfCard);
        color: var(--sfText);
        font: inherit;
        cursor: pointer;
        text-align: center;
        min-height: 44px;
        transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
    }
    .pick:hover, .pick:focus-visible {
        transform: translateY(-2px);
        border-color: var(--sfGold);
        box-shadow: 0 6px 16px -10px rgba(0, 0, 0, 0.5);
        outline: none;
    }
    .pick.traded { background: var(--sfCardAlt); border-color: rgba(168, 85, 44, 0.45); }
    .pick.bonus { border-style: dashed; border-color: var(--sfGold); }
    .pick-num {
        font-weight: 800;
        font-size: 0.95em;
        color: var(--sfAccentText);
        font-variant-numeric: tabular-nums;
    }
    .pick-team {
        font-size: 0.8em;
        font-weight: 600;
        line-height: 1.2;
        overflow-wrap: anywhere;
    }
    .pick-via, .pick-basis {
        font-size: 0.68em;
        color: var(--sfMuted);
        line-height: 1.2;
    }
    .pick-via { color: var(--sfLeather); font-weight: 600; }
    .placeholder {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: var(--sfMuted);
    }
    .cutline td { border-bottom: 2px dashed var(--sfGold) !important; }
    .small { font-size: 0.82em; margin-top: 0.6em; }
    .years { display: flex; flex-wrap: wrap; gap: 0.45em; margin: 0.2em 0 0.9em; }
    .year.active { background: var(--sfNavy); color: var(--sfCream); border-color: var(--sfGold); }
    .dim { opacity: 0.5; transition: opacity 0.2s; }
    .pick.past { gap: 0.25em; }
    .pick-player { font-size: 0.82em; font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
    .pos { font-size: 0.66em; font-weight: 700; padding: 0.05em 0.45em; border-radius: 4px; background: var(--sfCardAlt); color: var(--sfMuted); }
    .pos-QB { background: var(--QB); color: #fff; }
    .pos-RB { background: var(--RB); color: #fff; }
    .pos-WR { background: var(--WR); color: #fff; }
    .pos-TE { background: var(--TE); color: #fff; }
    .small-team { display: inline-flex; align-items: center; gap: 0.3em; font-weight: 500; font-size: 0.7em; color: var(--sfMuted); }
    .tiny { width: 16px; height: 16px; }
    .order-list { padding-left: 1.4em; margin-top: -0.4em; }
    .order-list li { margin: 0.2em 0; }

    @media (max-width: 1100px) {
        .round-picks { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
    }
</style>
