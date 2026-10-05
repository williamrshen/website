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

function App() {
  const [evening, setEvening] = useState(false)
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
        onToggleTheme={() => setEvening((value) => !value)}
        onOpenDetail={setActiveDetail}
        dialogOpen={activeDetail !== null}
      />
      <main>
        <About onOpenDetail={setActiveDetail} />
        <CardSection
          id="experience"
          title="Where I've worked"
          meta="EXPERIENCE /"
          items={experience}
          itemNoun="roles"
          onOpenDetail={setActiveDetail}
          layout="panel"
        />
        <CardSection
          id="work"
          title="A few things I've grown"
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
