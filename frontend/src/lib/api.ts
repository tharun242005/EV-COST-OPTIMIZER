import type { GraphPayload } from '../App';

export async function computeRoute(payload: GraphPayload) {
	// ✅ Step 1: Construct complete payload with defaults
	const completePayload = {
		nodes: payload.nodes || [],
		edges: payload.edges || [],
		vehicle: payload.vehicle || {
			battery_kwh: 60,
			initial_soc_pct: 80,
			consumption_kwh_per_km: 0.2
		},
		optimization: payload.optimization || 'cost' // ✅ Always included
	};

	console.log('[DEBUG] Sending payload to backend:', completePayload);

	// ✅ Step 2: Send POST request
	const res = await fetch('/api/compute-route', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(completePayload)
	});

	// ✅ Step 3: Handle response
	if (!res.ok) {
		const errText = await res.text();
		let errMsg = `Backend returned ${res.status}: ${errText}`;
		try {
			const errJson = JSON.parse(errText);
			errMsg = errJson.message || errMsg;
		} catch {
			// Use text as-is if not JSON
		}
		throw new Error(errMsg);
	}

	const data = await res.json();
	console.log('[SUCCESS] Received route result:', data);
	return data;
}


