<!-- __layout.svelte -->
<script>
	import { Nav, Footer } from "$lib/components"
	import "$lib/SundayFunday/sf.css";
</script>

<main>
    <Nav /> <!-- adds the nav (small and large) -->
  
    <slot />

    <Footer /> <!-- adds the footer -->
</main>