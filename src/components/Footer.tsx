import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.availability}><i aria-hidden="true" />Open to good people & interesting problems</span>
      <span className={styles.signoff}>Made with intention. And a little imagination.</span>
    </footer>
  )
}
