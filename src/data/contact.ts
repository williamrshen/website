import type { ContactLink, Detail } from './types'

export const contactLinks: ContactLink[] = [
  { kind: 'email', label: 'Email', value: 'w22shen@uwaterloo.ca', href: 'mailto:w22shen@uwaterloo.ca' },
  { kind: 'linkedin', label: 'LinkedIn', value: 'in/williamrshen', href: 'https://www.linkedin.com/in/williamrshen/' },
  { kind: 'github', label: 'GitHub', value: 'williamrshen', href: 'https://github.com/williamrshen' },
]

export const contact: Detail = {
  kicker: 'SAY HELLO',
  title: 'Let’s chat!',
  description: 'Feel free to message me about anything.',
  contacts: contactLinks,
}
