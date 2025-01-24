import React from 'react'
import './Portfolio.css'
import theme_pattern from '../../assets/theme_pattern.svg'
import portfolio from '../../assets/mywork_data'
import arrow from '../../assets/arrow_icon.svg'
import rectangle from '../../assets/rectangle.svg'


const Portfolio = () => {
  return (
    <div id='portfolio' className="portfolio">
        <div className="portfolio-title">
            <h1>
                my projects
            </h1>
            <img src={rectangle} alt="" />
        </div>
        <div className="portfolio-container">
            {portfolio.map((work, index) => {
                return (
                    <a href="https://www.youtube.com/@uselessleaf" target="_blank" key={index} className="portfolio-item">
                        <img  src={work.img} alt="" />
                        <div className="portfolio-item-text">
                            <h2>{work.no}</h2>
                            <h1>{work.name}</h1>
                            <p>{work.desc}</p>
                        </div>
                    </a>
                )
            })}
        </div>
        {/* <div className="portfolio-showmore">
            <p>show more</p>
            <img src={arrow} alt="" />
        </div> */}
    </div>
  )
}

export default Portfolio
