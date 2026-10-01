<script>
    import { onMount } from 'svelte';
    import { buildOnThisDay } from './history';
    import TradeTeams from './TradeTeams.svelte';
    import Loading from './Loading.svelte';

    let day = new Date();
    let data = null;
    let error = null;
    let loading = false;
    let req = 0;

    const load = async () => {
        const my = ++req;
        loading = true;
        error = null;
        try {
            const result = await buildOnThisDay(day);
            if (my === req) data = result;
        } catch (e) {
            console.error(e);
            if (my === req) error = e;
        } finally {
            if (my === req) loading = false;
        }
    };

    onMount(load);

    const isToday = (d) => {
        const t = new Date();
        return d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    };
    const shift = (n) => {
        const d = new Date(day);
        d.setDate(d.getDate() + n);
        day = d;
        load();
    };
    const resetToday = () => { day = new Date(); load(); };

    const yearsAgo = (season, ts) => {
        const y = new Date().getFullYear() - new Date(ts).getFullYear();
        return y <= 0 ? 'This year' : y === 1 ? '1 year ago' : `${y} years ago`;
    };
    const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
</script>

<div class="sf-page">
    <header class="sf-hero">
        <span class="material-icons" aria-hidden="true">event</span>
        <div>
            <div class="sf-eyebrow">On This Day</div>
            <h1>{day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} in Sunday Funday History</h1>
            <p>Every trade, plus every startup and rookie draft, that happened on this date in any past season.</p>
        </div>
    </header>

    <div class="stepper">
        <button class="sf-btn" on:click={() => shift(-1)} aria-label="Previous day">◀ Prev day</button>
        <button class="sf-btn" on:click={resetToday} disabled={isToday(day)}>Today</button>
        <button class="sf-btn" on:click={() => shift(1)} aria-label="Next day">Next day ▶</button>
    </div>

    {#if error}
        <div class="sf-card sf-empty">Couldn't load league history from Sleeper right now. Try refreshing in a minute.</div>
    {:else if !data || (loading && !data)}
        <Loading message="Checking every season for what happened on this day…" />
    {:else}
        <div class:dim={loading}>
            {#if !data.trades.length && !data.drafts.length}
                <div class="sf-card sf-empty">
                    Nothing on record happened on {data.dateLabel} in {data.seasons.length} seasons of league history. Try another day.
                </div>
            {:else}
                {#each data.trades as t}
                    <article class="sf-card event">
                        <div class="event-head">
                            <span class="sf-pill sf-pill-leather">🔁 Trade</span>
                            <span class="year">{new Date(t.ts).getFullYear()}</span>
                            <span class="ago">{yearsAgo(t.season, t.ts)} · {fmtDate(t.ts)}</span>
                        </div>
                        <TradeTeams teams={t.teams} />
                    </article>
                {/each}
                {#each data.drafts as d}
                    <article class="sf-card event">
                        <div class="event-head">
                            <span class="sf-pill sf-pill-gold">📋 {d.kind}</span>
                            <span class="year">{d.season}</span>
                            <span class="ago">{yearsAgo(d.season, d.ts)} · started {fmtDate(d.ts)}{d.rounds ? ` · ${d.rounds} rounds` : ''}</span>
                        </div>
                        <details open={d.picks.length <= 40}>
                            <summary>{d.picks.length} picks</summary>
                            <div class="sf-table-wrap">
                                <table class="sf-table">
                                    <thead><tr><th>Pick</th><th>Team</th><th>Player</th></tr></thead>
                                    <tbody>
                                        {#each d.picks as p}
                                            <tr><td class="num pickcol">{p.label}</td><td>{p.team}</td><td>{p.player}</td></tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    </article>
                {/each}
            {/if}
        </div>
    {/if}
</div>

<style>
    .stepper { display: flex; gap: 0.5em; flex-wrap: wrap; margin: -0.6em 0 1.4em; }
    .event { padding: 1.1em 1.2em; margin-bottom: 1em; }
    .event-head { display: flex; align-items: baseline; gap: 0.6em; flex-wrap: wrap; margin-bottom: 0.8em; }
    .year { font-weight: 800; font-size: 1.25em; color: var(--sfAccentText); }
    .ago { color: var(--sfMuted); font-size: 0.85em; }
    summary { cursor: pointer; font-weight: 600; margin-bottom: 0.6em; color: var(--sfMuted); }
    .pickcol { text-align: left; font-weight: 700; color: var(--sfAccentText); width: 4em; }
    .dim { opacity: 0.5; transition: opacity 0.2s; }
</style>
