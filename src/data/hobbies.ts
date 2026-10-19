// Static sample copied once from the old site's stats snapshot (2026-10-02T16:00:42.073Z).
// Table tennis and MCSR Ranked use these sample numbers. TETR.IO and speedcubing come from generated snapshots.
// Histories are downsampled to at most 36 points.
import tetrio from './generated/tetrio.json'
import type { Hobby } from './types'

/** Hobbies backed by a weekly API refresh say when they were last fetched instead of "sample". */
const liveNote = (fetchedAt: string) =>
  `Live stats from ${new Date(fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · refreshed weekly`

export const hobbySnapshotDate = 'Oct 2, 2026'

export const hobbies: Hobby[] = [
  {
    id: 'tetris',
    title: 'TETR.IO',
    eyebrow: 'Competitive Tetris',
    blurb: 'Started playing tetris when introduced by a friend in grade 11. Grinded a lot in highschool, both in class and out of class (oops). Now just playing for fun here and there.',
    stats: tetrio.stats,
    history: tetrio.history,
    note: liveNote(tetrio.fetchedAt),
    link: { label: 'View TETR.IO profile', href: 'https://ch.tetr.io/u/uselessleaf' },
  },
  {
    id: 'mcsr',
    title: 'MCSR Ranked',
    eyebrow: 'Minecraft Speedrunning',
    blurb: 'Started after seeing couriway\'s 14:36 1.16 RSG world record. Been playing on and off for a while. Now mainly playing ranked.',
    stats: [
      { label: 'current elo', value: '1,158', detail: 'rank #4,526' },
      { label: 'all-time best', value: '13:35.658', detail: 'ranked RSG' },
      { label: 'ranked record', value: '368–341', detail: '51.9% win rate' },
    ],
    history: {
      label: 'ranked elo history',
      points: [
        { label: 'Aug 31, 2026', value: 1102 },
        { label: 'Aug 31, 2026', value: 1082 },
        { label: 'Aug 31, 2026', value: 1101 },
        { label: 'Sep 1, 2026', value: 1121 },
        { label: 'Sep 1, 2026', value: 1141 },
        { label: 'Sep 1, 2026', value: 1121 },
        { label: 'Sep 1, 2026', value: 1141 },
        { label: 'Sep 1, 2026', value: 1161 },
        { label: 'Sep 1, 2026', value: 1142 },
        { label: 'Sep 18, 2026', value: 1121 },
        { label: 'Sep 18, 2026', value: 1121 },
        { label: 'Sep 18, 2026', value: 1101 },
        { label: 'Sep 18, 2026', value: 1120 },
        { label: 'Sep 21, 2026', value: 1139 },
        { label: 'Sep 21, 2026', value: 1118 },
        { label: 'Sep 21, 2026', value: 1099 },
        { label: 'Sep 21, 2026', value: 1118 },
        { label: 'Sep 21, 2026', value: 1139 },
        { label: 'Sep 24, 2026', value: 1160 },
        { label: 'Sep 24, 2026', value: 1180 },
        { label: 'Sep 24, 2026', value: 1200 },
        { label: 'Sep 30, 2026', value: 1179 },
        { label: 'Sep 30, 2026', value: 1200 },
        { label: 'Oct 1, 2026', value: 1220 },
        { label: 'Oct 1, 2026', value: 1198 },
        { label: 'Oct 1, 2026', value: 1179 },
        { label: 'Oct 1, 2026', value: 1158 },
        { label: 'Oct 1, 2026', value: 1138 },
        { label: 'Oct 1, 2026', value: 1158 },
      ],
    },
    link: { label: 'View MCSR Ranked profile', href: 'https://mcsrranked.com/stats/uselessleaf' },
  },
  {
    id: 'table-tennis',
    title: 'Table Tennis',
    eyebrow: 'Provincial Level',
    blurb: 'Playing since 2014. Trained a lot and got up to provincial level. Top Canadian competitor up until age 15.',
    stats: [
      { label: 'latest rating', value: '1,104', detail: 'rating period May 5, 2023' },
      { label: 'peak rating', value: '1,184', detail: 'reached May 5, 2022' },
      { label: 'record', value: '148–184', detail: '44.6% win rate' },
    ],
    history: {
      label: 'rating history',
      points: [
        { label: 'May 1, 2016', value: 372 },
        { label: 'October 1, 2016', value: 464 },
        { label: 'December 1, 2016', value: 484 },
        { label: 'February 1, 2017', value: 525 },
        { label: 'March 1, 2017', value: 543 },
        { label: 'April 1, 2017', value: 557 },
        { label: 'May 1, 2017', value: 590 },
        { label: 'June 1, 2017', value: 560 },
        { label: 'August 1, 2017', value: 573 },
        { label: 'September 1, 2017', value: 593 },
        { label: 'November 1, 2017', value: 618 },
        { label: 'December 1, 2017', value: 752 },
        { label: 'April 1, 2018', value: 829 },
        { label: 'May 1, 2018', value: 884 },
        { label: 'September 1, 2018', value: 902 },
        { label: 'October 1, 2018', value: 909 },
        { label: 'November 1, 2018', value: 940 },
        { label: 'May 1, 2019', value: 1022 },
        { label: 'August 1, 2019', value: 1008 },
        { label: 'December 1, 2019', value: 1064 },
        { label: 'January 1, 2020', value: 1098 },
        { label: 'May 5, 2022', value: 1184 },
        { label: 'January 5, 2023', value: 1181 },
        { label: 'May 5, 2023', value: 1104 },
      ],
    },
  },
  {
    id: 'speedcubing',
    title: 'Speedcubing',
    // "×" rather than "x": the eyebrow is uppercased, which would turn "3x3" into "3X3".
    eyebrow: '3×3 Main',
    blurb: 'Been cubing since 2012! Started with a Rubik\'s brand cube and truly started speedcubing in 2015. A 3x3 main through and through. Trying to learn some more events now!',
    stats: [
      { label: '3×3 single', value: '—' },
      { label: '3×3 average', value: '—' },
    ],
    link: { label: 'View WCA profile', href: 'https://www.worldcubeassociation.org/persons/2016SHEN13' },
  },
]
