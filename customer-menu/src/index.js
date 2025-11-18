// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // (رح نعدل هذا الملف بعد شوي)
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);