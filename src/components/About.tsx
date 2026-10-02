import type { OpenStory } from '../data/portfolio'
import { Portrait } from './Portrait'
import styles from './About.module.css'

export function About({ onOpenStory }: { onOpenStory: OpenStory }) {
  return (
    <section className={styles.hero} id="about" aria-labelledby="intro-heading" tabIndex={-1}>
      <Portrait />
      <div className={styles.intro}>
        <div className={styles.eyebrow}><span className={styles.dot} />Nice to meet you</div>
        <h1 id="intro-heading">I'm William.<br />Curious by <em>nature.</em></h1>
        <p className={styles.lead}>A builder, a thoughtful tinkerer,<br />and a work in progress.</p>
        <p>I like turning interesting problems into useful things. This is my little patch of the internet — a place for the work, ideas, and experiments I'm growing along the way.</p>
        <div className={styles.links}>
          <a className={styles.cta} href="#work">Explore my work <span aria-hidden="true">↗</span></a>
          <button className={styles.secondaryLink} onClick={() => onOpenStory('contact')}>Or just say hello ↗</button>
        </div>
        <div className={styles.signoff}><i aria-hidden="true" />OPEN TO GOOD PEOPLE & INTERESTING PROBLEMS</div>
      </div>
    </section>
  )
}
