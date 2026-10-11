import { useEffect, useState } from 'react'
import { About } from './components/About'
import { CardSection } from './components/CardSection'
import { DetailDialog } from './components/DetailDialog'
import { Footer } from './components/Footer'
import { GardenExperience } from './components/GardenExperience'
import { HobbySection } from './components/HobbySection'
import { experience } from './data/experience'
import { projects } from './data/projects'
import type { Detail } from './data/types'
import styles from './App.module.css'

const THEME_KEY = 'theme'

function initialEvening() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'evening') return true
    if (saved === 'daylight') return false
  } catch { /* storage unavailable */ }
  const hour = new Date().getHours()
  return hour < 8 || hour >= 18
}

function App() {
  const [evening, setEvening] = useState(initialEvening)
  const [activeDetail, setActiveDetail] = useState<Detail | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = evening ? 'evening' : 'daylight'
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', evening ? '#192a29' : '#f3f2e9',
    )
    return () => { delete document.documentElement.dataset.theme }
  }, [evening])

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#about">Skip to introduction</a>
      <GardenExperience
        evening={evening}
        onToggleTheme={() => {
          const next = !evening
          setEvening(next)
          try { localStorage.setItem(THEME_KEY, next ? 'evening' : 'daylight') } catch { /* ignore */ }
        }}
        onOpenDetail={setActiveDetail}
        dialogOpen={activeDetail !== null}
      />
      <main>
        <About onOpenDetail={setActiveDetail} />
        <CardSection
          id="experience"
          title="where i've worked"
          meta="EXPERIENCE /"
          items={experience}
          itemNoun="roles"
          onOpenDetail={setActiveDetail}
          layout="panel"
        />
        <CardSection
          id="work"
          title="a few things i've grown"
          meta="PROJECTS /"
          items={projects}
          itemNoun="projects"
          onOpenDetail={setActiveDetail}
          layout="panel"
          mirrored
        />
        <HobbySection />
      </main>
      <Footer />
      <div className={styles.grain} aria-hidden="true" />
      <DetailDialog detail={activeDetail} onClose={() => setActiveDetail(null)} />
    </div>
  )
}

export default App
