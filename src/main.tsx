import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id'

setNetworkId("preview");

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)