import { React, useState, useEffect } from "react";
import Navbar from "./Components/Navbar/Navbar";
import Home from "./Home";
import Footer from "./Components/Footer/Footer";
import Cubing from "./Components/Resources/Cubing/Cubing";
import Coding from "./Components/Resources/Coding/Coding";
import Resources from "./Components/Resources/Resources";
import Blog from "./Components/Blog/Blog";
import Error from "./Components/404Page/pagenotfound";

import { Route, Routes } from "react-router-dom";

const App = () => {
	return (
		<div>
			<Navbar />
			<Routes>
				<Route path="/website/" element={<Home />} />
				<Route path="/website/resources" element={<Resources />} />
				<Route path="/website/cubing" element={<Cubing />} />
				<Route path="/website/coding" element={<Coding />} />
				<Route path="/website/blog" element={<Blog />} />
				<Route path="*" element={<Error />} />
			</Routes>
			<Footer />
		</div>
	);
};

export default App;
