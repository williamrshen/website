import type { OpenStory } from '../data/portfolio'
import { profile } from '../data/profile'
import { Portrait } from './Portrait'
import styles from './About.module.css'

export function About({ onOpenStory }: { onOpenStory: OpenStory }) {
  return (
    <section className={styles.hero} id="about" aria-labelledby="intro-heading" tabIndex={-1}>
      <Portrait />
      <div className={styles.intro}>
        <div className={styles.eyebrow}><span className={styles.dot} />aka {profile.alias}</div>
        <h1 id="intro-heading">I'm William.<br />Curious by <em>nature.</em></h1>
        <p className={styles.lead}>{profile.lead}</p>
        <p>{profile.bio}</p>
        <div className={styles.links}>
          <a className={styles.cta} href="#work">Explore my work <span aria-hidden="true">↗</span></a>
          <button className={styles.secondaryLink} onClick={() => onOpenStory('contact')}>Or just say hello ↗</button>
        </div>
        <div className={styles.currently}>
          <h2 id="currently-heading">Currently</h2>
          <ul aria-labelledby="currently-heading">
            {profile.currently.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}
