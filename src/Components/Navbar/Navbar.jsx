import React, { useState } from 'react'
import './Navbar.css'
import logo from '../../assets/logo.svg'
import ul from '../../assets/ul.png'
import underline from '../../assets/nav_underline.svg'
import new_underline from '../../assets/underline.png'


import AnchorLink from 'react-anchor-link-smooth-scroll'

const Navbar = () => {

  const [menu,setMenu] = useState("home");


  return (
    <div className='navbar'>
        <img src={ul} alt="" />
        <ul className="nav-menu">
            <li><AnchorLink className='anchor-link' offset={150} href='#home'><p onClick={()=>setMenu("home")}>home</p></AnchorLink> {menu==="home" ? <img src={new_underline}/> : <></>}</li>
            <li><AnchorLink className='anchor-link' offset={130} href='#about'><p onClick={()=>setMenu("about")}>about me</p></AnchorLink> {menu==="about" ? <img src={new_underline}/> : <></>}</li>
            <li><AnchorLink className='anchor-link' offset={130} href='#portfolio'><p onClick={()=>setMenu("portfolio")}>my stuff</p></AnchorLink> {menu==="portfolio" ? <img src={new_underline}/> : <></>}</li>
            <li><AnchorLink className='anchor-link' offset={130} href='#contact'><p onClick={()=>setMenu("contact")}>contact</p></AnchorLink> {menu==="contact" ? <img src={new_underline}/> : <></>}</li>
            
            
            <li><AnchorLink className='anchor-link' offset={110} href='#resources'><p onClick={()=>setMenu("resources")}>resources</p></AnchorLink> {menu==="resources" ? <img src={new_underline}/> : <></>}</li>
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
