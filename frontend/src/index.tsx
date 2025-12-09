
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Only use StrictMode in development to avoid duplicate API calls in production
// StrictMode intentionally double-invokes effects to help find bugs
const AppWrapper = process.env.NODE_ENV === 'development' ? (
  <React.StrictMode>
    <App />
  </React.StrictMode>
) : (
  <App />
);

root.render(AppWrapper); 