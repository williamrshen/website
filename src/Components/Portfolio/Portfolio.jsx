import { React, useState } from "react";
import Popup from "reactjs-popup";
import "./Portfolio.css";
import portfolio from "../../assets/mywork_data";
import rectangle from "../../assets/rectangle.svg";

const Portfolio = () => {
	return (
		<div id="portfolio" className="portfolio">
			<div className="portfolio-title">
				<h1>what i've done</h1>
				<img src={rectangle} alt="" />
			</div>
			<div className="portfolio-container">
				{portfolio.map((work, index) => {
					return (
						<div
							href={work.link}
							target="_blank"
							key={index}
							className="portfolio-item"
						>
							<a href={work.link} target="_blank" className="portfolio-item">
								<img src={work.img} alt="" />
							</a>
							<div className="portfolio-item-text">
								<h4>{work.time}</h4>
								<h1>{work.name}</h1>
								<p>{work.desc}</p>
								<Popup
									display="center"
									position="right center"
									trigger={
										<button onClick={(e) => e.preventDefault()}> more </button>
									}
									className="portfolio-button"
									modal
									nested
								>
									{(close) => (
										<div className="portfolio-popup-item">
											<img src={work.img} alt="" />
											<h1>{work.name}</h1>
											<p>{work.para}</p>
											<button onClick={close}> close </button>
										</div>
									)}
								</Popup>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default Portfolio;
