# Campus Evaluation - Backend

This repository contains the backend services for the Campus Evaluation project.

## Projects

### vehicle-scheduler-be
A Node.js + Express API that fetches depots and vehicles from the Affordmed evaluation service and uses a knapsack algorithm to optimally schedule vehicles based on mechanic hours.

**Endpoint:**
```
GET /schedule
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "depotId": "...",
      "mechanicHours": 10,
      "totalImpact": 95,
      "selectedVehicles": [...]
    }
  ]
}
```

**Setup:**
```bash
cd vehicle-scheduler-be
npm install
node server.js
```

Configure `.env`:
```
ACCESS_TOKEN=<your_token>
LOG_TOKEN=<your_log_token>
BASE_URL=http://20.244.56.144/evaluation-service
PORT=3000
```

### logging-middleware
Shared logging utility that sends logs to the Affordmed evaluation service.

---

## Screenshots

### API Running
![Screenshot 1](Affordmed%20Screenshots/Screenshot%202026-06-23%20125852.png)

![Screenshot 2](Affordmed%20Screenshots/Screenshot%202026-06-23%20125856.png)
