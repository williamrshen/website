export type DetailLink = {
  label: string
  href: string
}

/** Content for the shared modal dialog. Optional fields render only when present. */
export type Detail = {
  kicker: string
  title: string
  subtitle?: string
  description?: string
  bullets?: string[]
  tags?: string[]
  link?: DetailLink
}

export type OpenDetail = (detail: Detail) => void

export type CardVisual =
  | { type: 'image'; src: string }
  | { type: 'monogram'; text: string }

export type CardItem = {
  id: string
  title: string
  summary: string
  visual: CardVisual
  detail: Detail
}
