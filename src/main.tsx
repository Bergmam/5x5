import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

const rawBasePath = import.meta.env.VITE_BASE_PATH || '/';
const basename = rawBasePath !== '/' && rawBasePath.endsWith('/')
  ? rawBasePath.slice(0, -1)
  : rawBasePath;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
