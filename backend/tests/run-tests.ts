import { computeRoute } from '../src/algorithm/js/dijkstra.js';
import fs from 'fs';
import path from 'path';

function assert(condition: any, msg: string) {
	if (!condition) {
		throw new Error(`Test failed: ${msg}`);
	}
}

(async () => {
	const samplePath = path.resolve(process.cwd(), '..', 'frontend', 'public', 'sample-data.json');
	const raw = fs.readFileSync(samplePath, 'utf-8');
	const data = JSON.parse(raw);

	const result = computeRoute({
		...data,
		optimization: 'cost',
		hybrid_weight: 0.5
	});
	assert(Array.isArray(result.optimal_path) && result.optimal_path.length >= 2, 'optimal_path present');
	assert(typeof result.total_cost === 'number', 'total_cost number');
	assert(result.visual_path_geojson && (result as any).visual_path_geojson.type === 'Feature', 'geojson present');

	// eslint-disable-next-line no-console
	console.log('Algorithm tests passed. Example output:', {
		optimal_path: result.optimal_path,
		total_cost: result.total_cost
	});
})().catch((e) => {
	// eslint-disable-next-line no-console
	console.error(e);
	process.exit(1);
});


