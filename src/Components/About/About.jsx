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
                        <div className="about-skill-top">
                            <p>coding</p><hr style={{width:"30%"}}/>      
                        </div>
                        <div className="about-skill-drop">
                            <p>competitive programming - c++, python. many data structures and algorithms.</p>
                            <p>development - html, css, js, react, wix</p>
                        </div>
                    </div>
                    <div className="about-skill">
                        <div className="about-skill-top">
                            <p>cubing</p><hr style={{width:"60%"}}/>
                        </div>
                        <div className="about-skill-drop">
                            <p>cfop solver. 3x3 main</p>
                            <p>single: 4.89, ao5: 7.62, ao12: 8.63</p>
                        </div>
                    </div> 
                    <div className="about-skill">
                        <div className="about-skill-top">
                            <p>table tennis</p><hr style={{width:"45%"}}/>
                        </div>
                        <div className="about-skill-drop">
                            <p>former provincial team player</p>
                            <p>3 time singles bronze medalist at ontario championships. peaked 11th in canada</p>
                        </div>
                    </div> 
                    <div className="about-skill">
                        <div className="about-skill-top">
                            <p>tetris</p><hr style={{width:"80%"}}/>
                        </div>
                        <div className="about-skill-drop">
                            <p>modern tetris on tetr.io, jstris</p>
                            <p>~21000 tr. top 1500 global, top 100 national</p>
                        </div>
                    </div> 
                </div>
            </div>
        </div>
        <div className="about-achievements">
            <a href="https://ch.tetr.io/u/uselessleaf" target="_blank" className="about-achievement">
                <h1>20.5k+</h1>
                <p>tr in tetr.io</p>
            </a>
            <hr/>
            <a href="https://brawlstats.com/profile/9QRPJ8CYY" target="_blank" className="about-achievement">
                <h1>30k+</h1>
                <p>trophies in brawl stars</p>
            </a>
            <hr/>
            <div className="about-achievement">
                <h1>top 15</h1>
                <p>peak canadian rank in table tennis</p>
            </div>
        </div>
    </div>
  )
}

export default About
