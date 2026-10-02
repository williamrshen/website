import { profile } from '../data/profile'
import styles from './Portrait.module.css'

export function Portrait() {
  return (
    <figure className={styles.portrait}>
      <div className={styles.frame}>
        <img
          className={styles.image}
          src={profile.portrait.src}
          alt={profile.portrait.alt}
          width="1000"
          height="1162"
          decoding="async"
        />
      </div>
      <figcaption className={styles.caption}><span>01 / THE PERSON BEHIND THE GARDEN</span><span>HELLO, WORLD.</span></figcaption>
    </figure>
  )
}
