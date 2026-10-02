import { useEffect, useState } from 'react'
import { About } from './components/About'
import { Footer } from './components/Footer'
import { GardenExperience } from './components/GardenExperience'
import { ProjectSection } from './components/ProjectSection'
import { StoryDialog } from './components/StoryDialog'
import type { StoryKey } from './data/portfolio'
import styles from './App.module.css'

function App() {
  const [evening, setEvening] = useState(false)
  const [activeStory, setActiveStory] = useState<StoryKey | null>(null)

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
        onOpenStory={setActiveStory}
        dialogOpen={activeStory !== null}
      />
      <main>
        <About onOpenStory={setActiveStory} />
        <ProjectSection onOpenStory={setActiveStory} />
      </main>
      <Footer />
      <div className={styles.grain} aria-hidden="true" />
      <StoryDialog storyKey={activeStory} onClose={() => setActiveStory(null)} />
    </div>
  )
}

export default App
