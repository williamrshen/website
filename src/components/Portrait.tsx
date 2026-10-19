import { useEffect, useState } from 'react'
import { profile } from '../data/profile'
import styles from './Portrait.module.css'

const { portraits } = profile
const SLIDE_MS = 6000

/**
 * The hero photo slideshow. It crossfades automatically, pauses while hovered, focused, or
 * in a background tab, and doesn't autoplay at all for visitors who prefer reduced motion.
 * Previous/next buttons and dots always work.
 */
export function Portrait() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [hidden, setHidden] = useState(() => document.hidden)
  const count = portraits.length

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    const visibility = () => setHidden(document.hidden)
    query.addEventListener('change', update)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      query.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  // Restarting on every change of `index` gives each slide its full time after a manual jump.
  useEffect(() => {
    if (count < 2 || paused || hidden || reducedMotion) return
    const timer = setTimeout(() => setIndex(current => (current + 1) % count), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, paused, hidden, reducedMotion, count])

  const go = (target: number) => setIndex((target + count) % count)
  const current = portraits[index]

  return (
    <figure
      className={styles.portrait}
      aria-roledescription="carousel"
      aria-label="Photos of William"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={styles.frame}>
        {portraits.map((photo, position) => (
          <img
            key={photo.src}
            className={styles.image}
            data-active={position === index}
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            style={{ objectPosition: photo.position }}
            aria-hidden={position !== index}
            loading={position === 0 ? undefined : 'lazy'}
            decoding="async"
          />
        ))}
        {count > 1 && (
          <>
            <button className={`${styles.arrow} ${styles.previous}`} type="button" aria-label="Previous photo" onClick={() => go(index - 1)}>‹</button>
            <button className={`${styles.arrow} ${styles.next}`} type="button" aria-label="Next photo" onClick={() => go(index + 1)}>›</button>
          </>
        )}
      </div>
      <div className={styles.footer}>
        <figcaption className={styles.caption} aria-live={paused || reducedMotion ? 'polite' : 'off'}>
          {String(index + 1).padStart(2, '0')} / {current.caption}
        </figcaption>
        {count > 1 && (
          <div className={styles.dots} role="group" aria-label="Choose photo">
            {portraits.map((photo, position) => (
              <button
                key={photo.src}
                type="button"
                className={styles.dot}
                aria-label={`Photo ${position + 1}: ${photo.caption}`}
                aria-current={position === index}
                onClick={() => setIndex(position)}
              />
            ))}
          </div>
        )}
      </div>
    </figure>
  )
}
