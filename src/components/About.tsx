import { contact } from '../data/contact'
import { profile } from '../data/profile'
import type { OpenDetail } from '../data/types'
import { Portrait } from './Portrait'
import styles from './About.module.css'

export function About({ onOpenDetail }: { onOpenDetail: OpenDetail }) {
  return (
    <section className={styles.hero} id="about" aria-labelledby="intro-heading" tabIndex={-1}>
      <Portrait />
      <div className={styles.intro}>
        <h1 id="intro-heading">I'm William.<br />Curious by <em>nature.</em></h1>
        <p className={styles.bio}>{profile.bio}</p>
        <p className={styles.bio}>now — {profile.now}</p>
        <div className={styles.links}>
          <a className={styles.link} href={profile.resume.href} download={profile.resume.filename}>
            résumé <span aria-hidden="true">↓</span>
            <span className={styles.visuallyHidden}> (PDF)</span>
          </a>
          <button className={styles.link} onClick={() => onOpenDetail(contact)}>
            say hello <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </section>
  )
}
