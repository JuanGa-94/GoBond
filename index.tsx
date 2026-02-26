
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

// Inicialización de PostHog
if (typeof window !== 'undefined') {
  posthog.init(process.env.REACT_APP_POSTHOG_KEY || 'phc_8n9IBSByAvK5iFyDJgwc594JwNIIDF3ags38XRsGcrs', {
    api_host: process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true // Esto trackea automáticamente cuando el usuario cambia de página
  });
}


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
// 3. Renderizado (Envolviendo tu App)
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* Envolvemos tu App con el Provider de PostHog */}
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </React.StrictMode>
);