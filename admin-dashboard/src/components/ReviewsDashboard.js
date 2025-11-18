import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './ReviewsDashboard.css';

const API_URL = 'http://localhost:5000/api/analytics/reviews';

function ReviewsDashboard() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('authToken');
        return { headers: { Authorization: `Bearer ${token}` } };
    }, []);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const response = await axios.get(API_URL, getAuthHeaders());
                setReviews(response.data);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, [getAuthHeaders]);

    // دالة مساعدة لرسم النجوم
    const renderStars = (rating) => {
        return [...Array(5)].map((_, index) => (
            <span key={index} className={index < rating ? "star filled" : "star"}>★</span>
        ));
    };

    if (loading) return <div className="loading-msg">جاري تحميل التقييمات...</div>;

    return (
        <div className="reviews-dashboard">
            <h2>سجل آراء وتقييمات الزبائن ({reviews.length})</h2>
            
            {reviews.length === 0 ? (
                <p className="no-reviews">لا يوجد تقييمات حتى الآن.</p>
            ) : (
                <div className="reviews-grid">
                    {reviews.map((review) => (
                        <div key={review._id} className="review-card">
                            <div className="review-header">
                                <div className="customer-info">
                                    <h3>{review.customerName}</h3>
                                    <span className="table-badge">طاولة {review.tableNumber}</span>
                                </div>
                                <span className="review-date">
                                    {new Date(review.createdAt).toLocaleDateString('ar-EG')} - {new Date(review.createdAt).toLocaleTimeString('ar-EG')}
                                </span>
                            </div>
                            
                            <div className="rating-stars">
                                {renderStars(review.rating)}
                                <span className="rating-number">({review.rating}/5)</span>
                            </div>

                            {review.ratingComment ? (
                                <div className="review-comment">
                                    <strong>التعليق:</strong> "{review.ratingComment}"
                                </div>
                            ) : (
                                <div className="review-comment no-comment">
                                    (بدون تعليق نصي)
                                </div>
                            )}

                            <div className="order-summary-mini">
                                <small>طلب: {review.items.map(i => i.name).join('، ')}</small>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ReviewsDashboard;