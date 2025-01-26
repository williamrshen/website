import React from 'react'
import './Footer.css'
import footer_logo from '../../assets/footer_logo.svg'
import user_icon from '../../assets/user_icon.svg'
import { FaCross } from "react-icons/fa";
import ul from '../../assets/ul.png'


const Footer = () => {
  return (
    <div className='footer'>
        <div className="footer-top">
            <div className="footer-top-left">
                {/* <img src={ul} alt="" /> */}
                <div>
                    <FaCross /> <p>soli deo gloria</p>
                </div>
            </div>
            <div className="footer-top-right">
                <p>But he said to me, <span>“My grace is sufficient for you, for my power is made perfect in weakness.”</span> Therefore I will boast all the more gladly about my weaknesses, so that Christ’s power may rest on me. <br />
                    2 Corinthians 12:9</p>
                {/* <div className="footer-email-input">
                    <img src={user_icon} alt="" />
                    <input type="email" placeholder='enter your email' />
                </div>
                <div className="footer-subscribe">
                    subscribe
                </div> */}
            </div>
        </div>
        <hr />
        <div className="footer-bottom">
            <p className="footer-bottom-left">
                some text
            </p>
            <div className="footer-bottom-right">
                <p>more text</p>
                <p>bottom right corner</p>
            </div>
        </div>
    </div>
  )
}

export default Footer
