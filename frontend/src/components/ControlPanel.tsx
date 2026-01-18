import { useEffect, useState } from 'react';
import type { GraphPayload } from '../App';

type Props = {
	demoMode: boolean;
	onToggleDemo: (v: boolean) => void;
	onRun: (p: GraphPayload) => Promise<void>;
	loading: boolean;
};

export default function ControlPanel({ demoMode, onToggleDemo, onRun, loading }: Props) {
	const [mode, setMode] = useState<'manual' | 'sample' | 'upload'>('sample');
	const [payload, setPayload] = useState<GraphPayload | null>(null);

	useEffect(() => {
		if (mode === 'sample') {
			(async () => {
				const res = await fetch('/sample-data.json');
				const data = await res.json();
				setPayload({ ...data, optimization: 'cost' });
			})();
		}
	}, [mode]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Route Builder</h2>
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={demoMode}
						onChange={(e) => onToggleDemo(e.target.checked)}
					/>
					Demo Mode
				</label>
			</div>
			<div className="flex gap-2 text-sm">
				<button
					onClick={() => setMode('manual')}
					className={`px-3 py-1 rounded border ${mode === 'manual' ? 'border-accentCyan text-accentCyan' : 'border-transparent'}`}
				>
					Manual
				</button>
				<button
					onClick={() => setMode('sample')}
					className={`px-3 py-1 rounded border ${mode === 'sample' ? 'border-accentCyan text-accentCyan' : 'border-transparent'}`}
				>
					Sample
				</button>
				<button
					onClick={() => setMode('upload')}
					className={`px-3 py-1 rounded border ${mode === 'upload' ? 'border-accentCyan text-accentCyan' : 'border-transparent'}`}
				>
					Upload JSON
				</button>
			</div>
			<div className="text-sm opacity-80">
				{mode === 'sample' && <p>Loaded Bangalore demo. Click Run Optimization to compute.</p>}
				{mode === 'upload' && <FileUpload onPayload={setPayload} />}
				{mode === 'manual' && <p>Manual builder coming soon. Use sample or upload.</p>}
			</div>
			<button
				disabled={!payload || loading}
				onClick={() => payload && onRun(payload)}
				className="w-full py-2 rounded bg-accentCyan/20 text-accentCyan border border-accentCyan hover:bg-accentCyan/30 transition"
			>
				{loading ? 'Computing...' : 'Run Optimization'}
			</button>
		</div>
	);
}

function FileUpload({ onPayload }: { onPayload: (p: GraphPayload) => void }) {
	const [error, setError] = useState<string | null>(null);
	return (
		<div>
			<input
				type="file"
				accept="application/json"
				onChange={async (e) => {
					const file = e.target.files?.[0];
					if (!file) return;
					try {
						const text = await file.text();
						const data = JSON.parse(text);
						onPayload({ ...data, optimization: 'cost' });
						setError(null);
					} catch {
						setError('Invalid JSON');
					}
				}}
			/>
			{error && <p className="text-red-400 text-xs mt-1">{error}</p>}
		</div>
	);
}


