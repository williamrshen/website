import React from 'react'
import './About.css'
import theme_pattern from '../../assets/theme_pattern.svg'
import rectangle from '../../assets/rectangle.svg'
import profile_img from '../../assets/about_profile.svg'
import sable from '../../assets/japanese sable.png'

const About = () => {
  return (
    <div id='about' className='about'>
        <div className="about-title">
            <h1>about me</h1>
            <img src={rectangle} alt="" />
        </div>
        <div className="about-section">
            <div className="about-left">
                <img src={sable} alt="" />
            </div>
            <div className="about-right">
                <div className="about-paragraph">
                    <p>hi! i'm william shen, second year mathematics student at the university of waterloo. looking to pursue a specialization in computational mathematics, along with a minor
                        in combinatorics and optimization. nice to meet you!
                    </p>
                </div>
                <div className="about-skills">
                    <div className="about-skill">
                        <p>coding</p><hr style={{width:"100px"}}/>      
                    </div>
                    <div className="about-skill">
                        <p>cubing</p><hr style={{width:"30px"}}/>
                    </div>
                </div>
            </div>
        </div>
        <div className="about-achievements">
            <div className="about-achievement">
                <h1>20.5k+</h1>
                <p>tr in tetr.io</p>
            </div>
            <hr/>
            <div className="about-achievement">
                <h1>30k+</h1>
                <p>trophies in brawl stars</p>
            </div>
            <hr/>
            <div className="about-achievement">
                <h1>top 10</h1>
                <p>peak canadian rank in table tennis</p>
            </div>
        </div>
    </div>
  )
}

export default About
