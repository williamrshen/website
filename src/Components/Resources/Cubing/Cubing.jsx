import React from 'react'
import './Cubing.css'
import '.././Resources.css'
import Cat from '../../../assets/cat2.webp'

const Cubing = () => {
  return (
    <div className="cubing">

        <h1 className="cubing-develop">under development :&#93;</h1>
        <img src={Cat} alt="" className="cubing-banner"/>
        <div className="cubing-description">
            <p>will add some tutorials hopefully, or algs idk</p>
        </div>

    </div>
  )
}

export default Cubing
