import type { CardItem } from './types'

type Role = {
  id: string
  role: string
  company: string
  time: string
  url: string
  bullets: string[]
  tags: string[]
}

// Most recent first. The first three are shown before expanding.
const roles: Role[] = [
  {
    id: 'geotab',
    role: 'Software Development Intern',
    company: 'Geotab',
    time: 'Current',
    url: 'https://www.geotab.com/',
    // TODO: replace this placeholder with dates, team, highlights, and tags.
    bullets: ['Role details coming soon.'],
    tags: [],
  },
  {
    id: 'sun-life',
    role: 'SQL Server/Infrastructure DBA',
    company: 'Sun Life',
    time: 'Fall 2025',
    url: 'https://www.sunlife.com/',
    bullets: [
      'Automated mapping of 400+ CIS standards to Imperva scans with OpenPyXL in Python for MongoDB, MSSQL, PostgreSQL, Oracle, MySQL — reducing manual compliance review time by 70%',
      'Developed Splunk dashboards for MSSQL, Guardium Data Encryption, and Oracle Key Vault with 30+ panels monitoring suspicious logins, high traffic, and backup errors',
      'Scripted Active Directory functional ID expiry monitoring in PowerShell, querying attributes via SQL for 600+ accounts across DEV, UAT, STAGE, and PROD environments',
      'Researched and proposed Governance & Compliance AI Agent for Continuous Improvement, presenting feasibility, implementation, and impacts to senior leadership',
    ],
    tags: ['SQL Server', 'Python', 'PowerShell', 'Splunk', 'Active Directory', 'Imperva'],
  },
  {
    id: 'code-ninjas',
    role: 'Code Sensei / App Developer',
    company: 'Code Ninjas',
    time: 'Winter 2025',
    url: 'https://www.codeninjas.com/',
    bullets: [
      'Developed full-stack app using Next.js, Tailwind CSS, and Firebase to display student session statistics—implemented CRUD functions on admin page, and grid display on session display page',
      'Taught various levels of game development (scripting, tilemap and sprite design, etc.) on platforms such as Microsoft MakeArcade, Roblox Studio, and Unity, to 70+ kids aged 5-12 every week',
      'Updated incomplete product information on Shopify using Shopify API for 400+ items automatically',
      'Standardized formatting of human inputted times on Excel spreadsheet automatically using regex and csv in Python, to improve data entry time by 109%',
    ],
    tags: ['Unity', 'Roblox', 'JavaScript', 'C#', 'Game Development'],
  },
  {
    id: 'young-engineers',
    role: 'Robotics Camp Supervisor',
    company: 'Young Engineers',
    time: 'Summer 2024',
    url: 'https://youngengineers.org/',
    bullets: [
      'Developed and taught engineering/STEM curriculum for children ages 4–10',
      'Managed 15+ counselors across camp sessions',
      'Guided 100+ students in robotics and programming projects',
      'Designed daily lessons, crafts, and activities around robotics and engineering principles',
    ],
    tags: ['STEM', 'Curriculum Design', 'Team Management', 'Robotics'],
  },
]

const monogram = (company: string) => company.split(' ').map((word) => word[0]).join('').slice(0, 2)

export const experience: CardItem[] = roles.map((role) => ({
  id: role.id,
  title: role.role,
  summary: `${role.company} · ${role.time}`,
  // Placeholder visual until company artwork is chosen.
  visual: { type: 'monogram', text: monogram(role.company) },
  detail: {
    kicker: `EXPERIENCE · ${role.time.toUpperCase()}`,
    title: role.role,
    subtitle: role.company,
    bullets: role.bullets,
    tags: role.tags,
    link: { label: `Visit ${role.company}`, href: role.url },
  },
}))
