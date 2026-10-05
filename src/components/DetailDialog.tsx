import { useLayoutEffect, useRef } from 'react'
import type { Detail } from '../data/types'
import { DetailContent } from './DetailContent'
import styles from './DetailDialog.module.css'

export function DetailDialog({ detail, onClose }: { detail: Detail | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (detail && !dialog.open) dialog.showModal()
    else if (!detail && dialog.open) dialog.close()
  }, [detail])

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
      {detail && <DetailContent detail={detail} titleId="dialog-title" descriptionId="dialog-description" />}
    </dialog>
  )
}
