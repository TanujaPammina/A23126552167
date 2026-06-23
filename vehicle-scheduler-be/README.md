## Vehicle Scheduler Backend

A Node.js + Express REST API that fetches depot and vehicle data from the Affordmed evaluation service and uses a **0/1 Knapsack algorithm** to optimally schedule vehicles for each depot based on available mechanic hours.

### Tech Stack
- Node.js
- Express.js
- Axios
- dotenv
- cors

### Setup

```bash
npm install
node server.js
```

### Environment Variables

Create a `.env` file in this directory:

```
ACCESS_TOKEN=<your_affordmed_token>
LOG_TOKEN=<your_log_token>
BASE_URL=http://20.244.56.144/evaluation-service
PORT=3000
```

### API Endpoint

```
GET /schedule
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "depotId": "string",
      "mechanicHours": 10,
      "totalImpact": 95,
      "selectedVehicles": [...]
    }
  ]
}
```

### How It Works

1. Fetches all depots from the evaluation service
2. Fetches all vehicles from the evaluation service
3. For each depot, runs the knapsack algorithm using `MechanicHours` as the capacity and vehicle `Duration` / `Impact` as weight/value
4. Returns the optimal set of vehicles per depot with maximum total impact
