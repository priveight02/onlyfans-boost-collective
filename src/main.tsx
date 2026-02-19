import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Adaptive scrollbar: show on scroll, hide after 3s idle
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
const onScroll = () => {
  document.documentElement.classList.add('scrolling');
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    document.documentElement.classList.remove('scrolling');
  }, 3000);
};
window.addEventListener('scroll', onScroll, { passive: true, capture: true });

createRoot(document.getElementById("root")!).render(<App />);
