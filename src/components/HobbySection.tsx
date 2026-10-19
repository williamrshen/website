import { useState } from 'react'
import mcsrIcon from '../assets/hobbies/mcsr.svg'
import speedcubingIcon from '../assets/hobbies/speedcubing.svg'
import tableTennisIcon from '../assets/hobbies/table-tennis.svg'
import tetrisIcon from '../assets/hobbies/tetris.svg'
import { hobbies, hobbySnapshotDate } from '../data/hobbies'
import { cubingProfileUrl, cubingSnapshot, featuredCubingEvent, getCubingView, type CubingSource } from '../data/cubing'
import type { Detail, Hobby } from '../data/types'
import { useDetailPanel } from '../hooks/useDetailPanel'
import { DetailPanel } from './DetailPanel'
import { CubingControls, CubingExtras } from './CubingStats'
import { CubingProgression } from './CubingProgression'
import split from './DetailPanel.module.css'
import styles from './HobbySection.module.css'
import cubingStyles from './CubingStats.module.css'

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
  const [cubingSource, setCubingSource] = useState<CubingSource>('official')
  const [cubingEvent, setCubingEvent] = useState(featuredCubingEvent)
  const headline = getCubingView(cubingSource, featuredCubingEvent)
  const cubingView = getCubingView(cubingSource, cubingEvent)
  const items = hobbies.map(hobby => hobby.id === 'speedcubing' ? {
    ...hobby,
    stats: [
      { ...headline.stats[0], label: `${headline.stats[0].label} · ${cubingSource}` },
      headline.stats[1],
    ],
    link: { label: 'View WCA profile', href: cubingProfileUrl },
  } : hobby)
  // Tiles shrink to just their header in the side list; `hobby-tile` crops (rather than
  // squashes) their snapshots during the morph. See index.css.
  const panel = useDetailPanel(items, 'hobby', { transitionClass: 'hobby-tile' })
  const { selected, split: isSplit, itemsRef, panelRef } = panel
  const isCubing = selected?.id === 'speedcubing'

  return (
    <section className={styles.section} id="hobbies" aria-labelledby="hobbies-heading">
      <div className={styles.heading}>
        <h2 id="hobbies-heading">in my spare time</h2>
        <span>HOBBIES /</span>
      </div>
      <div className={isSplit ? `${split.split} ${styles.split}` : undefined} {...panel.containerProps}>
        <div className={split.items} ref={itemsRef}>
          <ul className={styles.grid}>
            {items.map((hobby, index) => {
              const [featured] = hobby.stats
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
                    <span className={styles.more}>View stats <span aria-hidden="true">→</span></span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        {selected && (
          <DetailPanel
            detail={isCubing ? { ...toDetail(selected), stats: cubingView.stats, note: cubingView.note } : toDetail(selected)}
            itemKey={selected.id}
            id={panel.panelId}
            titleId={panel.panelTitleId}
            panelRef={panelRef}
            onClose={panel.close}
            contentClassName={isCubing ? cubingStyles.detail : undefined}
            beforeStats={isCubing ? <CubingControls source={cubingSource} eventId={cubingEvent} snapshot={cubingSnapshot}
              onSourceChange={setCubingSource} onEventChange={setCubingEvent}
              emptyMessage={cubingView.emptyMessage} announcement={cubingView.announcement} /> : undefined}
            afterStats={isCubing ? <>
              <CubingExtras stats={cubingView.extraStats} />
              <CubingProgression key={`${cubingSource}-${cubingEvent}`} histories={cubingView.progression}
                metrics={cubingView.progressionMetrics} updatedAt={cubingView.updatedAt} />
            </> : undefined}
          />
        )}
      </div>
    </section>
  )
}
