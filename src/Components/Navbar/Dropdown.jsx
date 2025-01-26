import React from 'react'
import { Link } from 'react-router'
import './Dropdown.css'

const Dropdown = () => {
  return (
    <div className="menu">
        <div className="button">resources</div>
        <div className="options">
            <Link className="option" to="/website/cubing">cubing</Link>
            <Link className="option" to="/website/coding">coding</Link>
        </div>
    </div>
  )
}

export default Dropdown
