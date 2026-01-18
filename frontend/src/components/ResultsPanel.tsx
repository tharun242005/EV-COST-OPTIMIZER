type Props = {
	payload: any | null;
	result: any | null;
};

export default function ResultsPanel({ result }: Props) {
	if (!result) {
		return <div className="text-sm opacity-80">Run optimization to see results.</div>;
	}
	return (
		<div className="space-y-3">
			<h3 className="text-lg font-semibold">Results</h3>
			<div className="grid grid-cols-3 gap-2 text-sm">
				<KV label="Total Cost" value={`₹ ${result.total_cost?.toFixed?.(2) ?? result.total_cost}`} />
				<KV label="Distance" value={`${result.total_distance_km} km`} />
				<KV label="Time" value={`${result.total_time_min} min`} />
			</div>
			<div className="text-sm">
				<p className="opacity-80">Path</p>
				<p className="truncate">
					{Array.isArray(result.optimal_path) ? result.optimal_path.join(' → ') : '-'}
				</p>
			</div>
		</div>
	);
}

function KV({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded border border-[var(--glass-border)] p-2">
			<p className="text-xs opacity-70">{label}</p>
			<p className="text-base font-semibold">{value}</p>
		</div>
	);
}


