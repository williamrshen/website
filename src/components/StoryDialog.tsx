import { useLayoutEffect, useRef } from 'react'
import { stories, type StoryKey } from '../data/portfolio'
import styles from './StoryDialog.module.css'

export function StoryDialog({ storyKey, onClose }: { storyKey: StoryKey | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const story = storyKey ? stories[storyKey] : null

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (storyKey && !dialog.open) dialog.showModal()
    else if (!storyKey && dialog.open) dialog.close()
  }, [storyKey])

  return (
    <dialog
      className={styles.dialog}
      ref={ref}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close()
      }}
    >
      <button className={styles.close} aria-label="Close dialog" onClick={() => ref.current?.close()}>×</button>
      <span className={styles.kicker}>{story?.kicker}</span>
      <h2 id="dialog-title">{story?.title}</h2>
      <p id="dialog-description">{story?.description}</p>
    </dialog>
  )
}
