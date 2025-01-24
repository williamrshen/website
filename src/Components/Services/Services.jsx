import React from 'react'
import './Services.css'
import theme_pattern from '../../assets/theme_pattern.svg'
import Services_Data from '../../assets/services_data'
import arrow from '../../assets/arrow_icon.svg'
import rectangle from '../../assets/rectangle.svg'


const Services = () => {
  return (
    <div id='services' className='services'>
        <div className="services-title">
            <h1>
                things i can do for you
            </h1>
            <img src={rectangle} alt="" />
        </div>
        <div className="services-container">
            {Services_Data.map((service, index) => {
                return <div key={index} className="services-format">
                    <h3>{service.s_no}</h3>
                    <h2>{service.s_name}</h2>
                    <p>{service.s_desc}</p>
                    <div className="services-readmore">
                        <p>learn more</p>
                        <img src={arrow} alt="" />
                    </div>
                </div>
            })}
        </div>
    </div>
  )
}

export default Services
