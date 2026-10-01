<script>
    import { dues } from '$lib/utils/helper';

    // Sunday Funday Dynasty Rulebook. Edit this list when the rules change.
    // Nested arrays render as sub-points under the line above them.
    const sections = [
        { id: 'summary', title: 'League Summary', items: [
            '10 teams, a 14-week regular season, and 3 weeks of playoffs.',
            '27 roster spots, plus 5 taxi spots and 3 injured reserve spots.',
            '12 starters: 1 QB / 2 RB / 3 WR / 1 TE / 4 FLEX / 1 SUPERFLEX.',
            'Full PPR scoring, 4-point passing TDs, and a 0.5 TE premium.',
            'All regular-season games are head-to-head.',
            'Startup and rookie drafts are slow drafts (8-hour timer). Startup picks can be traded.',
            'Trade deadline: Week 13.',
            '6-team playoff, Weeks 15–17. Seeds 1–4 are the top four records; seeds 5–6 are the next two by most points.',
            'Week 15: seeds 1–2 get a bye; seeds 3–6 play. Week 16: final four play; winners advance to the championship, losers play for 3rd. Week 17: championship and 3rd-place games.',
            'Non-playoff teams play the Toilet Bowl to avoid last place. It does not determine draft order.',
            'Rookie draft order: picks 1–4 by potential points; picks 5–10 by playoff finish.',
            'In-season FAAB: $100 at the start of Week 1. Off-season FAAB: $100 one month after Super Bowl Sunday.',
            `Annual fee: $${dues} (first 2 years paid at startup). League chat is on GroupMe; the league is hosted on Sleeper.`,
        ] },
        { id: 'teams', title: '1. Teams, Ownership, and Replacement', items: [
            '1.1 The league consists of ten (10) teams, each owned by a different league member.',
            '1.2 Replacement: the Commissioner shall find a replacement owner using whatever means necessary to keep the league stable.',
        ] },
        { id: 'season', title: '2. Regular Season, Playoffs, and Consolation Bracket', items: [
            '2.1 Regular-season matchups that end in a tie are decided by bench points.',
            '2.2 Extra Game Against the Median (removed in 2024 — see Amendments).',
            [
                'Each regular-season week had a second matchup against the league median: teams above the median got a win, teams below got a loss.',
                'The median was the average of the 5th- and 6th-highest scores. Scoring exactly the median was a tie.',
            ],
            '2.3 Playoffs run Weeks 15–17 in a non-reseeding bracket. Six of the ten teams make the playoffs.',
            [
                'Seeds 1–4: overall record, then highest total points for, then head-to-head.',
                'Seeds 5–6 (wildcards): highest total points for among the remaining teams, then seeded by record, points for, then head-to-head.',
                'Seeds 1 and 2 get a first-round bye. The bracket does not re-seed.',
                'Playoff tiebreakers, in order: best regular-season record vs. opponent; most combined points in the two matchups; higher seed.',
            ],
            '2.4 The consolation bracket runs Weeks 15–17 in a non-reseeding bracket and does not affect the rookie draft order (but see the 2023 amendment on pick 2.11).',
        ] },
        { id: 'rosters', title: '3. Rosters', items: [
            '3.1 27 roster spots: 12 starters and 15 bench, plus 3 IR spots (Sleeper IR rules) and 5 taxi spots.',
            [ '1 QB, 2 RB, 3 WR, 1 TE, 4 WR/RB/TE (Flex), 1 QB/WR/RB/TE (SuperFlex), 15 BN, 3 IR, 5 TX.' ],
            '3.2 A valid lineup must be played every week — no IR, Out, Suspended, or bye-week players in the starting lineup, and no empty spots.',
            [
                '1st illegal lineup: warning.',
                '2nd: loss of 25% of FAAB.',
                '3rd: lose your next 3rd-round pick.',
                '4th: lose your next 2nd-round pick.',
                '5th: lose your next 1st-round pick.',
                '6th: booted.',
            ],
            '3.3 Taxi Squad — five (5) spots.',
            [
                'Eligible: players in the NFL no longer than two (2) seasons. After a player\'s second season he must be moved to the active roster or released.',
                'Taxi squads lock at the start of the regular season; players can\'t be added to taxi during the season.',
                'In the off-season, players may move to and from taxi as often as the owner wants.',
                'Taxi locks after the preseason. A player removed from taxi after that can\'t return to taxi until the off-season.',
            ],
        ] },
        { id: 'fa', title: '4. Free Agency and FAAB', items: [
            '4.1 All dropped players go to waivers. Owners blind-bid from their Free Agent Auction Budget (FAAB).',
            [
                'Each owner gets $100 for the in-season period (starts Week 1) and $100 for the off-season period (starts one month after Super Bowl Sunday).',
                'Minimum bid $0, minimum increment $1. Highest bid wins; ties go to the team with higher waiver priority.',
                'In-season waivers process daily, Wednesday through game time. After Week 16 games, all transactions lock until the off-season. Off-season waivers process daily.',
            ],
        ] },
        { id: 'trades', title: '5. Trades', items: [
            '5.1 Any team may offer, accept, or decline trades during the regular season up to the trade deadline.',
            '5.2 Players, startup picks, and rookie picks are tradable.',
            '5.3 The trade deadline is Week 13. Trades process immediately.',
            '5.5 Trading a future-year pick requires that season to be paid within 24 hours, or the trade is reversed (by the next playable game).',
            '5.6 Collusion: punishment is at the commissioner\'s discretion.',
        ] },
        { id: 'offseason', title: '6. Off-season', items: [
            '6.1 Off-season trades open one month after Super Bowl Sunday.',
            '6.2 Each owner receives $100 off-season FAAB, reset after the preseason.',
        ] },
        { id: 'startup', title: '7. Startup Draft', items: [
            '33-round snake draft on Sleeper with a randomized order.',
            '8-hour pick timer, paused from 9 PM to 8 AM. Miss your window and you\'re leap-frogged until you pick.',
            'Startup picks may be traded during the draft. All NFL players are eligible.',
        ] },
        { id: 'rookie', title: '8. Rookie Draft', items: [
            '8.1 Four (4) rounds on Sleeper, 8-hour timer paused from 9 PM to 8 AM.',
            '8.2 Held two weeks after the NFL Draft; exact date coordinated with the league.',
            '8.3 Miss your window and you\'re leap-frogged until you pick. 8.4 Trades are allowed while the draft is ongoing.',
            '8.5 Draft order:',
            [
                'Picks 1–4: the four non-playoff teams, ordered by potential points (Max Points For). Tiebreaker: overall record.',
                'Picks 5–10: the playoff teams — 10 Champion, 9 2nd place, 8 3rd place, 7 4th place, 6 6th place, 5 5th place (winner of the 5th-place game).',
                'The draft is linear, not snake: the team with 1.01 also has 2.01, 3.01, and 4.01 (unless traded).',
            ],
        ] },
        { id: 'fees', title: '9. Fees and Payout', items: [
            `9.1 The fee is $${dues}. Changing it requires a unanimous vote.`,
            '9.2 The first 2 years were paid before the startup draft. 9.3 The annual fee is due one month after the Super Bowl; late fees cost $25 of FAAB.',
            '9.4 If an owner leaves, fees paid are non-refundable and help find a replacement.',
            '9.5 Payouts: 1st place $350 · 2nd place $100 · 3rd place $50.',
        ] },
        { id: 'amendments', title: '10. League Amendments', items: [
            '2023',
            [
                'If a game isn\'t finished or is suspended mid-game, starters in that game get their season average.',
                'The consolation bracket winner is awarded pick 2.11 in the rookie draft.',
            ],
            '2024',
            [
                'Sleeper\'s Auto-Sub feature is allowed.',
                'League median game removed.',
                'Top 4 teams by record clinch playoff berths; the final 2 are determined by total points scored.',
            ],
            '2025',
            [ 'No amendments recorded yet.' ],
        ] },
    ];

    let query = '';
    $: q = query.trim().toLowerCase();
    $: visible = sections
        .map((s) => {
            if (!q || s.title.toLowerCase().includes(q)) return s;
            const items = [];
            s.items.forEach((item, idx) => {
                if (Array.isArray(item)) {
                    const sub = item.filter((t) => t.toLowerCase().includes(q));
                    if (sub.length) {
                        const parent = s.items[idx - 1];
                        if (typeof parent === 'string' && items[items.length - 1] !== parent) items.push(parent);
                        items.push(sub);
                    }
                } else if (item.toLowerCase().includes(q)) items.push(item);
            });
            return { ...s, items };
        })
        .filter((s) => s.items.length);

    const highlight = (text) => {
        const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        if (!q) return safe;
        const i = safe.toLowerCase().indexOf(q);
        return i < 0 ? safe : `${safe.slice(0, i)}<mark>${safe.slice(i, i + q.length)}</mark>${safe.slice(i + q.length)}`;
    };
</script>

<div class="sf-page">
    <header class="sf-hero">
        <span class="material-icons" aria-hidden="true">history_edu</span>
        <div>
            <div class="sf-eyebrow">Constitution</div>
            <h1>Sunday Funday Dynasty Rulebook</h1>
            <p>The league's official rules and amendments. Search for anything — taxi, FAAB, tiebreakers, payouts.</p>
        </div>
    </header>

    <input class="search" type="search" placeholder="Search the rulebook…" bind:value={query} aria-label="Search the rulebook" />

    <nav class="toc" aria-label="Sections">
        {#each sections as s}<a href="#{s.id}">{s.title}</a>{/each}
    </nav>

    {#each visible as s (s.id)}
        <section id={s.id} class="sf-card rule">
            <h2>{@html highlight(s.title)}</h2>
            <ul>
                {#each s.items as item}
                    {#if Array.isArray(item)}
                        <ul class="sub">{#each item as t}<li>{@html highlight(t)}</li>{/each}</ul>
                    {:else}
                        <li>{@html highlight(item)}</li>
                    {/if}
                {/each}
            </ul>
        </section>
    {:else}
        <div class="sf-card sf-empty">No rules match “{query}”.</div>
    {/each}
</div>

<style>
    .search {
        width: 100%;
        box-sizing: border-box;
        min-height: 46px;
        padding: 0 1em;
        border-radius: 12px;
        border: 1px solid var(--sfBorder);
        background: var(--sfCard);
        color: var(--sfText);
        font: inherit;
        margin-bottom: 1em;
    }
    .search:focus { outline: 2px solid var(--sfGold); outline-offset: 1px; }
    .toc { display: flex; flex-wrap: wrap; gap: 0.4em; margin-bottom: 1.4em; }
    .toc a {
        font-size: 0.8em;
        padding: 0.35em 0.75em;
        border-radius: 999px;
        border: 1px solid var(--sfBorder);
        background: var(--sfCard);
        color: var(--sfText);
        text-decoration: none;
    }
    .toc a:hover { border-color: var(--sfGold); }
    .rule { padding: 1.1em 1.4em; margin-bottom: 1em; scroll-margin-top: 1em; }
    .rule h2 { font-size: 1.15em; margin: 0 0 0.5em; color: var(--sfAccentText); }
    ul { margin: 0; padding-left: 1.2em; }
    li { margin: 0.4em 0; line-height: 1.5; }
    .sub { padding-left: 1.4em; color: var(--sfMuted); }
    .sub li { margin: 0.25em 0; }
    :global(.rule mark) { background: rgba(198, 154, 82, 0.4); color: inherit; border-radius: 2px; }
</style>
