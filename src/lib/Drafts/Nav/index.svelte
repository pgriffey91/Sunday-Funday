<script>
	import { base } from '$app/paths';
	import { tabs } from '$lib/utils/tabs';
	import NavSmall from './NavSmall.svelte';
	import NavLarge from './NavLarge.svelte';
    import { page } from '$app/stores';	
	import IconButton from '@smui/icon-button';
	import { Icon } from '@smui/common';

	const norm = (p) => (p || '').replace(/\/$/, '') || '/';
	$: path = norm($page.url.pathname);
	$: active = tabs.find(tab => norm(tab.dest) == path || (tab.nest && tab.children.find(subTab => norm(subTab.dest) == path)));
	$: pageTitle = (() => {
		const all = tabs.flatMap(t => t.nest ? t.children : [t]);
		const match = all.find(t => norm(t.dest) == path);
		if (match) return match.label;
		const slug = path.slice(base.length).replace(/^\//, '');
		return slug ? slug[0].toUpperCase() + slug.slice(1) : 'Home';
	})();

	// toggle dark mode
	let lightTheme =
		typeof window === "undefined" ||
		window.matchMedia("(prefers-color-scheme: light)").matches;
	
	function switchTheme() {
		lightTheme = !lightTheme;
		let themeLink = document.head.querySelector("#theme");
		if (!themeLink) {
			themeLink = document.createElement("link");
			themeLink.rel = "stylesheet";
			themeLink.id = "theme";
		}
		themeLink.href = `${base}/smui${lightTheme ? "" : "-dark"}.css`;
		document.head
		.querySelector('#smui-dark')
		.insertAdjacentElement("afterend", themeLink);
	}
</script>

<svelte:head>
	<title>{pageTitle} | Sunday Funday</title>
</svelte:head>

<style>
	a {
		display: table;
    	margin: 0 auto;
	}
	nav {
		background-color: var(--fff);
		position: relative;
		z-index: 2;
		border-bottom: 2px solid var(--sfGold, #c9a227);
		box-shadow: 0 0 8px 0 rgba(27, 36, 51, 0.6);
	}

	#logo {
		width: 110px;
		display: block;
		margin: 0 auto;
		padding: 10px;
	}

    .large {
		display: block;
    }

	.small {
		display: none;
	}

	.container {
		position: absolute;
		top: 0.25em;
		right: 0.25em;
	}

	:global(.lightDark) {
		color: var(--g555)
	}

	@media (max-width: 950px) { /* width of the large navBar */
		.large {
			display: none;
		}

		.small {
			display: block;
		}
	}
</style>

<nav>
	<a href="{base}/"><img id="logo" alt="Sunday Funday Dynasty logo" src="{base}/badge.png" /></a>

	<div class="container">
		<IconButton
			toggle
			pressed={lightTheme}
			on:MDCIconButtonToggle:change={switchTheme}
			class="lightDark"
		>
			<Icon class="material-icons" on>dark_mode</Icon>
			<Icon class="material-icons">light_mode</Icon>
		</IconButton>
	</div>

	<div class="large">
		<NavLarge {tabs} bind:active={active} />
	</div>

	<div class="small">
		<NavSmall {tabs} bind:active={$page.url.pathname} />
	</div>

</nav>
