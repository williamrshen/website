import terrariumIcon from '../assets/terrarium.svg'
import wayfinderIcon from '../assets/wayfinder.svg'
import experimentsIcon from '../assets/experiments.svg'
import { projectEntries } from './projectEntries'
import type { CardItem } from './types'

// Placeholder artwork rotates until each project gets its own image.
const placeholderIcons = [terrariumIcon, wayfinderIcon, experimentsIcon]

export const projects: CardItem[] = projectEntries.map((project, index) => ({
  id: project.id,
  title: project.name,
  summary: project.summary,
  visual: { type: 'image', src: placeholderIcons[index % placeholderIcons.length] },
  detail: {
    kicker: `PROJECT · ${project.time.toUpperCase()}`,
    title: project.name,
    subtitle: project.summary,
    bullets: project.bullets,
    tags: project.tags,
    link: project.link,
  },
}))
