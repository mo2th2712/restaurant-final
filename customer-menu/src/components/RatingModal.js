import React, { useState } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import './RatingModal.css';

const API_URL = 'http://localhost:5000/api';
Modal.setAppElement('#root');

function RatingModal({ isOpen, onRequestClose, orderId, language }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0); 
  const [comment, setComment] = useState(''); 
  const [message, setMessage] = useState('');

  const getText = (ar, en) => {
    return language === 'ar' ? ar : en || ar;
  };

  const submitRating = async () => {
    if (rating === 0) {
      setMessage(getText('الرجاء اختيار تقييم (1-5 نجوم)', 'Please select a rating (1-5 stars)'));
      return;
    }
    try {
      await axios.put(`${API_URL}/orders/${orderId}/rate`, { 
        rating: rating,
        ratingComment: comment 
      });
      setMessage(getText('شكراً لتقييمك!', 'Thank you for your feedback!'));
      setTimeout(() => {
        onRequestClose();
        setMessage('');
        setRating(0);
        setComment(''); 
      }, 2000);
    } catch (err) {
      setMessage(err.response?.data?.msg || getText('حدث خطأ أثناء إرسال التقييم.', 'An error occurred while sending the rating.'));
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} className="modal-content rating-modal" overlayClassName="modal-overlay">
      <div className="modal-header">
        <h2>{getText('كيف كان طلبك؟', 'How was your order?')}</h2>
        <p>{getText('نحن نقدر رأيك لمساعدتنا على التحسن.', 'We appreciate your feedback to help us improve.')}</p>
      </div>
      <div className="modal-body">
        {message ? (
          <div className="rating-message">{message}</div>
        ) : (
          <>
            <div className="star-rating">
              {[...Array(5)].map((star, index) => {
                const ratingValue = index + 1;
                return (
                  <button type="button" key={ratingValue} className={ratingValue <= (hover || rating) ? "star-on" : "star-off"}
                    onClick={() => setRating(ratingValue)}
                    onMouseEnter={() => setHover(ratingValue)}
                    onMouseLeave={() => setHover(0)}
                  >
                    <span className="star">&#9733;</span> 
                  </button>
                );
              })}
            </div>
            <textarea 
              className="rating-comment-box"
              placeholder={getText('ما الذي يمكننا تحسينه؟ (اختياري)', 'What can we improve? (Optional)')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <button onClick={submitRating} className="submit-rating-btn"> {getText('إرسال التقييم', 'Send Rating')} </button>
          </>
        )}
      </div>
      <button onClick={onRequestClose} className="close-rating-btn"> {getText('إغلاق', 'Close')} </button>
    </Modal>
  );
}
export default RatingModal;