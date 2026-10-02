import { projects, type OpenStory } from '../data/portfolio'
import styles from './ProjectSection.module.css'

export function ProjectSection({ onOpenStory }: { onOpenStory: OpenStory }) {
  return (
    <section className={styles.work} id="work" aria-labelledby="work-heading">
      <div className={styles.heading}>
        <h2 id="work-heading">A few things I've grown</h2><span>SELECTED WORK / 01—03</span>
      </div>
      <div className={styles.projects}>
        {projects.map((project) => (
          <button className={styles.project} key={project.key} onClick={() => onOpenStory(project.key)}>
            <span className={styles.icon}><img src={project.icon} alt="" /></span>
            <span><span className={styles.title}>{project.title}</span><span className={styles.description}>{project.description}</span></span>
            <span className={styles.arrow} aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
    </section>
  )
}
