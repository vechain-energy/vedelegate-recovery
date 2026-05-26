import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { forceVechainKitEnglish } from './config/localization'
import './styles.css'

forceVechainKitEnglish()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
