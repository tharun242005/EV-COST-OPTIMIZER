# ChargeRoute - EV Cost Optimization Platform

ChargeRoute is a React + TypeScript web application for intelligent electric vehicle (EV) route optimization. It calculates the most cost-efficient paths between charging stations by analyzing energy consumption, battery state-of-charge (SOC), charging costs, and distance. The platform features real-time route visualization on Google Maps, detailed cost analysis, and support for multiple optimization strategies (cost, time, and hybrid).

---

## Live App

This is a code bundle for ChargeRoute. The application runs locally:

**Frontend**: `http://localhost:5173`  
**Backend**: `http://localhost:5174`

---

## Tech Stack

- **React + TypeScript** (frontend UI with componentized architecture)
- **Vite** (fast development server and optimized builds)
- **Express + TypeScript** (backend API server)
- **Google Maps JavaScript API** (`@react-google-maps/api` for interactive map visualization)
- **Dijkstra Algorithm** (custom EV-aware pathfinding with SOC simulation)
- **Framer Motion** (smooth UI animations and transitions)
- **Tailwind CSS** (utility-first responsive styling)
- **Day.js** (date/time utilities)

---

## Features

### Core Functionality

- **EV Route Optimization** – Intelligent pathfinding that considers battery capacity, energy consumption, and charging station locations

- **Cost Analysis** – Real-time calculation of total trip cost based on charging station prices and energy consumption

- **Multi-Strategy Optimization** – Choose between cost-optimized, time-optimized, or hybrid routes

- **State-of-Charge (SOC) Tracking** – Real-time battery percentage tracking along the route with charging event visualization

- **Interactive Map Visualization** – Google Maps integration with animated route lines, station markers, and live EV position tracking

- **Demo Mode** – Pre-loaded sample data for quick testing and demonstration

- **Algorithm Visualization** – Step-by-step breakdown of the Dijkstra algorithm's pathfinding process

### UI/UX Features

- **Real-Time Route Animation** – Animated EV marker that moves along the computed route

- **Color-Coded Stations** – Visual indicators for station costs (cyan for low cost, purple for high cost, green for destination)

- **Performance Metrics Display** – Total cost, distance, time, and optimal path sequence

- **Responsive Design** – Mobile-first design that adapts to various screen sizes

- **Dark Theme** – Futuristic dark UI with cyan accents for modern aesthetic

---

## Getting Started

### Prerequisites

- **Node.js LTS** (v18 or higher recommended) and npm installed:

```bash
node -v
npm -v
```

### Installation

1. **Clone the repository** or navigate to the project directory.

2. **Install frontend dependencies:**

```bash
cd frontend
npm install
```

3. **Install backend dependencies:**

```bash
cd ../backend
npm install
```

4. **Set up environment variables:**

Create a `.env` file in the `frontend` directory:

```env
VITE_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
```

**Notes:**
- Get your API key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
- Enable **Maps JavaScript API** and **Directions API** in your Google Cloud project
- Vite only exposes variables prefixed with `VITE_` to the client

5. **Start the backend server:**

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:5174` (or as configured).

6. **Start the frontend development server:**

```bash
cd frontend
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`). Open it in your browser.

7. **Build for production:**

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
```bash
cd backend
npm run build
```

---

## Environment Variables

Required environment variables for the frontend:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GOOGLE_MAPS_API_KEY` | Your Google Maps JavaScript API key | Yes |

Create a `.env` file in the `frontend` directory:

```env
VITE_GOOGLE_MAPS_API_KEY="your_api_key_here"
```

**Security Notes:**
- Never commit `.env` files with actual keys to version control
- Restrict your API key to specific domains in Google Cloud Console
- Consider using API key restrictions for production deployments

---

## Project Structure

```
Ev_cost_optimization/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Main application component and state management
│   │   ├── main.tsx                   # React entry point
│   │   ├── components/
│   │   │   ├── MapCanvas.tsx          # Google Maps integration and route visualization
│   │   │   ├── ControlPanel.tsx       # Route input controls and mode selection
│   │   │   ├── ResultsPanel.tsx       # Cost, distance, time, and path display
│   │   │   ├── AlgorithmStepper.tsx   # Step-by-step algorithm visualization
│   │   │   └── SimulationHUD.tsx      # Simulation status and SOC display
│   │   ├── lib/
│   │   │   └── api.ts                 # API client for backend communication
│   │   ├── styles/
│   │   │   ├── tailwind.css           # Tailwind CSS directives
│   │   │   └── variables.css          # CSS custom properties
│   │   └── public/
│   │       └── sample-data.json       # Demo data for testing
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/
│   ├── src/
│   │   ├── server.ts                  # Express server setup and middleware
│   │   ├── routes/
│   │   │   └── computeRoute.ts        # Route computation API endpoint
│   │   ├── algorithm/
│   │   │   ├── dijkstra.ts            # Main EV-aware Dijkstra implementation
│   │   │   ├── js/
│   │   │   │   └── dijkstra.ts        # Alternative JS implementation
│   │   │   └── native-wrapper.ts      # Native C binary wrapper (optional)
│   │   └── tests/
│   │       └── run-tests.ts           # Test suite
│   ├── package.json
│   └── tsconfig.json
│
├── algo/
│   ├── compute_route.c                # Native C implementation (optional)
│   └── README.md
│
└── README.md                          # This file
```

---

## Key Features Deep Dive

### EV-Aware Route Optimization

The platform uses a custom Dijkstra algorithm that extends traditional pathfinding to account for:

- **Battery State-of-Charge (SOC)** – Tracks remaining battery percentage throughout the journey
- **Energy Consumption** – Calculates energy needed based on distance and vehicle consumption rate
- **Charging Costs** – Factors in per-kWh pricing at different charging stations
- **Charging Heuristics** – Automatically suggests charging when SOC drops below 20%
- **Multi-Objective Optimization** – Supports cost, time, and hybrid optimization strategies

### Route Visualization

- **Google Maps Integration** – Full-featured interactive map with zoom, pan, and street view
- **Animated Route Lines** – Cyan-colored polyline showing the optimal path
- **Station Markers** – Color-coded markers indicating station costs and destination
- **Live EV Animation** – Real-time marker movement along the computed route
- **SOC Timeline** – Visual representation of battery state at each waypoint

### Algorithm Insights

- **Step-by-Step Breakdown** – View the algorithm's decision-making process
- **Debug Steps** – See each relaxation and path evaluation
- **Cost Analysis** – Understand how total cost is calculated from individual segments

---

## API Endpoints

### POST `/api/compute-route`

Computes the optimal EV route based on input parameters.

**Request Body:**
```json
{
  "nodes": [
    {
      "id": 1,
      "name": "Depot",
      "lat": 12.9716,
      "lon": 77.5946,
      "cost_per_kwh": 8.5
    }
  ],
  "edges": [
    {
      "from": 1,
      "to": 2,
      "distance_km": 5.2,
      "time_min": 8
    }
  ],
  "vehicle": {
    "battery_kwh": 60,
    "initial_soc_pct": 80,
    "consumption_kwh_per_km": 0.2
  },
  "optimization": "cost"
}
```

**Response:**
```json
{
  "status": "ok",
  "optimal_path": [1, 2, 4],
  "total_cost": 3.80,
  "total_distance_km": 8.0,
  "total_time_min": 24,
  "soc_timeline": [
    { "node": 1, "soc": 80 },
    { "node": 2, "soc": 75 },
    { "node": 4, "soc": 70 }
  ],
  "visual_path_geojson": { ... },
  "debug_steps": [ ... ],
  "used": "js",
  "fallbackFromNative": "native-binary-missing"
}
```

---

## Scripts

### Frontend Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Create optimized production bundle in `dist/` |
| `npm run preview` | Serve the production build locally |

### Backend Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Express server with tsx (hot reload) |
| `npm run build` | Compile TypeScript to JavaScript in `dist/` |
| `npm start` | Run production build from `dist/` |
| `npm test` | Run test suite |

---

## Algorithm Details

### EV-Aware Dijkstra Implementation

The core algorithm (`backend/src/algorithm/dijkstra.ts`) implements:

1. **State Representation**: Each state includes node ID, cumulative cost, SOC percentage, and distance traveled

2. **Energy Calculation**: For each edge traversal:
   - Calculate energy needed: `distance_km × consumption_kwh_per_km`
   - Convert to SOC drop: `(energy_needed / battery_kwh) × 100`

3. **Charging Logic**: If SOC drops below 20%, simulate charging to 80% at current node's price

4. **Cost Calculation**:
   - Travel energy cost: Charged at destination node's price
   - Charging cost: Based on current node's price (if charging occurs)

5. **Path Reconstruction**: Backtrack from destination to build the optimal path

### Optimization Strategies

- **Cost**: Minimizes total monetary cost (charging + travel)
- **Time**: Minimizes total travel time (distance-based or explicit time values)
- **Hybrid**: Weighted combination of cost and time (configurable weight)

---

## Deployment

### Frontend Deployment (Vite)

**Firebase Hosting:**
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

**Netlify:**
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: Add `VITE_GOOGLE_MAPS_API_KEY` in Netlify dashboard

**Vercel:**
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

### Backend Deployment

Deploy the compiled `dist/` folder to:
- **Heroku** (Node.js buildpack)
- **Railway** (auto-detects Node.js)
- **DigitalOcean App Platform**
- **AWS EC2 / ECS**
- **Azure App Service**

Ensure the backend URL is updated in the frontend API client (`frontend/src/lib/api.ts`).

---

## Browser Compatibility

- **Chrome/Edge** (recommended) – Full support
- **Firefox** – Full support
- **Safari** – Full support
- **Mobile Browsers** – Responsive design works on tablets and phones

**Note:** Google Maps requires a valid API key and may have usage limits based on your billing plan.

---

## Performance Considerations

- **Algorithm Efficiency**: Dijkstra algorithm with priority queue for O(V log V + E) complexity
- **Map Rendering**: Optimized polyline and marker rendering with Google Maps
- **Animation Performance**: GPU-accelerated animations using Framer Motion
- **API Caching**: Consider caching route results for identical inputs
- **Bundle Size**: Code splitting and tree-shaking via Vite

---

## Troubleshooting

### Common Issues

**Google Maps not loading:**
- Verify `VITE_GOOGLE_MAPS_API_KEY` is set in `.env`
- Check API key restrictions in Google Cloud Console
- Ensure Maps JavaScript API and Directions API are enabled

**Backend connection errors:**
- Verify backend is running on correct port
- Check CORS settings in `backend/src/server.ts`
- Ensure API endpoint URL matches in `frontend/src/lib/api.ts`

**Route computation fails:**
- Verify payload includes all required fields (nodes, edges, vehicle)
- Check that nodes have valid lat/lon coordinates
- Ensure at least 2 nodes exist (start and destination)

**Build errors:**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Ensure Node.js version is LTS (v18+)
- Check for TypeScript errors: `npm run build`

---

## Contributing

We welcome contributions! Here are some guidelines:

1. **Open issues** with clear reproduction steps and environment information
2. **Submit PRs** following existing code style and structure
3. **Test thoroughly** before submitting, especially route computation logic
4. **Update documentation** if adding new features or changing behavior

---

## License

This project is proprietary software. All rights reserved.

For licensing inquiries, please contact the project maintainer.

---

## Acknowledgments

- **Google Maps** – For providing comprehensive mapping and routing services
- **React Team** – For the powerful frontend framework
- **Framer Motion** – For smooth, performant animations
- **Tailwind CSS** – For rapid, maintainable styling
- **Express.js** – For the robust backend framework

---

## Contact & Support

- **Email**: run40081@gmail.com
- **Location**: Bengaluru, India
- **Phone**: +91 9731783858

---

## References

- [Vite Documentation](https://vite.dev/guide/) – Getting Started with Vite
- [React Documentation](https://react.dev/) – Learn React
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) – Maps API Guide
- [Express.js Documentation](https://expressjs.com/) – Express Framework
- [Dijkstra's Algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) – Algorithm Reference
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) – Styling Framework

---

**Built by [THARUN P](https://www.linkedin.com/in/tharun-p-4146b4318/) from [AlgoNomad](https://github.com/tharun242005)**

© 2025 ChargeRoute. All rights reserved.
