import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import placeholder from '../assets/portrait-placeholder.svg'
import { profile } from '../data/portfolio'
import styles from './Portrait.module.css'

export function Portrait() {
  const [source, setSource] = useState(profile.portraitSrc)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('')
  const objectUrl = useRef<string | null>(null)

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
  }, [])

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setStatus('Please choose an image file.'); return }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    const url = URL.createObjectURL(file)
    objectUrl.current = url
    setLoaded(false)
    setStatus('Opening your local photo…')
    setSource(url)
  }

  return (
    <figure className={styles.portrait}>
      <div className={styles.frame}>
        <img className={styles.placeholder} src={placeholder} alt="Portrait placeholder. Add a photo of William using the button below." hidden={loaded} />
        {source && (
          <img
            key={source}
            id="portrait-image"
            className={styles.image}
            src={source}
            alt={profile.name}
            hidden={!loaded}
            onLoad={() => {
              setLoaded(true)
              setStatus(profile.portraitSrc ? '' : 'Local preview only · choose your photo again after a reload.')
            }}
            onError={() => {
              setLoaded(false)
              setStatus('This image could not be opened. Try a JPG, PNG, or WebP.')
            }}
          />
        )}
        {!profile.portraitSrc && (
          <label className={styles.picker}>
            <input id="portrait-file" type="file" accept="image/*" onChange={selectPhoto} />
            <span>{loaded ? 'CHANGE PHOTO' : 'ADD YOUR PHOTO'}</span><span aria-hidden="true">↗</span>
          </label>
        )}
      </div>
      <figcaption className={styles.caption}><span>01 / THE PERSON BEHIND THE GARDEN</span><span>HELLO, WORLD.</span></figcaption>
      <p className={styles.status} role="status">{status}</p>
    </figure>
  )
}
