import React from 'react'
import Navbar from './Components/Navbar/Navbar'
import Home from './Home'
import Footer from './Components/Footer/Footer'
import Cubing from './Components/Resources/Cubing/Cubing'

import { Route, Routes } from "react-router-dom";



const App = () => {
  return (
    <div>
        <Navbar />
            <Routes>
                <Route path="/website" element={<Home />} />
                <Route path="/cubing" element={ <Cubing /> } />
            </Routes>
        <Footer />
    </div>
  )
}

export default App
