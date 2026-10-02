import terrariumIcon from '../assets/terrarium.svg'
import wayfinderIcon from '../assets/wayfinder.svg'
import experimentsIcon from '../assets/experiments.svg'
import type { CardItem, Detail } from './types'

export const notes: Detail = {
  kicker: 'FIELD NOTES / 001',
  title: 'Leave room for wandering.',
  description: 'The best ideas tend to show up somewhere between focused work and a long walk. This is a place for those small discoveries — a future collection of notes on building, learning, and paying attention.',
}

export const contact: Detail = {
  kicker: 'LET’S MAKE SOMETHING GOOD',
  title: 'Start a conversation.',
  description: 'A welcoming little clearing for new ideas and interesting collaborations. In your own portfolio, this is where your email address and social links would live.',
}

export const projects: CardItem[] = [
  {
    id: 'terrarium',
    title: 'Terrarium',
    summary: 'Small tools. A calmer digital life.',
    visual: { type: 'image', src: terrariumIcon },
    detail: {
      kicker: 'SELECTED WORK / 01',
      title: 'Terrarium',
      description: 'A concept for a quieter set of digital tools. Small, useful, and built with care. Replace this project with a case study, the problem you explored, and the little details that made the result special.',
    },
  },
  {
    id: 'wayfinder',
    title: 'Wayfinder',
    summary: 'Finding the interesting way forward.',
    visual: { type: 'image', src: wayfinderIcon },
    detail: {
      kicker: 'SELECTED WORK / 02',
      title: 'Wayfinder',
      description: 'An exploration of finding your own path. A placeholder for a project that connects thoughtful design with a useful technical idea — and a story about what you learned along the way.',
    },
  },
  {
    id: 'experiments',
    title: 'The experiment patch',
    summary: 'Play, prototypes, and happy accidents.',
    visual: { type: 'image', src: experimentsIcon },
    detail: {
      kicker: 'SELECTED WORK / 03',
      title: 'The experiment patch',
      description: 'Every garden needs a corner where things can grow wild. A home for creative coding, playful prototypes, unfinished ideas, and the occasional happy accident.',
    },
  },
]
