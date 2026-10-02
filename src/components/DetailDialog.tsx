import { useLayoutEffect, useRef } from 'react'
import type { Detail } from '../data/types'
import styles from './DetailDialog.module.css'

export function DetailDialog({ detail, onClose }: { detail: Detail | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (detail && !dialog.open) dialog.showModal()
    else if (!detail && dialog.open) dialog.close()
  }, [detail])

  const external = detail?.link && /^https?:/.test(detail.link.href)

  return (
    <dialog
      className={styles.dialog}
      ref={ref}
      aria-labelledby="dialog-title"
      aria-describedby={detail?.description ? 'dialog-description' : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close()
      }}
    >
      <button className={styles.close} aria-label="Close dialog" onClick={() => ref.current?.close()}>×</button>
      {detail && (
        <>
          <span className={styles.kicker}>{detail.kicker}</span>
          <h2 id="dialog-title">{detail.title}</h2>
          {detail.subtitle && <p className={styles.subtitle}>{detail.subtitle}</p>}
          {detail.description && <p id="dialog-description">{detail.description}</p>}
          {detail.bullets && detail.bullets.length > 0 && (
            <ul className={styles.bullets}>{detail.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          )}
          {detail.tags && detail.tags.length > 0 && (
            <ul className={styles.tags} aria-label="Skills and tools">
              {detail.tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          )}
          {detail.link && (
            <a
              className={styles.link}
              href={detail.link.href}
              {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {detail.link.label} <span aria-hidden="true">↗</span>
              {external && <span className={styles.visuallyHidden}> (opens in a new tab)</span>}
            </a>
          )}
        </>
      )}
    </dialog>
  )
}
