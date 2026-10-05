import type { Detail } from '../data/types'
import { ContactIcon } from './ContactIcon'
import { Sparkline } from './Sparkline'
import styles from './DetailContent.module.css'

type Props = {
  detail: Detail
  /** id for the title, so a dialog or region can point aria-labelledby at it. */
  titleId: string
  /** id for the description, if the container wants aria-describedby. */
  descriptionId?: string
  headingLevel?: 2 | 3
}

/** Shared body for a Detail: used by the modal dialog and the inline detail panel. */
export function DetailContent({ detail, titleId, descriptionId, headingLevel = 2 }: Props) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  const external = detail.link && /^https?:/.test(detail.link.href)

  return (
    <div className={styles.content}>
      <span className={styles.kicker}>{detail.kicker}</span>
      <Heading className={styles.title} id={titleId}>{detail.title}</Heading>
      {detail.subtitle && <p className={styles.subtitle}>{detail.subtitle}</p>}
      {detail.description && <p className={styles.description} id={descriptionId}>{detail.description}</p>}
      {detail.bullets && detail.bullets.length > 0 && (
        <ul className={styles.bullets}>{detail.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
      )}
      {detail.stats && detail.stats.length > 0 && (
        <dl className={styles.stats}>
          {detail.stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>
                <span className={styles.statValue}>{stat.value}</span>
                {stat.detail && <span className={styles.statDetail}>{stat.detail}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {detail.history && <Sparkline series={detail.history} />}
      {detail.contacts && detail.contacts.length > 0 && (
        <ul className={styles.contacts}>
          {detail.contacts.map((contact) => {
            const isWeb = /^https?:/.test(contact.href)
            return (
              <li key={contact.kind}>
                <a href={contact.href} {...(isWeb ? { target: '_blank', rel: 'noreferrer' } : {})}>
                  <span className={styles.contactIcon}><ContactIcon kind={contact.kind} /></span>
                  <span className={styles.contactText}>
                    <span className={styles.contactLabel}>{contact.label}</span>
                    <span className={styles.contactValue}>{contact.value}</span>
                  </span>
                  <span className={styles.contactArrow} aria-hidden="true">↗</span>
                  {isWeb && <span className={styles.visuallyHidden}> (opens in a new tab)</span>}
                </a>
              </li>
            )
          })}
        </ul>
      )}
      {detail.tags && detail.tags.length > 0 && (
        <ul className={styles.tags} aria-label="Skills and tools">
          {detail.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
      )}
      {detail.link && (
        <a
          className={styles.link}
          href={detail.link.href}
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          {detail.link.label} <span aria-hidden="true">↗</span>
          {external && <span className={styles.visuallyHidden}> (opens in a new tab)</span>}
        </a>
      )}
      {detail.note && <p className={styles.note}>{detail.note}</p>}
    </div>
  )
}
