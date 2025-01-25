import React from 'react'
import './Footer.css'
import footer_logo from '../../assets/footer_logo.svg'
import user_icon from '../../assets/user_icon.svg'
import ul from '../../assets/ul.png'


const Footer = () => {
  return (
    <div className='footer'>
        <div className="footer-top">
            <div className="footer-top-left">
                <img src={ul} alt="" />
                <p>sheesh</p>
            </div>
            {/* <div className="footer-top-right">
                <div className="footer-email-input">
                    <img src={user_icon} alt="" />
                    <input type="email" placeholder='enter your email' />
                </div>
                <div className="footer-subscribe">
                    subscribe
                </div>
            </div> */}
        </div>
        <hr />
        <div className="footer-bottom">
            <p className="footer-bottom-left">
                copyright by me or smth
            </p>
            <div className="footer-bottom-right">
                <p>terms of service?</p>
                <p>connect with me</p>
            </div>
        </div>
    </div>
  )
}

export default Footer
