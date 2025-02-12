import React, { useState } from 'react'
import './Navbar.css'
import ul from '../../assets/ul.png'
import new_underline from '../../assets/underline.png'
import Dropdown from './Dropdown'


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
            
            
            <li><Link className='anchor-link' to="/website/resources"><p onClick={()=>setMenu("resources")}>{<Dropdown/>}</p></Link> {menu==="resources" ? <img src={new_underline}/> : <></>}</li>
            {/* <li><Link className='anchor-link' to="/website/blog"><p onClick={()=>setMenu("blog")}>blog</p></Link> {menu==="blog" ? <img src={new_underline}/> : <></>}</li> */}

        </ul>
        
        <div className="nav-connect" onClick={()=>setMenu("contact")}>
          <AnchorLink className='anchor-link' offset={110} href='#contact'>
            <Link className='anchor-link' to="/website/">
                connect with me
            </Link>
          </AnchorLink>
        </div>
    </div>
  )
}

export default Navbar
