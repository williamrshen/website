import React from 'react'
import './Portfolio.css'
import portfolio from '../../assets/mywork_data'
import rectangle from '../../assets/rectangle.svg'


const Portfolio = () => {
  return (
    <div id='portfolio' className="portfolio">
        <div className="portfolio-title">
            <h1>
                what i've done
            </h1>
            <img src={rectangle} alt="" />
        </div>
        <div className="portfolio-container">
            {portfolio.map((work, index) => {
                return (
                    <a href={work.link} target="_blank" key={index} className="portfolio-item">
                        <img  src={work.img} alt="" />
                        <div className="portfolio-item-text">
                            <h4>{work.time}</h4>
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
