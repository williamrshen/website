import { profile } from '../data/profile'
import { Logo } from './Logo'
import styles from './NotFound.module.css'

// Neighboring tile outlines fade out from the empty plot, like the garden grid.
const neighbors = [
  [-80, -40], [0, -80], [80, -40], [-160, 0], [160, 0], [-80, 40], [0, 80], [80, 40],
]

const tile = (dx: number, dy: number) => `M${120 + dx} ${60 + dy} ${200 + dx} ${100 + dy} ${120 + dx} ${140 + dy} ${40 + dx} ${100 + dy}Z`

export function NotFound() {
  return (
    <main className={styles.page}>
      <a className={styles.brand} href="/" aria-label={`${profile.name} home`}>
        <Logo />{profile.wordmark}<span className={styles.dot}>.</span>
      </a>
      <svg className={styles.plot} viewBox="-60 -40 360 240" aria-hidden="true">
        <defs>
          <radialGradient id="grid-fade">
            <stop offset="35%" stopColor="#fff" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="grid-mask"><rect x="-60" y="-40" width="360" height="240" fill="url(#grid-fade)" /></mask>
        </defs>
        <g mask="url(#grid-mask)" fill="none" stroke="#7b9757" strokeOpacity="0.35">
          {neighbors.map(([dx, dy]) => <path key={`${dx},${dy}`} d={tile(dx, dy)} />)}
        </g>
        <path d="M40 100 120 140v12L40 112Z" fill="#8a9f68" />
        <path d="m120 140 80-40v12l-80 40Z" fill="#9db07a" />
        <path d={tile(0, 0)} fill="#b3c391" />
        <ellipse cx="120" cy="101" rx="13" ry="5" fill="#a08462" opacity="0.75" />
        <path d="M120 100V74" stroke="#698250" strokeWidth="3" strokeLinecap="round" />
        <path d="M120 86c-12 0-19-6-20-15 11-1 19 5 20 15Z" fill="#8eaa66" />
        <path d="M120 79c2-11 10-17 21-16-1 10-9 16-21 16Z" fill="#779858" />
      </svg>
      <p className={styles.eyebrow}>404 · Page not found</p>
      <h1>Nothing's grown here yet.</h1>
      <p className={styles.copy}>This page may have moved, or it was never planted.</p>
      <a className={styles.home} href="/">Back to the garden <span aria-hidden="true">↗</span></a>
    </main>
  )
}
