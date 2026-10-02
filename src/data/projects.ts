import terrariumIcon from '../assets/terrarium.svg'
import wayfinderIcon from '../assets/wayfinder.svg'
import experimentsIcon from '../assets/experiments.svg'
import type { CardItem, DetailLink } from './types'

type Project = {
  id: string
  name: string
  summary: string
  time: string
  link: DetailLink
  bullets: string[]
  tags: string[]
}

// The first three are shown before expanding.
const entries: Project[] = [
  {
    id: 'communal-catalogue',
    name: 'Communal Catalogue',
    summary: 'Full-stack library management system',
    time: '2025',
    link: { label: 'View on GitHub', href: 'https://github.com/williamrshen/library' },
    bullets: [
      'Designed and developed a full-stack library management system using React Vite and Firebase, empowering small communities to organize, track, and manage book checkouts',
      'Built a webcam ISBN scanner using QuaggaJS to quickly check out books by scanning barcodes, with OpenLibrary API fetching book details automatically',
      'Implemented role-based authentication with Firebase Auth to manage admin access',
    ],
    tags: ['React', 'Firebase', 'JavaScript', 'QuaggaJS', 'APIs'],
  },
  {
    id: 'snowballistic',
    name: 'Snowballistic',
    summary: '2D platformer game made in Unity',
    time: '2025',
    link: { label: 'Play on itch.io', href: 'https://grakp.itch.io/snowballistic' },
    bullets: [
      'Built at Waterloo Game Jam 2025 in Unity over a weekend',
      'Implemented snowball shooting mechanics, menu navigation, and sound effects',
      'Designed UI/UX for the full game experience',
    ],
    tags: ['Unity', 'C#', 'UI/UX'],
  },
  {
    id: 'competitive-programming',
    name: 'Competitive Programming',
    summary: 'Former solver and problem setter, now teacher',
    time: '2019 – 2025',
    link: { label: 'View DMOJ profile', href: 'https://dmoj.ca/user/uselessleaf' },
    bullets: [
      'Active DMOJ community member and problem setter',
      'Problem set in the largest contest on DMOJ',
      'Participated in CCC Senior twice, received distinction award both times',
      'Now teaching competitive programming to students',
    ],
    tags: ['C++', 'Python', 'Algorithms', 'DMOJ', 'CCC'],
  },
  {
    id: 'gendentify',
    name: 'Gendentify',
    summary: 'Hack the North 2024 — gender prediction ML app',
    time: '2024',
    link: { label: 'View on GitHub', href: 'https://github.com/williamrshen/hackthenorth2' },
    bullets: [
      'Designed and developed a full-stack web app using React, Flask, and scikit-learn to predict gender from a given name',
      'Built a React.js frontend to capture user input, integrated with a Flask backend API that returns predictions in real time',
      'Integrated MongoDB for storing user inputs and predictions, managing data persistence on the backend',
      'Trained a gender prediction model with scikit-learn on a dataset of 150,000 names',
    ],
    tags: ['React', 'Flask', 'Python', 'scikit-learn', 'MongoDB', 'Machine Learning'],
  },
  {
    id: 'youtube',
    name: 'YouTube Channel',
    summary: 'A variety of games',
    time: '2020 – Present',
    link: { label: 'Visit YouTube channel', href: 'https://www.youtube.com/@uselessleaf' },
    bullets: [
      'Edited shorts, montages, compilations, and gameplay videos',
      'Grew active presence in ZombsRoyale.io and TETR.IO communities',
      'Connected with content creators and fellow gamers',
    ],
    tags: ['Video Editing', 'Content Creation', 'Gaming'],
  },
]

// Placeholder artwork rotates until each project gets its own image.
const placeholderIcons = [terrariumIcon, wayfinderIcon, experimentsIcon]

export const projects: CardItem[] = entries.map((project, index) => ({
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
