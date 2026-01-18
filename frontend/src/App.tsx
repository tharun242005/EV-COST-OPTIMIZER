import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import MapCanvas from './components/MapCanvas';
import ControlPanel from './components/ControlPanel';
import ResultsPanel from './components/ResultsPanel';
import AlgorithmStepper from './components/AlgorithmStepper';
import SimulationHUD from './components/SimulationHUD';
import { computeRoute } from './lib/api';

export type GraphPayload = {
	nodes: any[];
	edges: any[];
	vehicle: any;
	optimization: 'cost' | 'time' | 'hybrid';
	hybrid_weight?: number;
};

export default function App() {
	const [payload, setPayload] = useState<GraphPayload | null>(null);
	const [result, setResult] = useState<any | null>(null);
	const [loading, setLoading] = useState(false);
	const [demoMode, setDemoMode] = useState(true);

	useEffect(() => {
		if (!demoMode) return;
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				const res = await fetch('/sample-data.json');
				const data = await res.json();
				// ✅ Ensure complete payload with all required fields
				const p: GraphPayload = {
					nodes: data.nodes || [],
					edges: data.edges || [],
					vehicle: data.vehicle || {
						battery_kwh: 60,
						initial_soc_pct: 80,
						consumption_kwh_per_km: 0.2
					},
					optimization: data.optimization || 'cost'
				};
				if (!cancelled) setPayload(p);
				const computed = await computeRoute(p);
				if (!cancelled) {
					setResult(computed);
				}
			} catch (error: any) {
				console.error('[ERROR] Demo route computation failed:', error);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [demoMode]);

	const handleRun = async (p: GraphPayload) => {
		setPayload(p);
		try {
			setLoading(true);
			// ✅ Ensure payload has all required fields before sending
			const safePayload: GraphPayload = {
				nodes: p.nodes || [],
				edges: p.edges || [],
				vehicle: p.vehicle || {
					battery_kwh: 60,
					initial_soc_pct: 80,
					consumption_kwh_per_km: 0.2
				},
				optimization: p.optimization || 'cost'
			};
			const computed = await computeRoute(safePayload);
			setResult(computed);
		} catch (error: any) {
			console.error('[ERROR] Route computation failed:', error);
			alert(`⚠️ Route computation failed: ${error?.message || 'Unknown error'}. Please check console logs for details.`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="h-full grid grid-cols-12 gap-4 p-4">
			<div className="col-span-12 md:col-span-3">
				<motion.div
					className="rounded-xl border border-[var(--glass-border)] bg-[var(--panel)] shadow-glass backdrop-blur-md p-4"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
				>
					<ControlPanel
						demoMode={demoMode}
						onToggleDemo={setDemoMode}
						onRun={handleRun}
						loading={loading}
					/>
				</motion.div>
			</div>
			<div className="col-span-12 md:col-span-6">
				<motion.div
					className="rounded-xl border border-[var(--glass-border)] bg-[var(--panel)] shadow-glass backdrop-blur-md h-[70vh] md:h-full"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
				>
					<MapCanvas payload={payload} result={result} loading={loading} />
					<SimulationHUD result={result} />
				</motion.div>
			</div>
			<div className="col-span-12 md:col-span-3 flex flex-col gap-4">
				<motion.div
					className="rounded-xl border border-[var(--glass-border)] bg-[var(--panel)] shadow-glass backdrop-blur-md p-4"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
				>
					<ResultsPanel payload={payload} result={result} />
				</motion.div>
				<motion.div
					className="rounded-xl border border-[var(--glass-border)] bg-[var(--panel)] shadow-glass backdrop-blur-md p-4"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
				>
					<AlgorithmStepper result={result} />
				</motion.div>
			</div>
		</div>
	);
}


