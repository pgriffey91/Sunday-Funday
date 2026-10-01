<script>
    import { createEventDispatcher } from 'svelte';
    import { fly, fade } from 'svelte/transition';
    export let open = false;
    export let label = 'Details';
    const dispatch = createEventDispatcher();
    const close = () => dispatch('close');
    const onKey = (e) => { if (open && e.key === 'Escape') close(); };
</script>

<svelte:window on:keydown={onKey} />

{#if open}
    <div class="sf-drawer-backdrop" on:click={close} transition:fade={{ duration: 150 }} />
    <aside class="sf-drawer" role="dialog" aria-modal="true" aria-label={label} transition:fly={{ x: 400, duration: 220 }}>
        <button class="sf-drawer-close" on:click={close} aria-label="Close">✕</button>
        <slot />
    </aside>
{/if}
