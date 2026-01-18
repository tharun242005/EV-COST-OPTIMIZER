type Props = {
	result: any | null;
};

export default function SimulationHUD({ result }: Props) {
	if (!result) return null;
	const last = result.soc_timeline?.[result.soc_timeline.length - 1];
	return (
		<div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-2 rounded text-sm flex gap-4">
			<div>Battery end SOC: {last ? `${last.soc}%` : '-'}</div>
			<div>Stations: {Array.isArray(result.optimal_path) ? result.optimal_path.length : '-'}</div>
		</div>
	);
}


