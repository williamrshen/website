import { contact } from '../data/contact'
import { profile } from '../data/profile'
import type { OpenDetail } from '../data/types'
import { useGardenExperience } from '../hooks/useGardenExperience'
import { Logo } from './Logo'
import styles from './GardenExperience.module.css'

type Props = {
  evening: boolean
  dialogOpen: boolean
  onToggleTheme: () => void
  onOpenDetail: OpenDetail
}

export function GardenExperience({ evening, dialogOpen, onToggleTheme, onOpenDetail }: Props) {
  const { experience, garden, canvas, brand, mode, navigation, hint, cursor } = useGardenExperience(evening, dialogOpen)
  const themeLabel = evening ? 'Switch to daylight' : 'Switch to evening'

  return (
    <div className={styles.experience} ref={experience}>
      <header className={styles.header}>
        <a className={styles.brand} ref={brand} href="#garden" aria-label={`${profile.name} home`}>
          <Logo />{evening ? profile.alias : profile.wordmark}<span className={styles.brandDot}>.</span>
        </a>
        <button
          className={styles.mode}
          ref={mode}
          id="mode"
          aria-pressed={evening}
          aria-label={themeLabel}
          title={themeLabel}
          onClick={onToggleTheme}
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="3" stroke="currentColor" />
            <path d="M10 1v3m0 12v3M1 10h3m12 0h3M4 4l2 2m8 8 2 2M4 16l2-2m8-8 2-2" stroke="currentColor" />
          </svg>
          <span>{evening ? 'Evening' : 'Daylight'}</span>
        </button>
        <nav className={styles.navigation} ref={navigation} aria-label="Main navigation">
          <a href="#about">About</a>
          <a className={styles.experienceLink} href="#experience">Experience</a>
          <a href="#work">Work</a>
          <a className={styles.hobbiesLink} href="#hobbies">Hobbies</a>
          <button className={styles.contactLink} onClick={() => onOpenDetail(contact)}>Say hello <span aria-hidden="true">↗</span></button>
        </nav>
      </header>
      <section className={styles.garden} ref={garden} id="garden" aria-label="Welcome to my little corner of the internet">
        <div className={styles.surface} data-garden-surface>
          <canvas
            className={styles.world}
            ref={canvas}
            id="world"
            role="img"
            aria-label="An interactive isometric garden with a large voxel oak tree, small evergreens, flowers, and grass tiles. Move your pointer to illuminate the surrounding grid."
          />
          <a className={styles.hint} ref={hint} href="#about" aria-label="Scroll to introduction">
            <span className={styles.down} aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <div className={styles.cursor} ref={cursor} data-garden-cursor aria-hidden="true" />
    </div>
  )
}
