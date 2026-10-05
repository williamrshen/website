import mcsrIcon from '../assets/hobbies/mcsr.svg'
import speedcubingIcon from '../assets/hobbies/speedcubing.svg'
import tableTennisIcon from '../assets/hobbies/table-tennis.svg'
import tetrisIcon from '../assets/hobbies/tetris.svg'
import { hobbies, hobbySnapshotDate } from '../data/hobbies'
import type { Detail, Hobby } from '../data/types'
import { useDetailPanel } from '../hooks/useDetailPanel'
import { DetailPanel } from './DetailPanel'
import { Sparkline } from './Sparkline'
import split from './DetailPanel.module.css'
import styles from './HobbySection.module.css'

const icons: Record<string, string> = {
  tetris: tetrisIcon,
  mcsr: mcsrIcon,
  'table-tennis': tableTennisIcon,
  speedcubing: speedcubingIcon,
}

const toDetail = (hobby: Hobby): Detail => ({
  kicker: `HOBBY · ${hobby.eyebrow.toUpperCase()}`,
  title: hobby.title,
  description: hobby.blurb,
  stats: hobby.stats,
  history: hobby.history,
  link: hobby.link,
  note: `Sample stats from ${hobbySnapshotDate} · not live`,
})

export function HobbySection() {
  // Tiles shrink to just their header in the side list; `hobby-tile` crops (rather than
  // squashes) their snapshots during the morph. See index.css.
  const panel = useDetailPanel(hobbies, 'hobby', { transitionClass: 'hobby-tile' })
  const { selected, split: isSplit, itemsRef, panelRef } = panel

  return (
    <section className={styles.section} id="hobbies" aria-labelledby="hobbies-heading">
      <div className={styles.heading}>
        <h2 id="hobbies-heading">What I grew up doing</h2>
        <span>HOBBIES /</span>
      </div>
      <div className={isSplit ? `${split.split} ${styles.split}` : undefined} {...panel.containerProps}>
        <div className={split.items} ref={itemsRef}>
          <ul className={styles.grid}>
            {hobbies.map((hobby, index) => {
              const [featured, secondary] = hobby.stats
              return (
                <li key={hobby.id}>
                  <button {...panel.cardProps(hobby.id)} className={styles.tile}>
                    <span className={styles.top}>
                      <span className={styles.icon} data-tone={index % 3}><img src={icons[hobby.id]} alt="" /></span>
                      <span>
                        <span className={styles.eyebrow}>{hobby.eyebrow}</span>
                        <span className={styles.title}>{hobby.title}</span>
                      </span>
                    </span>
                    <span className={styles.stat}>
                      <span className={styles.value}>{featured.value}</span>
                      <span className={styles.label}>{featured.label}</span>
                    </span>
                    <span className={styles.trend}>
                      {hobby.history
                        ? <Sparkline series={hobby.history} compact />
                        : secondary && <span className={styles.secondary}><b>{secondary.value}</b> {secondary.label}</span>}
                    </span>
                    <span className={styles.more}>View stats <span aria-hidden="true">→</span></span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        {selected && (
          <DetailPanel
            detail={toDetail(selected)}
            itemKey={selected.id}
            id={panel.panelId}
            titleId={panel.panelTitleId}
            panelRef={panelRef}
            onClose={panel.close}
          />
        )}
      </div>
    </section>
  )
}
