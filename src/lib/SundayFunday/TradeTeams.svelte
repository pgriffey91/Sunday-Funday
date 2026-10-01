<script>
    export let teams = [];
</script>

<div class="sf-trade-teams">
    {#each teams as team}
        <div class="sf-trade-team">
            <div class="sf-trade-team-head">
                {#if team.avatar}<img class="sf-avatar" src={team.avatar} alt="" />{/if}
                <span>{team.name}</span>
            </div>
            <div class="sf-trade-received">Received</div>
            <ul>
                {#each team.gained as g}
                    <li class={g.kind}>{g.text}</li>
                {/each}
            </ul>
        </div>
    {/each}
</div>
