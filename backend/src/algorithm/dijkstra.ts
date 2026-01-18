import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

type NodeInput = {
	id: number;
	name: string;
	lat: number;
	lon: number;
	cost_per_kwh: number;
};

type EdgeInput = {
	from: number;
	to: number;
	distance_km: number;
	time_min?: number;
};

type VehicleInput = {
	battery_kwh: number;
	initial_soc_pct: number; // 0..100
	consumption_kwh_per_km: number;
};

type RequestPayload = {
	nodes: NodeInput[];
	edges: EdgeInput[];
	vehicle: VehicleInput;
	optimization: 'cost' | 'time' | 'hybrid';
	hybrid_weight?: number;
};

type ComputeResult = {
	optimal_path: number[];
	total_cost: number;
	total_distance_km: number;
	total_time_min: number;
	soc_timeline: Array<{ node: number; soc: number; charged_kwh?: number }>;
	visual_path_geojson: unknown;
	debug_steps: Array<Record<string, unknown>>;
	status: 'ok' | 'error';
	used: 'native' | 'js';
	fallbackFromNative?: string | null;
};

/**
 * Compute route using optional native C binary first; fallback to JS.
 */
export function computeRouteEV(payload: RequestPayload): ComputeResult {
	try {
		validatePayload(payload);
		const native = tryNative(payload);
		if (native) {
			console.log('[DEBUG] Using native algorithm');
			console.log('[DEBUG] Optimal path computed successfully.');
			return native;
		}
		console.log('[DEBUG] Using JS algorithm');
		const result = computeInJs(payload, true);
		console.log('[DEBUG] Optimal path computed successfully.');
		return result;
	} catch (err: any) {
		console.error('[ERROR] computeRouteEV failed:', err);
		throw err; // Re-throw to let route handler catch it
	}
}

function tryNative(payload: RequestPayload): ComputeResult | null {
	const exe =
		process.platform === 'win32'
			? path.resolve(process.cwd(), 'algo', 'compute_route.exe')
			: path.resolve(process.cwd(), 'algo', 'compute_route');
	if (!fs.existsSync(exe)) {
		return null;
	}
	try {
		const res = spawnSync(exe, { input: JSON.stringify(payload), encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
		if (res.error) {
			return null;
		}
		const stdout = (res.stdout || '').trim();
		if (!stdout) return null;
		const data = JSON.parse(stdout);
		// Ensure basic shape
		if (Array.isArray(data.optimal_path) && typeof data.total_cost === 'number') {
			// Ensure all required fields are present
			return {
				optimal_path: data.optimal_path || [],
				total_cost: data.total_cost || 0,
				total_distance_km: data.total_distance_km || 0,
				total_time_min: data.total_time_min || 0,
				soc_timeline: data.soc_timeline || [],
				visual_path_geojson: data.visual_path_geojson || null,
				debug_steps: data.debug_steps || [],
				status: 'ok',
				used: 'native',
				fallbackFromNative: 'none'
			};
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * EV-aware Dijkstra with simple SOC simulation and charging heuristic.
 * Edge relaxation includes:
 * - SOC drop based on energy_needed
 * - If SOC < 20%, simulate charging to 80% at CURRENT node price
 * - Travel energy cost charged at DESTINATION node price
 */
function computeInJs(payload: RequestPayload, noteFallback: boolean): ComputeResult {
	try {
		const { nodes, edges, vehicle } = payload;
		const startNodeId = nodes[0].id;
		const endNodeId = nodes[nodes.length - 1].id;

		const nodeById = new Map(nodes.map((n) => [n.id, n]));
		const adjacency = new Map<number, EdgeInput[]>();
		for (const e of edges) {
			if (!adjacency.has(e.from)) adjacency.set(e.from, []);
			adjacency.get(e.from)!.push(e);
		}

		// Dijkstra with state carrying SOC (percentage) and cost totals
		type State = { node: number; cost: number; socPct: number; distance: number };
		const distCost = new Map<number, number>();
		const bestSoc = new Map<number, number>();
		const prev = new Map<number, number | null>();
		const debug_steps: Array<Record<string, unknown>> = [];
		const socAtNode = new Map<number, { soc: number; charged_kwh?: number }>();

		const initialSoc = clamp(vehicle.initial_soc_pct, 0, 100);
		distCost.set(startNodeId, 0);
		bestSoc.set(startNodeId, initialSoc);
		prev.set(startNodeId, null);
		socAtNode.set(startNodeId, { soc: round2(initialSoc) });

		// Min-heap via array sort for clarity
		const q: State[] = [{ node: startNodeId, cost: 0, socPct: initialSoc, distance: 0 }];

		while (q.length) {
			q.sort((a, b) => a.cost - b.cost);
			const cur = q.shift()!;

			if (cur.node === endNodeId) {
				// Found a cheapest path to destination
				break;
			}
			const outgoing = adjacency.get(cur.node) || [];
			for (const e of outgoing) {
				const nextNode = e.to;
				const next = nodeById.get(nextNode)!;
				const energyNeeded = e.distance_km * vehicle.consumption_kwh_per_km; // kWh
				const socDropPct = (energyNeeded / vehicle.battery_kwh) * 100;
				let newSoc = cur.socPct - socDropPct;
				let addedCost = 0;
				let chargedKwh: number | undefined;
				// If SOC below 20%, charge to 80% at current node price
				if (newSoc < 20) {
					const targetPct = 80;
					const deltaPct = targetPct - newSoc;
					chargedKwh = (deltaPct / 100) * vehicle.battery_kwh;
					const currentNode = nodeById.get(cur.node)!;
					addedCost += chargedKwh * currentNode.cost_per_kwh;
					newSoc = targetPct;
					// record charge at current node (overwrite/aggregate)
					socAtNode.set(cur.node, { soc: round2(newSoc), charged_kwh: round2(chargedKwh) });
				}
				// Travel energy cost at destination node price
				const travelMoney = energyNeeded * next.cost_per_kwh;
				addedCost += travelMoney;

				const newCostTotal = cur.cost + addedCost;
				const newDistance = cur.distance + e.distance_km;

				if (!distCost.has(nextNode) || newCostTotal < distCost.get(nextNode)!) {
					distCost.set(nextNode, newCostTotal);
					bestSoc.set(nextNode, newSoc);
					prev.set(nextNode, cur.node);
					q.push({ node: nextNode, cost: newCostTotal, socPct: newSoc, distance: newDistance });
					debug_steps.push({ current: cur.node, next: nextNode, newCost: round2(newCostTotal) });
					// Store SOC for next node if not set
					if (!socAtNode.has(nextNode)) socAtNode.set(nextNode, { soc: round2(newSoc) });
				}
			}
		}

		// Reconstruct path (ensure it's a plain array, no Promise-like methods)
		const optimalPath: number[] = [];
		let cursor: number | null = endNodeId;
		if (!prev.has(endNodeId)) {
			throw new Error('No feasible path found.');
		}
		while (cursor != null) {
			optimalPath.push(cursor);
			cursor = prev.get(cursor) ?? null;
		}
		optimalPath.reverse();

		// Debug: confirm path is a plain array
		if (!Array.isArray(optimalPath)) {
			throw new Error('Path reconstruction failed: result is not an array');
		}
		console.log('[DEBUG] Optimal path computed:', optimalPath);

		// Build SOC timeline: ensure entries for nodes in path
		const soc_timeline: Array<{ node: number; soc: number; charged_kwh?: number }> = [];
		for (const id of optimalPath) {
			const rec = socAtNode.get(id);
			if (rec) soc_timeline.push({ node: id, soc: round2(rec.soc), ...(rec.charged_kwh ? { charged_kwh: round2(rec.charged_kwh) } : {}) });
			else soc_timeline.push({ node: id, soc: round2(bestSoc.get(id) ?? 0) });
		}

		// Totals
		let total_distance_km = 0;
		for (let i = 0; i < optimalPath.length - 1; i++) {
			const u = optimalPath[i];
			const v = optimalPath[i + 1];
			const e = (adjacency.get(u) || []).find((x) => x.to === v);
			if (e) total_distance_km += e.distance_km;
		}
		const total_cost = round2(distCost.get(endNodeId)!);

		// Calculate total time (sum of edge times if available, otherwise estimate)
		let total_time_min = 0;
		for (let i = 0; i < optimalPath.length - 1; i++) {
			const u = optimalPath[i];
			const v = optimalPath[i + 1];
			const e = (adjacency.get(u) || []).find((x) => x.to === v);
			if (e && e.time_min) {
				total_time_min += e.time_min;
			} else if (e) {
				// Estimate time based on distance (assuming average speed of 60 km/h)
				total_time_min += (e.distance_km / 60) * 60; // minutes
			}
		}
		total_time_min = Math.round(total_time_min);

		// Build visual_path_geojson for map display
		const coords = optimalPath
			.map((id) => {
				const node = nodeById.get(id);
				return node ? [node.lon, node.lat] : null;
			})
			.filter((c): c is [number, number] => c !== null);
		
		const visual_path_geojson = {
			type: 'Feature',
			geometry: { type: 'LineString', coordinates: coords },
			properties: {}
		};

		// Ensure all return values are plain objects/arrays (no Promise-like structures)
		const result: ComputeResult = {
			optimal_path: [...optimalPath], // Create a new array copy to ensure it's plain
			total_cost,
			total_distance_km: round2(total_distance_km),
			total_time_min,
			soc_timeline: [...soc_timeline], // Copy array
			visual_path_geojson,
			debug_steps: [...debug_steps], // Copy array
			status: 'ok',
			used: 'js',
			fallbackFromNative: fs.existsSync(path.resolve(process.cwd(), 'algo', process.platform === 'win32' ? 'compute_route.exe' : 'compute_route'))
				? 'native-failed'
				: 'native-binary-missing'
		};

		return result;
	} catch (err: any) {
		console.error('[ERROR] computeRouteEV internal:', err);
		throw new Error(`Algorithm computation failed: ${err?.message || 'Unknown error'}`);
	}
}

function validatePayload(payload: RequestPayload) {
	if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges) || !payload.vehicle) {
		throw new Error('Invalid payload');
	}
	if (payload.nodes.length < 2) {
		throw new Error('At least two nodes required');
	}
}

function clamp(v: number, min: number, max: number) {
	return Math.max(min, Math.min(max, v));
}

function round2(n: number) {
	return Math.round(n * 100) / 100;
}


