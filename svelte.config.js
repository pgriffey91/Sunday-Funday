import adapter from '@sveltejs/adapter-static';

// GitHub Pages serves a "project site" from a sub-folder
// (https://<user>.github.io/<repo>/), so every link and asset needs that
// prefix. The deploy workflow sets BASE_PATH to "/<repo>" automatically, or to
// "" once a custom domain (static/CNAME) is in place. Local dev uses "".
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html', // GitHub Pages serves this for unknown URLs; the SPA router takes over
			precompress: false,
			strict: true,
		}),
		paths: { base, relative: false },
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore links to assets that only exist at runtime (e.g. players.json before the first build)
				if (path.endsWith('.json')) return;
				throw new Error(message);
			},
		},
	}
};

export default config;
