import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Scrollbars always visible — no hide/show logic needed

createRoot(document.getElementById("root")!).render(<App />);
