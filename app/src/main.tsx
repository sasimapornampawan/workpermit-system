import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { VerifyBadge } from './screens/VerifyBadge';
import './index.css';

// Badge QR codes link to /?verify=<token>, a public page that skips login.
const verifyToken = new URLSearchParams(window.location.search).get('verify');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {verifyToken ? <VerifyBadge token={verifyToken} /> : <App />}
  </React.StrictMode>,
);
