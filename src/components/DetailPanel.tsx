import type { Ref } from 'react'
import type { Detail } from '../data/types'
import { DetailContent } from './DetailContent'
import styles from './DetailPanel.module.css'

type Props = {
  detail: Detail
  /** Changes when a different item is shown, to replay the content entrance. */
  itemKey: string
  id: string
  titleId: string
  panelRef: Ref<HTMLDivElement>
  onClose: () => void
}

export function DetailPanel({ detail, itemKey, id, titleId, panelRef, onClose }: Props) {
  return (
    <div className={styles.panel} id={id} ref={panelRef} role="region" aria-labelledby={titleId}>
      <button className={styles.close} aria-label="Close details" onClick={onClose}>×</button>
      <div className={styles.panelBody} key={itemKey}>
        <DetailContent detail={detail} titleId={titleId} headingLevel={3} />
      </div>
    </div>
  )
}
