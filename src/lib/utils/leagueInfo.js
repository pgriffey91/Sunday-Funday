/*   STEP 1   */
// The CURRENT season's Sleeper league ID. Sleeper issues a new ID every year
// when the league renews, so update this each season (the site walks back
// through previous_league_id on its own to find every older season).
//   2026: 1312479973759520768
//   2025: 1180208087692066816
//   2024: 1048291857920364544
//   2023: 918180546650603520
export const leagueID = "1312479973759520768";
export const leagueName = "Sunday Funday";
export const dues = 50; // used on the Constitution page
export const dynasty = true; // true for dynasty leagues, false for redraft and keeper

/*   STEP 2   */
export const homepageText = `
  <p>Sunday Funday was founded prior to the 2021 season. The league was created to prove our dominance over one another and crush any hopes our friends have toward success.</p>
  <p>Ten managers. Twelve starters. One SuperFlex. Full PPR, 4-point passing TDs, and a half-point TE premium. Every Sunday is a reckoning.</p>
`;

/*   STEP 3   */
/*
  One entry per manager. "managerID" is the Sleeper user_id (from
  https://api.sleeper.app/v1/league/<leagueID>/users) — that's the only thing
  that ties an entry to a team, so don't change it.

  Everything else is yours to fill in. To omit an optional field, set it to null.
  - "photo": leave null to use the manager's Sleeper avatar, or drop a square
    image into /static/managers/ and point to it, e.g. "/managers/pat.jpg".
  - "favoriteTeam": lowercase NFL abbreviation ("chi", "gb", "det", ...).
  - "mode": 'Win Now', 'Dynasty', or 'Rebuild' have built-in icons.
  - "rookieOrVets": 'Rookies' or 'Vets' have built-in icons.
  - "rival": { name, link (index of the rival in THIS array, or null), image }.
  - "favoritePlayer": Sleeper player ID.
  - "preferredContact": 'Text', 'WhatsApp', 'Sleeper', 'Email', 'Phone',
    'Discord', or 'Carrier Pigeon'.
*/
const blankManager = {
  location: null,
  bio: "Bio coming soon.",
  photo: null,
  fantasyStart: null,
  favoriteTeam: null,
  mode: null,
  rival: null,
  favoritePlayer: null,
  valuePosition: null,
  rookieOrVets: null,
  philosophy: null,
  tradingScale: null,
  preferredContact: null,
};

export const managers = [
  {
    ...blankManager,
    managerID: "76455547339423744",
    name: "Pat",
    location: "Orland Park",
    bio: "Commish",
    fantasyStart: 2008,
    favoriteTeam: "chi",
    mode: "Pretender",
    rival: {
      name: "Rosco",
      link: null, // set to Rosco's index in this array to link to his page
      image: "/managers/question.jpg",
    },
    favoritePlayer: 21679,
    valuePosition: "WR",
    rookieOrVets: "Rookies",
    philosophy: "Everyone is available at the right price",
    tradingScale: 10,
    preferredContact: "Text",
  },
  { ...blankManager, managerID: "467382534955593728", name: "Aaronst8" },
  { ...blankManager, managerID: "457414395522183168", name: "dpurce" },
  { ...blankManager, managerID: "467738287784587264", name: "mjdonovitch" },
  { ...blankManager, managerID: "420375269967142912", name: "Erock1215" },
  { ...blankManager, managerID: "462450443562250240", name: "Rdoro24" },
  { ...blankManager, managerID: "604558135499227136", name: "vdoro" },
  { ...blankManager, managerID: "86313750365618176", name: "jgerm" },
  { ...blankManager, managerID: "467554834065649664", name: "Bigcatbonesaw" },
  { ...blankManager, managerID: "467383588640256000", name: "kevdono88" },
];

/*   STEP 4 (Sunday Funday extras)   */
// Rookie draft (2023 amendment): the consolation bracket winner is awarded
// pick 2.11. Sleeper can't model an 11th pick, so once the consolation
// bracket is decided, set this to that team's roster_id (1-10) and the Draft
// Board will show who owns 2.11. Leave null until then.
export const consolationWinnerRosterId = null;

// Last week of the regular season (weeks 15-17 are playoffs).
export const regularSeasonWeeks = 14;
