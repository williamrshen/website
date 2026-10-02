export type DetailLink = {
  label: string
  href: string
}

export type Stat = {
  label: string
  value: string
  detail?: string
}

export type HistorySeries = {
  label: string
  points: { label: string; value: number }[]
}

/** Content for the shared modal dialog. Optional fields render only when present. */
export type Detail = {
  kicker: string
  title: string
  subtitle?: string
  description?: string
  bullets?: string[]
  tags?: string[]
  stats?: Stat[]
  history?: HistorySeries
  link?: DetailLink
  note?: string
}

export type OpenDetail = (detail: Detail) => void

export type CardVisual =
  | { type: 'image'; src: string }
  | { type: 'monogram'; text: string }

export type Hobby = {
  id: string
  title: string
  eyebrow: string
  blurb: string
  stats: Stat[]
  history?: HistorySeries
  link?: DetailLink
}

export type CardItem = {
  id: string
  title: string
  summary: string
  visual: CardVisual
  detail: Detail
}
