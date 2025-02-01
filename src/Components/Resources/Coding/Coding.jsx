import React from "react";
import "./Coding.css";
import ".././Resources.css";
import Cat from "../../../assets/cat.webp";
import AnchorLink from 'react-anchor-link-smooth-scroll'


import MyJourney from "./Entries/MyJourney/MyJourney";

function Entry({ component, date, title, visible, name }) {
	if (visible) {
		return (
			<div className="coding-entry" id={name}>
				<hr />
				<h4>{date}</h4>
				<h1 className="coding-entry-title">{title}</h1>
				<div className="coding-entry-body">{component}</div>
			</div>
		);
	}
}

const Coding = () => {
	return (
		<div className="coding">
			<div className="coding-top">

				<div className="coding-top-left">
					<h1 className="coding-contents-title">
						topics
					</h1>
					<ul className="coding-contents">
						<li><AnchorLink className='anchor-link' offset={100} href='#myjourney'><p>my journey</p></AnchorLink></li>
					</ul>
				</div>
				<div className="coding-top-right">
					<h1 className="coding-develop">coding resources</h1>
					<img src={Cat} alt="" className="coding-banner" />
					<div className="coding-description">
						<p>
							competitive programming guides coming soon. other topics probably
							never lol
						</p>
					</div>
				</div>
			</div>

			<Entry
				component={<MyJourney />}
				date="January 31, 2025"
				title="my journey"
				visible={true}
				name="myjourney"
			/>
		</div>
	);
};

export default Coding;
