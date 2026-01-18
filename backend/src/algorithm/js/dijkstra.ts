type NodeInput = {
	id: number;
	name: string;
	lat: number;
	lon: number;
	cost_per_kwh: number;
	max_kwh: number;
	speed_kW: number;
};

type EdgeInput = {
	from: number;
	to: number;
	distance_km: number;
	time_min: number;
};

type VehicleInput = {
	battery_kwh: number;
	initial_soc_pct: number;
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
	debug_steps?: unknown[];
};

export function computeRoute(payload: RequestPayload): ComputeResult {
	validatePayload(payload);

	const { nodes, edges, vehicle, optimization, hybrid_weight = 0.5 } = payload;
	const startNodeId = nodes[0]?.id;
	const endNodeId = nodes[nodes.length - 1]?.id;
	if (startNodeId == null || endNodeId == null) {
		throw new Error('At least two nodes required');
	}

	const adjacency = new Map<number, EdgeInput[]>();
	for (const edge of edges) {
		if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
		adjacency.get(edge.from)!.push(edge);
	}

	const batteryCapacity = vehicle.battery_kwh;
	const initialSoc = (vehicle.initial_soc_pct / 100) * batteryCapacity;
	const consumptionPerKm = vehicle.consumption_kwh_per_km;

	// Discretize SOC in 0.5 kWh steps
	const socStep = 0.5;
	const steps = Math.max(1, Math.round(batteryCapacity / socStep));
	const toStep = (soc: number) => Math.max(0, Math.min(steps, Math.round(soc / socStep)));
	const fromStep = (stepIdx: number) => stepIdx * socStep;

	type StateKey = string; // `${node}|${socStepIdx}`
	const keyOf = (node: number, socIdx: number) => `${node}|${socIdx}`;

	// Costs and predecessors
	const cost: Map<StateKey, number> = new Map();
	const time: Map<StateKey, number> = new Map();
	const prev: Map<StateKey, StateKey | null> = new Map();

	// Priority queue (min-heap) simplified with array for clarity
	type QueueItem = { key: StateKey; totalCost: number; node: number; socIdx: number };
	const queue: QueueItem[] = [];

	const startSocIdx = toStep(initialSoc);
	const startKey = keyOf(startNodeId, startSocIdx);
	cost.set(startKey, 0);
	time.set(startKey, 0);
	prev.set(startKey, null);
	queue.push({ key: startKey, totalCost: 0, node: startNodeId, socIdx: startSocIdx });

	const nodeById = new Map(nodes.map((n) => [n.id, n]));
	const finalizeCandidates: StateKey[] = [];
	const debugSteps: unknown[] = [];

	while (queue.length) {
		queue.sort((a, b) => a.totalCost - b.totalCost);
		const current = queue.shift()!;

		const currentCost = cost.get(current.key)!;
		const currentTime = time.get(current.key)!;
		const currentSoc = fromStep(current.socIdx);

		// If at destination node, record candidate
		if (current.node === endNodeId) {
			finalizeCandidates.push(current.key);
			// Continue search to possibly find lower cost with different SOC
		}

		// 1) Travel transitions
		const outgoing = adjacency.get(current.node) || [];
		for (const e of outgoing) {
			const energyNeeded = e.distance_km * consumptionPerKm;
			if (currentSoc + 1e-6 >= energyNeeded) {
				const nextSoc = currentSoc - energyNeeded;
				const nextSocIdx = toStep(nextSoc);
				const nextKey = keyOf(e.to, nextSocIdx);
				const travelTime = e.time_min;
				const travelCostComponent =
					optimization === 'cost'
						? 0
						: optimization === 'time'
						? travelTime
						: hybrid_weight * travelTime;
				const tentativeCost = currentCost + travelCostComponent;
				const tentativeTime = currentTime + travelTime;
				if (!cost.has(nextKey) || tentativeCost < cost.get(nextKey)!) {
					cost.set(nextKey, tentativeCost);
					time.set(nextKey, tentativeTime);
					prev.set(nextKey, current.key);
					queue.push({ key: nextKey, totalCost: tentativeCost, node: e.to, socIdx: nextSocIdx });
					debugSteps.push({
						type: 'relax_travel',
						from: current.key,
						to: nextKey,
						edge: e,
						cost: tentativeCost,
						time: tentativeTime
					});
				}
			}
		}

		// 2) Charging transitions (stay at node, increase SOC)
		const station = nodeById.get(current.node)!;
		if (station.max_kwh > 0 && station.cost_per_kwh > 0) {
			// Charge 0.5 kWh step up to capacity
			if (currentSoc + socStep <= batteryCapacity) {
				const nextSoc = currentSoc + socStep;
				const nextSocIdx = toStep(nextSoc);
				const nextKey = keyOf(current.node, nextSocIdx);

				const chargedKwh = socStep;
				const money = chargedKwh * station.cost_per_kwh;
				// Time penalty when optimizing time or hybrid
				const minutesToCharge = (chargedKwh / Math.max(1, station.speed_kW)) * 60;
				const penalty =
					optimization === 'cost'
						? money
						: optimization === 'time'
						? minutesToCharge
						: hybrid_weight * minutesToCharge + (1 - hybrid_weight) * money;
				const tentativeCost = currentCost + penalty;
				const tentativeTime = currentTime + minutesToCharge;
				if (!cost.has(nextKey) || tentativeCost < cost.get(nextKey)!) {
					cost.set(nextKey, tentativeCost);
					time.set(nextKey, tentativeTime);
					prev.set(nextKey, current.key);
					queue.push({ key: nextKey, totalCost: tentativeCost, node: current.node, socIdx: nextSocIdx });
					debugSteps.push({
						type: 'relax_charge',
						from: current.key,
						to: nextKey,
						charged_kwh: chargedKwh,
						cost: tentativeCost,
						time: tentativeTime
					});
				}
			}
		}
	}

	// Choose best destination state
	if (finalizeCandidates.length === 0) {
		throw new Error('No feasible path found with given SOC/constraints.');
	}
	finalizeCandidates.sort((a, b) => (cost.get(a)! - cost.get(b)!));
	const bestFinal = finalizeCandidates[0];

	// Reconstruct path of nodes and SOC timeline
	const pathKeys: StateKey[] = [];
	let cur: StateKey | null = bestFinal;
	while (cur) {
		pathKeys.push(cur);
		cur = prev.get(cur) ?? null;
	}
	pathKeys.reverse();

	const optimal_path: number[] = [];
	const soc_timeline: Array<{ node: number; soc: number; charged_kwh?: number }> = [];
	let lastSoc = 0;
	for (let i = 0; i < pathKeys.length; i++) {
		const [nodeStr, socIdxStr] = pathKeys[i].split('|');
		const nodeId = Number(nodeStr);
		const socVal = fromStep(Number(socIdxStr));
		optimal_path.push(nodeId);
		const charged = i === 0 ? undefined : socVal > lastSoc ? +(socVal - lastSoc).toFixed(2) : undefined;
		soc_timeline.push({ node: nodeId, soc: +socVal.toFixed(2), ...(charged ? { charged_kwh: charged } : {}) });
		lastSoc = socVal;
	}

	// Aggregate totals (distance/time) along consecutive distinct nodes
	let total_distance_km = 0;
	let total_time_min = 0;
	for (let i = 0; i < optimal_path.length - 1; i++) {
		const u = optimal_path[i];
		const v = optimal_path[i + 1];
		if (u === v) continue; // charging steps
		const e = (adjacency.get(u) || []).find((x) => x.to === v);
		if (e) {
			total_distance_km += e.distance_km;
			total_time_min += e.time_min;
		}
	}

	// Monetary cost approximation: sum charged_kwh * cost at that node
	let total_cost = 0;
	for (let i = 1; i < soc_timeline.length; i++) {
		const entry = soc_timeline[i];
		const prevEntry = soc_timeline[i - 1];
		const delta = entry.soc - prevEntry.soc;
		if (delta > 0) {
			const station = nodeById.get(entry.node)!;
			total_cost += delta * station.cost_per_kwh;
		}
	}
	total_cost = +total_cost.toFixed(2);

	// Basic LineString for map
	const coords = optimal_path
		.map((id) => nodeById.get(id))
		.filter(Boolean)
		.map((n) => [n!.lon, n!.lat]);
	const visual_path_geojson = {
		type: 'Feature',
		geometry: { type: 'LineString', coordinates: coords },
		properties: {}
	};

	return {
		optimal_path,
		total_cost,
		total_distance_km: +total_distance_km.toFixed(2),
		total_time_min: Math.round(total_time_min),
		soc_timeline,
		visual_path_geojson,
		debug_steps: debugSteps
	};
}

function validatePayload(payload: RequestPayload) {
	if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges) || !payload.vehicle) {
		throw new Error('Invalid payload');
	}
	if (!payload.nodes.length) throw new Error('nodes required');
	if (!['cost', 'time', 'hybrid'].includes(payload.optimization)) {
		throw new Error('optimization must be cost|time|hybrid');
	}
}


