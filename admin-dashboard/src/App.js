import React, { useState, useEffect } from 'react';
import './App.css'; 
import Login from './components/Login'; 
import ManagerDashboard from './components/ManagerDashboard'; 
import CashierDashboard from './components/CashierDashboard'; 
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        setUser(response.data); 
        setLoading(false);
      })
      .catch(() => {
        handleLogout(); 
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = ({ token, user }) => { 
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user)); 
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken'); 
    localStorage.removeItem('user');
    setUser(null);
  };

  const renderDashboard = () => {
    if (!user) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    if (user.role === 'manager') {
      return <ManagerDashboard user={user} onLogout={handleLogout} />;
    } else if (user.role === 'admin') {
      return <CashierDashboard user={user} onLogout={handleLogout} />;
    }
    
    handleLogout();
    return <Login onLoginSuccess={handleLoginSuccess} />;
  };
  
  if (loading) {
    return <div className="loading-screen">جاري التحقق...</div>;
  }

  return (
    <div className="App">
      {user ? renderDashboard() : <Login onLoginSuccess={handleLoginSuccess} />}
    </div>
  );
}

export default App;