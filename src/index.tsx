import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, BaseStyles } from '@primer/react'
import App from './App';

const root = document.createElement("div")
root.className = "container"
document.body.appendChild(root)
const rootDiv = ReactDOM.createRoot(root);

rootDiv.render(
  <React.StrictMode>
    <ThemeProvider>
      <BaseStyles>
        <App />
      </BaseStyles>
      </ThemeProvider>
  </React.StrictMode>
);
