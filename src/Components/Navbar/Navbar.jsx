import React, { useState } from 'react'
import './Navbar.css'
import logo from '../../assets/logo.svg'
import ul from '../../assets/ul.png'
import underline from '../../assets/nav_underline.svg'
import new_underline from '../../assets/underline.png'


import AnchorLink from 'react-anchor-link-smooth-scroll'
import { Link } from 'react-router'

const Navbar = () => {

  const [menu,setMenu] = useState("home");


  return (
    <div className='navbar'>
        <img src={ul} alt="" />
        <ul className="nav-menu">
            <li><AnchorLink className='anchor-link' offset={150} href='#home'><Link className='anchor-link' to="/website/"><p onClick={()=>setMenu("home")}>home</p></Link></AnchorLink> 
                {menu==="home" ? <img src={new_underline}/> : <></>}</li>
            <li><AnchorLink className='anchor-link' offset={130} href='#about'><Link className='anchor-link' to="/website/"><p onClick={()=>setMenu("about")}>about me</p></Link></AnchorLink> 
                {menu==="about" ? <img src={new_underline}/> : <></>}</li>
            <li><AnchorLink className='anchor-link' offset={130} href='#portfolio'><Link className='anchor-link' to="/website/"><p onClick={()=>setMenu("portfolio")}>my stuff</p></Link></AnchorLink> 
                {menu==="portfolio" ? <img src={new_underline}/> : <></>}</li>
            <li><AnchorLink className='anchor-link' offset={130} href='#contact'><Link className='anchor-link' to="/website/"><p onClick={()=>setMenu("contact")}>contact</p></Link></AnchorLink> 
                {menu==="contact" ? <img src={new_underline}/> : <></>}</li>
            
            
            <li><Link className='anchor-link' to="/website/cubing"><p onClick={()=>setMenu("resources")}>resources</p></Link> {menu==="resources" ? <img src={new_underline}/> : <></>}</li>
        </ul>
        
        <div className="nav-connect">
          <AnchorLink className='anchor-link' offset={110} href='#contact'>
            connect with me
            </AnchorLink>
        </div>
    </div>
  )
}

export default Navbar
