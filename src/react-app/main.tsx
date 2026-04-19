import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";
import RootErrorBoundary from "@/react-app/components/RootErrorBoundary.tsx";

// Migrate legacy hash-based URLs (/#/path) to BrowserRouter paths (/path)
if (window.location.hash.startsWith("#/")) {
  const migratedPath = window.location.hash.slice(1);
  window.history.replaceState(null, "", `${migratedPath}${window.location.search}`);
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Track PWA installation status
window.addEventListener('load', () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true // iOS Safari
    || document.referrer.includes('android-app://');

  // Send to Google Analytics if available
  if (typeof (window as any).gtag !== 'undefined') {
    (window as any).gtag('event', 'pwa_display_mode', {
      mode: isStandalone ? 'standalone' : 'browser',
    });
  }

  // Track PWA installation in database (only if in standalone mode)
  if (isStandalone) {
    // Check if we've already tracked this (use localStorage to avoid duplicate calls)
    const tracked = localStorage.getItem('pwa_install_tracked');
    if (!tracked) {
      fetch('/api/track-pwa-install', {
        method: 'POST',
        credentials: 'include',
      }).then(() => {
        localStorage.setItem('pwa_install_tracked', 'true');
      }).catch((error) => {
        console.error('Failed to track PWA install:', error);
      });
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
