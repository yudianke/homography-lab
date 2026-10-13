// Test fixture only: intentionally simulate an unavailable WebGL context.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import '../src/styles/index.css';
const original = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(type: any, ...args: any[]) {
 return type === 'webgl' ? null : (original as any).call(this, type, ...args);
} as any;
createRoot(document.querySelector('#root')!).render(<App />);
