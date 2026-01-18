import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/variables.css';
import './styles/tailwind.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import App from './App';

// Polyfill for builds that reference __publicField helper (defensive)
// Some dependency builds (e.g., certain bundlers/versions) may emit this helper.
// If absent at runtime, define a minimal no-op implementation to prevent crashes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (globalThis as any).__publicField === 'undefined') {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).__publicField = (obj: any, key: string, value: any) => {
		try {
			obj[key] = value;
		} catch {
			// ignore if not assignable
		}
		return value;
	};
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);


