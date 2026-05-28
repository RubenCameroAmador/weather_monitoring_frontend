# Implementation Guide

## How This Dashboard Was Built (Step by Step)

### 1. Project Structure

```
src/
├── components/          # UI components
│   ├── Dashboard.tsx    # Main layout orchestrator
│   ├── Dashboard.css    # All styles (responsive)
│   ├── Header.tsx       # Title, author, last updated timestamp
│   ├── ConnectionStatus.tsx  # Live/Reconnecting indicator
│   ├── CurrentIndicators.tsx # Temperature & humidity cards
│   ├── TemperatureChart.tsx  # Line chart for temperature
│   └── HumidityChart.tsx     # Line chart for humidity
├── hooks/
│   └── useWeatherData.ts    # Data fetching logic (HTTP polling)
├── services/
│   └── api.ts               # HTTP client
├── types/
│   └── Measurement.ts       # TypeScript interface
└── tests/                   # Unit tests
```

---

### 2. Data Flow

```
Backend API (REST) → HTTP Polling (every 5s) → useWeatherData hook → Dashboard → Child Components
```

---

### 3. Real-Time Strategy: HTTP Polling

We originally planned WebSocket, but the backend does not expose a WebSocket endpoint. Instead, we use **HTTP polling every 5 seconds**:

```typescript
useEffect(() => {
  const pollData = async () => {
    const data = await fetch('/api/measurements/latest')
    // update state...
  }

  pollData()                              // Fetch immediately
  const interval = setInterval(pollData, 5000)  // Then every 5s

  return () => clearInterval(interval)    // Cleanup on unmount
}, [])
```

#### Why polling works here:
- The sensor sends data every ~10 seconds
- 5s polling gives near real-time updates
- No backend changes needed
- Simple and reliable

#### When to upgrade to WebSocket:
If you later add a WebSocket endpoint to your backend, you can upgrade the hook to use `new WebSocket(url)` with auto-reconnect (see Section 8 below for backend example).

---

### 4. CORS & Network Configuration

The frontend runs on a different host/port than the backend. Browsers block cross-origin requests by default.

**Solution:** The backend must enable CORS headers. For Flask:

```python
from flask_cors import CORS
CORS(app)
```

For FastAPI:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```

The frontend calls the API directly at `http://192.168.20.167:5000/api/measurements/latest`.

---

### 5. Charts (Recharts)

We use `recharts` library with `ResponsiveContainer` for automatic resizing:

- **TemperatureChart**: Red line (`#ff6b6b`) showing temperature over time
- **HumidityChart**: Teal line (`#4ecdc4`) showing humidity over time

Data is reversed (API returns newest first) so charts show left-to-right chronologically.

---

### 6. Responsive Design

CSS Grid with a media query:

```css
.charts-container {
  grid-template-columns: 1fr 1fr;  /* Two columns on desktop */
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;    /* One column on mobile */
  }
}
```

Indicator cards use `flex-wrap: wrap` to stack on small screens.

---

### 7. Testing

We use **Vitest** + **React Testing Library**:

```bash
npm run test
```

Tests verify:
- Components render correct text (title, author)
- Conditional CSS classes are applied (e.g., `.temp-hot` for high temps)
- Connection status messages display correctly

---

### 8. Future: Adding WebSocket to Your Backend

If you want true real-time (server pushes data), add this to your Flask backend:

```python
from flask_sock import Sock

sock = Sock(app)

@sock.route('/ws/measurements')
def ws_measurements(ws):
    while True:
        data = get_latest_measurements()
        ws.send(json.dumps(data))
        time.sleep(10)
```

Then update `useWeatherData.ts` to open a WebSocket connection with auto-reconnect.

---

### 9. Docker Deployment

The app includes a `Dockerfile` and `docker-compose.yml` for production deployment.

#### How it works:
1. **Build stage**: Uses Node to build the React app into static files
2. **Production stage**: Uses Nginx to serve the static files
3. **Nginx config**: Handles SPA routing and proxies `/api` requests to the backend

#### Deploy:
```bash
docker compose up -d --build
```

The app will be available on port `80` of your server.

#### Environment:
- Edit `nginx.conf` to change the backend API address if needed
- Edit `docker-compose.yml` to change the exposed port
