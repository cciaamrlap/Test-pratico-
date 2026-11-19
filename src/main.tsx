import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

(window as {__APP_MOUNTED__?: boolean}).__APP_MOUNTED__ = true;

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
