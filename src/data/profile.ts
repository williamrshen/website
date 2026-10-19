import burlington from '../assets/burlington.jpg'
import portrait from '../assets/portrait.jpg'

export const profile = {
  name: 'William Shen',
  wordmark: 'william shen',
  alias: 'uselessleaf',
  /** Hero slideshow. `position` is the CSS object-position used to crop each photo into the portrait frame. */
  portraits: [
    {
      src: portrait, width: 1000, height: 1162, position: '50% 20%',
      alt: 'William Shen smiling beside a giant pink lobster statue',
      caption: 'east coast road trip, me with a lobster',
    },
    {
      src: burlington, width: 2048, height: 1536, position: '60% 50%',
      alt: 'William Shen leaning on a blue railing and looking out over the lake from a pier in Burlington',
      caption: 'went salmon watching',
    },
  ],
  resume: {
    href: '/resume.pdf',
    filename: 'William Shen - Resume.pdf',
  },
  bio: 'third-year math student at waterloo who likes algorithms, games, and good food.',
  now: 'swe intern @ geotab',
}
