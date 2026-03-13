import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PodScrape from './PodScrape.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PodScrape />
  </StrictMode>,
)
