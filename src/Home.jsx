import React from 'react'
import Hero from './Components/Hero/Hero'
import About from './Components/About/About'
import Portfolio from './Components/Portfolio/Portfolio'
import Contact from './Components/Contact/Contact'



const Home = () => {
  return (
    <div>
        <Hero/>
        <About/>
        <Portfolio/>
        <Contact/>
    </div>
  )
}

export default Home
