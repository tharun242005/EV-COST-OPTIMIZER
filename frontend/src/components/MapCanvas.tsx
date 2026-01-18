// @ts-nocheck
import { GoogleMap, Marker, DirectionsRenderer, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

// Keep libraries as a stable constant to avoid reloading warnings
const GMAP_LIBRARIES = ['places', 'geometry'] as const;

type Props = {
	payload: any | null;
	result: any | null;
	loading: boolean;
};

type SocEntry = { node: number; soc: number; charged_kwh?: number };

const mapContainerStyle = {
	width: '100%',
	height: '100%'
};

const futuristicDarkTheme = [
	{ elementType: 'geometry', stylers: [{ color: '#1c1c1c' }] },
	{ elementType: 'labels.text.fill', stylers: [{ color: '#00FFFF' }] },
	{ elementType: 'labels.text.stroke', stylers: [{ color: '#000000' }] },
	{ featureType: 'road', elementType: 'geometry', stylers: [{ color: '#222222' }] },
	{ featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#00FFFF' }] },
	{ featureType: 'water', elementType: 'geometry', stylers: [{ color: '#003333' }] },
	{ featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#00FFFF' }] },
];

const defaultCenter = { lat: 12.9716, lng: 77.5946 };
const defaultZoom = 13;

export default function MapCanvas({ payload, result, loading }: Props) {
	const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
	const [carPos, setCarPos] = useState<google.maps.LatLng | null>(null);
	const [currentSoc, setCurrentSoc] = useState<number | null>(null);
	const mapRef = useRef<google.maps.Map | null>(null);
	const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
	const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const [mapCenter, setMapCenter] = useState(defaultCenter);
	const [mapZoom, setMapZoom] = useState(defaultZoom);

	// Demo route fallback (Bengaluru approx points)
	const demoPath = useMemo(
		() => [
			{ lat: 12.9599, lng: 77.5669 }, // Depot
			{ lat: 12.9652, lng: 77.5856 }, // turn
			{ lat: 12.9721, lng: 77.5957 }, // Station A
			{ lat: 12.9783, lng: 77.6032 }, // park loop
			{ lat: 12.9839, lng: 77.5973 }, // Station B
			{ lat: 12.9917, lng: 77.5922 } // Destination
		],
		[]
	);
	const useDemoFallback = !result?.optimal_path || !Array.isArray(result?.optimal_path) || (result?.optimal_path?.length ?? 0) < 2;

	// Manual polyline points: prefer payload nodes (start -> middle -> end), else demoPath
	const manualPath = useMemo(() => {
		if (payload?.nodes?.length >= 2) {
			const n = payload.nodes;
			const first = { lat: n[0].lat, lng: n[0].lon };
			const last = { lat: n[n.length - 1].lat, lng: n[n.length - 1].lon };
			const mid = n[Math.floor(n.length / 2)];
			const midPt = mid ? { lat: mid.lat, lng: mid.lon } : undefined;
			return midPt ? [first, midPt, last] : [first, last];
		}
		return demoPath;
	}, [payload, demoPath]);

	const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

	const { isLoaded } = useJsApiLoader({
		id: 'google-map-script',
		googleMapsApiKey: apiKey,
		libraries: GMAP_LIBRARIES as unknown as string[]
	});

	const stationLookup = useMemo(() => {
		if (!payload?.nodes) return new Map<number, any>();
		return new Map(payload.nodes.map((n: any) => [n.id, n]));
	}, [payload]);

	// Compute route using DirectionsService when we have a result
	useEffect(() => {
		if (!isLoaded || !result?.optimal_path || !payload?.nodes || !mapRef.current || useDemoFallback) return;

		const optimalPath = result.optimal_path;
		if (optimalPath.length < 2) return;

		// Get coordinates for the optimal path
		const pathNodes = optimalPath
			.map((id: number) => {
				const node = payload.nodes.find((n: any) => n.id === id);
				return node ? { lat: node.lat, lng: node.lon } : null;
			})
			.filter((n: any) => n !== null);

		if (pathNodes.length < 2) return;

		const origin = pathNodes[0];
		const destination = pathNodes[pathNodes.length - 1];
		const waypoints = pathNodes.slice(1, -1).map((point: any) => ({
			location: point,
			stopover: true
		}));

		if (!directionsServiceRef.current) {
			directionsServiceRef.current = new google.maps.DirectionsService();
		}

		directionsServiceRef.current.route(
			{
				origin: origin,
				destination: destination,
				waypoints: waypoints.length > 0 ? waypoints : undefined,
				travelMode: google.maps.TravelMode.DRIVING,
				optimizeWaypoints: false
			},
			(result, status) => {
				if (status === 'OK' && result) {
					setDirections(result);
					// Fit bounds to show entire route
					if (mapRef.current && result.routes[0]) {
						const bounds = new google.maps.LatLngBounds();
						result.routes[0].overview_path.forEach((point) => bounds.extend(point));
						mapRef.current.fitBounds(bounds, { padding: 60 });
					}
				} else {
					console.error('Route computation failed:', status);
					setDirections(null);
				}
			}
		);
	}, [isLoaded, result?.optimal_path, payload?.nodes, useDemoFallback]);

	// Animate EV marker along route (directions) OR along demoPath when in demo
	useEffect(() => {
		if (animationIntervalRef.current) {
			clearInterval(animationIntervalRef.current);
			animationIntervalRef.current = null;
		}

		if (!useDemoFallback && directions && directions.routes[0]) {
			const route = directions.routes[0].overview_path;
			if (route.length === 0) return;
			let i = 0;
			setCarPos(route[0]);
			animationIntervalRef.current = setInterval(() => {
				i++;
				if (i >= route.length) {
					clearInterval(animationIntervalRef.current!);
					animationIntervalRef.current = null;
					return;
				}
				setCarPos(route[i]);
			}, 500);
			return () => {
				if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
				animationIntervalRef.current = null;
			};
		}

		// Demo animation
		if (isLoaded && mapRef.current) {
			// Fit bounds to manualPath when no directions
			if (!directions) {
				const b = new google.maps.LatLngBounds();
				manualPath.forEach((p) => b.extend(p));
				mapRef.current.fitBounds(b, { padding: 60 });
			}

			let i = 0;
			setCarPos(new google.maps.LatLng(manualPath[0].lat, manualPath[0].lng));
			animationIntervalRef.current = setInterval(() => {
				i = (i + 1) % manualPath.length;
				const p = manualPath[i];
				setCarPos(new google.maps.LatLng(p.lat, p.lng));
			}, 800);
			return () => {
				if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
				animationIntervalRef.current = null;
			};
		}
	}, [directions, isLoaded, manualPath]);

	const onLoad = useCallback((map: google.maps.Map) => {
		mapRef.current = map;
		if (payload?.nodes?.length > 0) {
			const firstNode = payload.nodes[0];
			map.setCenter({ lat: firstNode.lat, lng: firstNode.lon });
		} else {
			map.setCenter(manualPath[0]);
		}
	}, [payload, manualPath]);

	const onUnmount = useCallback(() => {
		mapRef.current = null;
	}, []);

	// Calculate marker colors based on cost
	const getMarkerColor = (station: any, index: number, total: number) => {
		if (index === total - 1) return '#32D583'; // Destination (green)
		const costs = payload?.nodes?.map((n: any) => n.cost_per_kwh) || [];
		const minCost = Math.min(...costs);
		const maxCost = Math.max(...costs);
		const costRange = Math.max(maxCost - minCost, 1);
		const normalized = (station.cost_per_kwh - minCost) / costRange;
		return normalized < 0.5 ? '#00FFFF' : '#8A2BE2'; // Cyan for low cost, purple for high
	};

	if (!isLoaded) {
		return (
			<div className="relative h-full flex items-center justify-center bg-gray-900 rounded-2xl border border-cyan-400/30">
				<div className="text-cyan-200">Loading Google Maps...</div>
			</div>
		);
	}

	if (!apiKey) {
		return (
			<div className="relative h-full flex items-center justify-center bg-gray-900 rounded-2xl border border-cyan-400/30">
				<div className="text-red-400 text-center p-4">
					<p className="font-semibold">Google Maps API Key Missing</p>
					<p className="text-sm mt-2">Please set VITE_GOOGLE_MAPS_API_KEY in your .env file</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative h-full">
			<GoogleMap
				mapContainerStyle={mapContainerStyle}
				center={mapCenter}
				zoom={mapZoom}
				onLoad={onLoad}
				onUnmount={onUnmount}
				options={{
					disableDefaultUI: false,
					styles: futuristicDarkTheme,
					zoomControl: true,
					mapTypeControl: false,
					streetViewControl: false,
					fullscreenControl: true
				}}
			>
				{/* Optional Google Directions if available */}
				{directions && (
					<DirectionsRenderer
						directions={directions}
						options={{
							polylineOptions: {
								strokeColor: '#00FFFF',
								strokeWeight: 6,
								strokeOpacity: 0.8
							},
							suppressMarkers: true
						}}
					/>
				)}

				{/* Always draw a manual polyline for demo visibility */}
				<Polyline
					path={manualPath}
					options={{
						strokeColor: '#00FFFF',
						strokeOpacity: 0.9,
						strokeWeight: 6,
						zIndex: 2
					}}
				/>

				{/* Station markers from payload */}
				{payload?.nodes?.map((station: any, index: number) => {
					const color = getMarkerColor(station, index, payload.nodes.length);
					return (
						<Marker
							key={station.id}
							position={{ lat: station.lat, lng: station.lon }}
							label={{
								text: station.name || `Station ${station.id}`,
								color: '#000000',
								fontSize: '12px',
								fontWeight: 'bold'
							}}
							icon={{
								path: google.maps.SymbolPath.CIRCLE,
								scale: 8,
								fillColor: color,
								fillOpacity: 1,
								strokeColor: '#FFFFFF',
								strokeWeight: 2
							}}
						/>
					);
				})}

				{/* Demo markers when using demo path */}
				{(!payload?.nodes || payload.nodes.length === 0) && (
					<>
						<Marker position={demoPath[0]} label={{ text: 'Depot', color: '#000', fontSize: '12px', fontWeight: 'bold' }} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#00B5FF', fillOpacity: 1, strokeColor: '#FFFFFF', strokeWeight: 2 }} />
						<Marker position={demoPath[2]} label={{ text: 'Station A', color: '#000', fontSize: '12px', fontWeight: 'bold' }} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#8A2BE2', fillOpacity: 1, strokeColor: '#FFFFFF', strokeWeight: 2 }} />
						<Marker position={demoPath[4]} label={{ text: 'Station B', color: '#000', fontSize: '12px', fontWeight: 'bold' }} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#8A2BE2', fillOpacity: 1, strokeColor: '#FFFFFF', strokeWeight: 2 }} />
						<Marker position={demoPath[5]} label={{ text: 'Destination', color: '#000', fontSize: '12px', fontWeight: 'bold' }} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#32D583', fillOpacity: 1, strokeColor: '#FFFFFF', strokeWeight: 2 }} />
					</>
				)}

				{/* Animated EV marker */}
				{carPos && (
					<Marker
						position={carPos}
						icon={{
							path: google.maps.SymbolPath.CIRCLE,
							scale: 6,
							fillColor: '#00FFFF',
							fillOpacity: 0.95,
							strokeColor: '#003A3A',
							strokeWeight: 2
						}}
					/>
				)}
			</GoogleMap>

			{/* Legend */}
			<div className="absolute left-4 bottom-4 bg-black/50 backdrop-blur rounded p-3 text-xs space-y-1 border border-cyan-500/30 shadow-md z-10">
				<div className="font-semibold flex items-center gap-2 text-cyan-200">
					<span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
					Legend
				</div>
				<div className="flex items-center gap-2 text-cyan-100">
					<span className="inline-block w-3 h-3 rounded-full bg-[#00FFFF]" /> Low cost station
				</div>
				<div className="flex items-center gap-2 text-purple-200">
					<span className="inline-block w-3 h-3 rounded-full bg-[#8A2BE2]" /> High cost station
				</div>
				<div className="flex items-center gap-2 text-emerald-200">
					<span className="inline-block w-3 h-3 rounded-full bg-[#32D583]" /> Destination
				</div>
			</div>

			{/* SOC overlay */}
			{typeof currentSoc === 'number' && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-cyan-950/70 text-cyan-200 px-6 py-2 rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(0,255,255,0.3)] border border-cyan-500/40 transition z-10">
					<span className="font-medium tracking-wide">
						⚡ EV en route — Current SOC: {currentSoc.toFixed(0)}%
					</span>
				</div>
			)}

			{/* Loading indicator */}
			{loading && (
				<div className="absolute top-4 right-4 bg-black/60 border border-cyan-400/40 backdrop-blur px-3 py-2 rounded text-sm text-cyan-100 shadow-lg z-10">
					Computing route...
				</div>
			)}
		</div>
	);
}
