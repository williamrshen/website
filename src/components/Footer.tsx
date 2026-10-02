import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.faith}>
        <p className={styles.motto}>
          <svg viewBox="0 0 12 16" aria-hidden="true"><path d="M6 1v14M2 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          soli deo gloria
        </p>
        <figure className={styles.verse}>
          <blockquote>
            <p>
              But he said to me, <em>“My grace is sufficient for you, for my power is made perfect in weakness.”</em>{' '}
              Therefore I will boast all the more gladly about my weaknesses, so that Christ’s power may rest on me.
            </p>
          </blockquote>
          <figcaption>2 Corinthians 12:9</figcaption>
        </figure>
      </div>
      <span className={styles.signoff}>Made with intention. And a little imagination.</span>
    </footer>
  )
}
