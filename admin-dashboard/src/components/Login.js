import React, { useState } from 'react';
import axios from 'axios';
import './Login.css'; 

// (استخدام المتغيرات البيئية الجديدة)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/auth/login`;

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(API_URL, { username, password });
      
      const { token, role, username: loggedInUsername, permissions } = response.data;
      
      onLoginSuccess({ 
          token, 
          user: { role, username: loggedInUsername, permissions } 
      });

    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'فشل الاتصال بالسيرفر.';
      setError(errorMsg);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>تسجيل دخول لوحة الإدارة</h2>
        {error && <div className="error-message">{error}</div>} 
        <input
          type="text"
          placeholder="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  );
}

export default Login;