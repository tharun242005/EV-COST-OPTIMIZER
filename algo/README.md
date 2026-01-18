# Optional Native C Integration

Expected usage:

On invocation, the backend will call the native binary with two file paths:

```
./algo/compute_route <input.json> <output.json>
```

Input JSON matches the API payload:
- nodes, edges, vehicle, optimization, hybrid_weight

Output JSON must match the backend contract:
```
{
  "optimal_path": [1,2,4],
  "total_cost": 60.25,
  "total_distance_km": 8.0,
  "total_time_min": 24,
  "soc_timeline": [ { "node":1, "soc":80 }, { "node":2, "soc":55, "charged_kwh":20 } ],
  "visual_path_geojson": { ... },
  "debug_steps": []
}
```

Windows: produce `compute_route.exe`
Linux/macOS: produce `compute_route`

Place the binary in `./algo/` and the backend will prefer it with a 1.5s timeout, falling back to JS if it fails.

Simple stub example (C pseudo-code):
```c
// compile to compute_route / compute_route.exe
// int main(int argc, char** argv) {
//   // argv[1] = input path, argv[2] = output path
//   // read input, run algorithm, write output JSON
//   return 0;
// }
```


