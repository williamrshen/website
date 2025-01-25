import React from 'react'
import './Hero.css'
import profile_img from '../../assets/profile_img.svg'
import orangutan from '../../assets/orangutan.jpg'
import AnchorLink from 'react-anchor-link-smooth-scroll'
import resume from "../../assets/Resume.pdf"


const Hero = () => {
  return (
    <div id='home' className='hero'>
        <img src={orangutan} alt=""></img>
        <h1>hi. i'm <span>william shen</span></h1>
        <h2>aka uselessleaf</h2>
        <p>part time - coder, cuber, athlete, musician, gamer</p>
        
        <div className="hero-action">
            <div className="hero-connect">
                <AnchorLink className='anchor-link' offset={110} href='#contact'>
                connect with me
                </AnchorLink>
            </div>
            <div className="hero-resume">
                <a href={resume} download="William Shen - Resume">see my resume</a>
            </div>
        </div>
    </div>
  )
}

export default Hero
