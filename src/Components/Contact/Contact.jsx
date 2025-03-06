import React from "react";
import "./Contact.css";
import rectangle from "../../assets/rectangle.svg";

import { CiLocationOn } from "react-icons/ci";
import { CiLinkedin } from "react-icons/ci";
import { CiMail } from "react-icons/ci";
import { RxDiscordLogo } from "react-icons/rx";

const Contact = () => {
	const onSubmit = async (event) => {
		event.preventDefault();
		const formData = new FormData(event.target);

		formData.append("access_key", "f9092d1c-1910-4694-89c6-32e08fff4869");

		const object = Object.fromEntries(formData);
		const json = JSON.stringify(object);

		const res = await fetch("https://api.web3forms.com/submit", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: json,
		}).then((res) => res.json());

		if (res.success) {
			alert(res.message);
		}
	};

	return (
		<div id="contact" className="contact">
			<div className="contact-title">
				<h1>contact me</h1>
				<img src={rectangle} alt="" />
			</div>
			<div className="contact-section">
				<div className="contact-left">
					<h1>let us chat!</h1>
					<p>feel free to message me about anything</p>
					<div className="contact-details">
						<a
							href="mailto:williamshen85@gmail.com"
							target="_blank"
							className="contact-detail"
						>
							<CiMail />
							<p>williamshen85@gmail.com</p>
						</a>
						<a
							href="https://www.linkedin.com/in/williamrshen/"
							target="_blank"
							className="contact-detail"
						>
							<CiLinkedin />
							<p>williamrshen</p>
						</a>
						<a
							href="https://discord.com/users/386158824220000267"
							target="_blank"
							className="contact-detail"
						>
							<RxDiscordLogo />
							<p>uselessleaf</p>
						</a>
						<div className="contact-detail">
							<CiLocationOn />
							<p>toronto, ontario</p>
						</div>
					</div>
				</div>
				<form onSubmit={onSubmit} className="contact-right">
					<label htmlFor="">your name</label>
					<input type="text" placeholder="enter your name" name="name" />
					<label htmlFor="">your email</label>
					<input type="email" placeholder="enter your email" name="email" />
					<label htmlFor="">write your message!</label>
					<textarea
						name="message"
						rows="8"
						placeholder="your message"
					></textarea>
					<button type="submit" className="contact-submit">
						submit
					</button>
				</form>
			</div>
		</div>
	);
};

export default Contact;
