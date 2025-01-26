import React from 'react'
import Navbar from './Components/Navbar/Navbar'
import Home from './Home'
import Footer from './Components/Footer/Footer'

import { Route, Routes } from "react-router-dom";



const App = () => {
  return (
    <div>
        <Navbar />

        <Home />
        <Footer />
    </div>
  )
}

export default App
