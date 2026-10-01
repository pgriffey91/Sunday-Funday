import { base } from '$app/paths';
import { leagueID } from '$lib/utils/leagueInfo';

export const tabs = [
    {
        icon: 'home',
        label: 'Home',
        dest: `${base}/`,
    },
    {
        icon: 'sports',
        label: 'Matchups',
        dest: `${base}/matchups`,
    },
    {
        icon: 'swap_horiz',
        label: 'Trades & Waivers',
        dest: `${base}/transactions`,
    },
    {
        icon: 'format_list_numbered',
        label: 'Draft & FA',
        dest: `${base}/draft-fa`,
    },
    {
        icon: 'menu_book',
        label: 'Record Book',
        dest: `${base}/record-book`,
    },
    {
        icon: 'event',
        label: 'On This Day',
        dest: `${base}/on-this-day`,
    },
    {
        icon: 'view_comfy',
        label: 'League Info',
        nest: true,
        children: [
            {
                icon: 'storage',
                label: 'Rosters',
                dest: `${base}/rosters`,
            },
            {
                icon: 'groups',
                label: 'Managers',
                dest: `${base}/managers`,
            },
            {
                icon: 'local_fire_department',
                label: 'Rivalry',
                dest: `${base}/rivalry`,
            },
            {
                icon: 'leaderboard',
                label: 'Standings',
                dest: `${base}/standings`,
            },
            {
                icon: 'view_comfy',
                label: 'Drafts',
                dest: `${base}/drafts`,
            },
            {
                icon: 'emoji_events',
                label: 'Trophy Room',
                dest: `${base}/awards`,
            },
            {
                icon: 'military_tech',
                label: 'Records',
                dest: `${base}/records`,
            },
            {
                icon: 'history_edu',
                label: 'Constitution',
                dest: `${base}/constitution`,
            },
            {
                icon: 'sports_football',
                label: 'Go to Sleeper',
                dest: `https://sleeper.app/leagues/${leagueID}`,
            },
        ]
    },
];

// Internal routes go through the SvelteKit router; the Sleeper link opens a new tab.
export const isExternal = (dest) => /^https?:\/\//.test(dest);
