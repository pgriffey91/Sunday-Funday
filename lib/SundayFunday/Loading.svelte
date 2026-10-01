<script>
    import LinearProgress from '@smui/linear-progress';
    export let message = 'Loading…';
</script>

<div class="sf-card sf-loading">
    <p>{message}</p>
    <LinearProgress indeterminate />
</div>

<style>
    .sf-loading { padding: 1.4em 1.4em 1.2em; }
    p { margin: 0 0 0.9em; color: var(--sfMuted); text-align: center; }
</style>
