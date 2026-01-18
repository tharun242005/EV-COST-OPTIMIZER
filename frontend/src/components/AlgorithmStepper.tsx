type Props = {
	result: any | null;
};

export default function AlgorithmStepper({ result }: Props) {
	if (!result) return <div className="text-sm opacity-80">No debug steps yet.</div>;
	const steps = Array.isArray(result.debug_steps) ? result.debug_steps.slice(0, 12) : [];
	return (
		<div className="space-y-2">
			<h3 className="text-lg font-semibold">Algorithm Stepper</h3>
			<div className="max-h-44 overflow-auto text-xs space-y-1 pr-1">
				{steps.length === 0 && <p className="opacity-70">Debug steps not provided.</p>}
				{steps.map((s, i) => (
					<div key={i} className="rounded border border-[var(--glass-border)] p-2">
						<code>{JSON.stringify(s)}</code>
					</div>
				))}
			</div>
		</div>
	);
}


