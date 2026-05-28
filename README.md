# Weather Monitoring Dashboard

Real-time weather monitoring dashboard built with React, TypeScript, and Vite.

## Author

Rubén Camero

## Features

- Real-time data via WebSocket with HTTP polling fallback
- Temperature and humidity line charts (Recharts)
- Current value indicator cards with color-coded status
- Connection status indicator (Live / Reconnecting)
- Last updated timestamp
- Fully responsive (mobile-friendly)

## Setup

```bash
npm install
npm run dev
```

## Testing

```bash
npm run test
```

## API

- REST: `GET http://192.168.20.167:5000/api/measurements/latest`
- WebSocket: `ws://192.168.20.167:5000/ws/measurements`

## Tech Stack

- React 19 + TypeScript
- Vite
- Recharts (charts)
- date-fns (date formatting)
- Vitest + React Testing Library (tests)
