import { Router } from 'express';
import { computeRouteEV } from '../algorithm/dijkstra.js';

export const router = Router();

router.post('/', async (req, res) => {
	try {
		const payload = req.body;

		// 🧩 Step 1: Log incoming payload
		console.log('[DEBUG] Incoming request payload:', JSON.stringify(payload, null, 2));

		// 🧩 Step 2: Validate required fields
		const required = ['nodes', 'edges', 'vehicle'];
		const missing = required.filter(k => !payload[k]);

		if (missing.length > 0) {
			console.error(`[ERROR] Missing required fields: ${missing.join(', ')}`);
			return res.status(400).json({
				status: 'error',
				message: `Missing required fields: ${missing.join(', ')}`
			});
		}

		// 🧩 Step 3: Ensure optimization field
		if (!payload.optimization) {
			console.warn('[WARN] Optimization type missing — defaulting to "cost"');
			payload.optimization = 'cost';
		}

		// 🧩 Step 4: Call compute function
		const result = computeRouteEV(payload);

		// 🧩 Step 5: Return success response
		console.log('[SUCCESS] Route computed successfully.');
		return res.status(200).json(result);

	} catch (err: any) {
		console.error('[ERROR] Route computation failed:', err.message);
		return res.status(400).json({
			status: 'error',
			message: err?.message || 'Invalid input or internal error'
		});
	}
});


