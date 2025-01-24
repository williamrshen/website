import React from 'react'
import './Contact.css'
import theme_pattern from '../../assets/theme_pattern.svg'
import mail_icon from '../../assets/mail_icon.svg'
import location_icon from '../../assets/location_icon.svg'
import call_icon from '../../assets/call_icon.svg'
import rectangle from '../../assets/rectangle.svg'


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
            Accept: "application/json"
          },
          body: json
        }).then((res) => res.json());
    
        if (res.success) {
          alert(res.message);
        }
        
      };

  return (
    <div id='contact' className='contact'>
        <div className="contact-title">
            <h1>contact me</h1>
            <img src={rectangle} alt="" />
        </div>
        <div className="contact-section">
            <div className="contact-left">
                <h1>let us chat!</h1>
                <p>feel free to message me about anything tbh</p>
                <div className="contact-details">
                    <div className="contact-detail">
                        <img src={mail_icon} alt="" />
                        <p>williamshen85@gmail.com</p>
                    </div>
                    <div className="contact-detail">
                    <img src={location_icon} alt="" />
                    <p>Toronto, Ontario</p>
                    </div>
                </div>
            </div>
            <form onSubmit={onSubmit} className="contact-right">
                <label htmlFor="">your name</label>
                <input type="text" placeholder='enter your name' name='name'/>
                <label htmlFor="">your email</label>
                <input type="email" placeholder='enter your email' name='email'/>
                <label htmlFor="">write your message!</label>
                <textarea name="message" rows="8" placeholder='your message'></textarea>
                <button type='submit' className="contact-submit">
                    submit
                </button>
            </form>
        </div>
    </div>
  )
}

export default Contact
