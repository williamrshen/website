import React from 'react'
import Navbar from './Components/Navbar/Navbar'
import Home from './Home'
import Footer from './Components/Footer/Footer'

import Cubing from './Components/Resources/Cubing/Cubing'
import Coding from './Components/Resources/Coding/Coding'

import { Route, Routes } from 'react-router'



const App = () => {
  return (
    <div>
        <Navbar />
        <Home />
        <Footer/>
    </div>
  )
}

export default App
