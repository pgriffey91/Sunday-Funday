import { base } from '$app/paths';

// Prefixes a site-relative asset path ("/managers/pat.jpg") with the deploy
// base path, so images still resolve when the site lives in a GitHub Pages
// sub-folder (https://<user>.github.io/<repo>/). Full URLs pass through.
export const assetPath = (p) => {
    if (!p) return p;
    if (/^(https?:)?\/\//.test(p) || p.startsWith('data:')) return p;
    return p.startsWith('/') ? `${base}${p}` : p;
};

// A manager's photo from leagueInfo.js, falling back to their Sleeper avatar.
export const managerPhoto = (manager, leagueTeamManagers) => {
    if (manager?.photo) return assetPath(manager.photo);
    const avatar = leagueTeamManagers?.users?.[manager?.managerID]?.avatar;
    return avatar ? `https://sleepercdn.com/avatars/${avatar}` : `${base}/managers/question.jpg`;
};

// Hides an <img> whose file doesn't exist (e.g. a custom "mode" with no icon).
export const hideOnError = (e) => { e.target.style.display = 'none'; };
