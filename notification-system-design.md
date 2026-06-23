# Notification System Design

---

## Stage 1

### Core Actions the Notification Platform Should Support

1. Fetch all notifications for a logged-in student
2. Mark a notification as read
3. Mark all notifications as read
4. Get unread notification count
5. Send a notification to a student (admin/system action)
6. Real-time delivery of notifications when logged in

---

### REST API Endpoints

#### 1. Get All Notifications for a Student

```
GET /api/notifications
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "type": "Placement",
        "message": "TCS hiring drive on 25th June",
        "isRead": false,
        "createdAt": "2026-06-23T10:00:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

---

#### 2. Mark a Notification as Read

```
PATCH /api/notifications/:id/read
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

#### 3. Mark All Notifications as Read

```
PATCH /api/notifications/read-all
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

#### 4. Get Unread Count

```
GET /api/notifications/unread-count
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

---

#### 5. Send Notification (Admin/System)

```
POST /api/notifications
```

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "studentId": "student-uuid",
  "type": "Placement",
  "message": "TCS hiring drive on 25th June"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "studentId": "student-uuid",
    "type": "Placement",
    "message": "TCS hiring drive on 25th June",
    "isRead": false,
    "createdAt": "2026-06-23T10:00:00Z"
  }
}
```

---

### Real-Time Notification Mechanism

**Chosen approach: WebSockets (Socket.IO)**

When a student logs in, the client establishes a WebSocket connection. When a new notification is created (via POST), the server emits an event to the student's socket room in real time.

```
Client connects → joins room: "student-<studentId>"
Server emits:    "new_notification" event with payload
Client receives: notification instantly without polling
```

**Why WebSockets over polling:**
- Polling hammers the DB on every page load (see Stage 4)
- WebSockets keep a persistent connection — server pushes only when needed
- Lower latency, lower server load

---

## Stage 2

### Recommended Database: PostgreSQL (Relational)

**Why PostgreSQL:**
- Notifications have a well-defined, consistent schema
- Strong support for indexing, which is critical for read-heavy queries
- Native support for enums (`notification_type`)
- ACID compliance ensures no notification is lost
- Easy to query with filters (unread, by type, by date)

---

### DB Schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Problems as Data Volume Increases

| Problem | Cause | Solution |
|--------|-------|---------|
| Slow reads | Full table scan on `student_id` + `is_read` | Add composite index |
| Storage bloat | Millions of old read notifications | Archive/delete old records |
| Write bottleneck | 50,000 inserts at once (bulk notify) | Use message queue (see Stage 5) |
| Connection limits | Too many concurrent DB connections | Use connection pooling (pg-pool) |

---

### SQL Queries Based on Stage 1 APIs

**Fetch all notifications for a student:**
```sql
SELECT id, type, message, is_read, created_at
FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC;
```

**Mark one notification as read:**
```sql
UPDATE notifications
SET is_read = TRUE
WHERE id = $1 AND student_id = $2;
```

**Mark all as read:**
```sql
UPDATE notifications
SET is_read = TRUE
WHERE student_id = $1 AND is_read = FALSE;
```

**Get unread count:**
```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE student_id = $1 AND is_read = FALSE;
```

**Insert a new notification:**
```sql
INSERT INTO notifications (student_id, type, message)
VALUES ($1, $2, $3)
RETURNING *;
```

---

## Stage 3

### Is the query accurate?

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

The query is **logically correct** but **performs poorly** at scale.

---

### Why is it slow?

With 50,000 students and 5,000,000 notifications:
- No index on `studentID` or `isRead` → PostgreSQL does a **full table scan** of 5M rows
- `SELECT *` fetches all columns including large `message` text unnecessarily
- `ORDER BY createdAt DESC` requires sorting the filtered result set

---

### What to change

```sql
-- Optimized query
SELECT id, type, message, is_read, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC;
```

**Add a composite index:**
```sql
CREATE INDEX idx_notifications_student_unread
ON notifications (student_id, is_read, created_at DESC);
```

This index lets PostgreSQL:
1. Jump directly to rows for `student_id = 1042`
2. Filter `is_read = false` within that subset
3. Return already-sorted results without a separate sort step

**Likely computation cost improvement:**
- Before index: O(N) full scan → slow at 5M rows
- After index: O(log N + K) where K = matching rows → very fast

---

### Should you index every column?

**No.** Indexing every column is bad advice because:
- Each index takes disk space and memory
- Every `INSERT`, `UPDATE`, `DELETE` must update all indexes → slower writes
- For a high-write notification system, this causes significant overhead
- Only index columns used in `WHERE`, `ORDER BY`, or `JOIN` clauses

---

### Query: Students who got a Placement notification in the last 7 days

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

**Supporting index:**
```sql
CREATE INDEX idx_notifications_type_created
ON notifications (type, created_at DESC);
```

---

## Stage 4

### Problem

Notifications are fetched on every page load for every student. With 50,000 students, this causes:
- Thousands of simultaneous DB queries
- DB connection pool exhaustion
- Slow response times and poor UX

---

### Solutions and Tradeoffs

#### 1. Caching with Redis (Recommended)

Cache each student's notifications in Redis with a short TTL.

```
Client → Check Redis cache
       → Cache HIT  → Return cached data (fast)
       → Cache MISS → Query DB → Store in Redis → Return data
```

**Implementation:**
```js
const cacheKey = `notifications:${studentId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const data = await db.query(...);
await redis.setex(cacheKey, 60, JSON.stringify(data)); // 60s TTL
return data;
```

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Dramatically reduces DB load | Slight staleness (up to TTL) |
| Fast response times | Extra infra (Redis server) |
| Scales horizontally | Cache invalidation complexity |

Invalidate cache when a new notification is inserted or marked read.

---

#### 2. WebSocket Push (from Stage 1)

Instead of fetching on every page load, push updates to connected clients via WebSocket. Client only fetches on initial load; subsequent updates arrive via socket events.

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Zero DB queries for real-time updates | Persistent connections use memory |
| Instant delivery | Requires Socket.IO/WebSocket server |
| Best UX | Reconnection logic needed |

---

#### 3. Pagination

Limit results per request instead of loading all notifications.

```sql
SELECT * FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT 20 OFFSET $2;
```

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Smaller payloads | More client-side logic |
| Lower DB memory usage | Doesn't solve connection volume |

---

### Recommended Combined Strategy

1. **Redis cache** for initial page load (60s TTL)
2. **WebSocket** for real-time updates without polling
3. **Pagination** to limit payload size
4. **DB indexes** (Stage 3) to keep queries fast when cache misses occur

---

## Stage 5

### Shortcomings of the Original Implementation

```js
function notify_all(student_ids, message) {
  for (student_id in student_ids) {
    send_email(student_id, message)   // calls Email API
    save_to_db(student_id, message)   // DB insert
    push_to_app(student_id, message)  // WebSocket push
  }
}
```

**Problems:**
1. **Sequential loop** — 50,000 iterations one by one is extremely slow
2. **No error handling** — if `send_email` fails at student 200, the loop crashes and remaining 49,800 students are skipped entirely
3. **Tightly coupled** — email, DB write, and push happen together; one failure blocks the others
4. **No retry mechanism** — failed emails are silently lost
5. **Synchronous blocking** — holds the server thread for the entire duration

---

### What happens when send_email fails for 200 students midway?

With the original code — nothing. The loop stops and the remaining students never get notified. There is no way to know which students were notified and which were not.

---

### Should DB save and email sending happen together?

**No.** They should be decoupled because:
- DB write is fast and local; email API is slow and external
- If the email service is down, the notification should still be stored in DB
- Atomically coupling them means either both succeed or both fail — but a student not receiving an email shouldn't mean they don't get an in-app notification

---

### Redesigned Implementation: Message Queue + Async Workers

```
notify_all(student_ids, message)
    |
    v
Save batch job to DB (job_id, status=pending)
    |
    v
Push all student_ids to Message Queue (e.g. Redis Queue / BullMQ)
    |
    v
[Worker Pool - Email Worker]     [Worker Pool - Push Worker]
    |                                   |
send_email with retry (3 attempts)   push_to_app via WebSocket
    |                                   |
on success → mark delivered         on success → mark delivered
on failure → mark failed, log error
```

**Revised Pseudocode:**
```js
async function notify_all(student_ids, message) {
  // 1. Save intent to DB immediately
  const job = await db.createBulkJob({ student_ids, message, status: 'pending' });

  // 2. Push to queue in batches (non-blocking)
  const batches = chunk(student_ids, 500);
  for (const batch of batches) {
    await emailQueue.addBulk(batch.map(id => ({ data: { id, message, jobId: job.id } })));
    await pushQueue.addBulk(batch.map(id => ({ data: { id, message } })));
  }

  return { success: true, jobId: job.id };
}

// Email Worker (separate process)
emailQueue.process(async (job) => {
  const { id, message, jobId } = job.data;
  try {
    await send_email(id, message);
    await db.markDelivered(jobId, id, 'email');
  } catch (err) {
    await db.markFailed(jobId, id, 'email', err.message);
    throw err; // BullMQ retries automatically
  }
});
```

**Why this is better:**
| Feature | Original | Redesigned |
|---------|----------|------------|
| Speed | Sequential, slow | Parallel workers, fast |
| Fault tolerance | Crashes on failure | Retries per student |
| Decoupling | Tightly coupled | Email/push independent |
| Observability | None | Job status tracked in DB |
| Partial failure | Silent data loss | Failed list available for retry |

---

## Stage 6

### Priority Inbox — Top N Most Important Unread Notifications

**Priority Rule:** `Placement > Result > Event`, with recency as tiebreaker.

**Approach: Weighted Scoring + Max-Heap**

Assign a weight to each notification type, compute a score combining weight and recency, then use a max-heap (priority queue) to efficiently extract the top N.

---

### Score Formula

```
score = typeWeight * 1,000,000 + timestampEpochSeconds
```

| Type | Weight |
|------|--------|
| Placement | 3 |
| Result | 2 |
| Event | 1 |

This ensures type dominates, but among same-type notifications the most recent appears first.

---

### Implementation (JavaScript)

```js
// notification-app-be/priorityInbox.js

class MaxHeap {
  constructor() { this.heap = []; }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].score >= this.heap[i].score) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let largest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].score > this.heap[largest].score) largest = l;
      if (r < n && this.heap[r].score > this.heap[largest].score) largest = r;
      if (largest === i) break;
      [this.heap[largest], this.heap[i]] = [this.heap[i], this.heap[largest]];
      i = largest;
    }
  }

  get size() { return this.heap.length; }
}

const TYPE_WEIGHT = { Placement: 3, Result: 2, Event: 1 };

function getScore(notification) {
  const weight = TYPE_WEIGHT[notification.Type] || 0;
  const timestamp = Math.floor(new Date(notification.Timestamp).getTime() / 1000);
  return weight * 1_000_000 + timestamp;
}

function getTopN(notifications, n = 10) {
  const heap = new MaxHeap();

  for (const notif of notifications) {
    const score = getScore(notif);
    heap.push({ ...notif, score });
  }

  const result = [];
  const limit = Math.min(n, heap.size);
  for (let i = 0; i < limit; i++) {
    result.push(heap.pop());
  }
  return result;
}

module.exports = { getTopN };
```

---

### Maintaining Top N Efficiently as New Notifications Arrive

Use a **fixed-size min-heap of size N**:

- Keep a min-heap of the top N notifications (min at root = lowest priority among top N)
- When a new notification arrives, compute its score
- If `score > heap.min` → remove min, insert new notification
- This keeps the heap always containing the top N in O(log N) per insert

```js
function maintainTopN(heap, newNotif, n = 10) {
  const score = getScore(newNotif);
  if (heap.size < n) {
    heap.pushMin({ ...newNotif, score });
  } else if (score > heap.peekMin().score) {
    heap.popMin();
    heap.pushMin({ ...newNotif, score });
  }
}
```

**Time complexity:** O(log N) per new notification — efficient regardless of total notification volume.

---

### API Integration

The controller fetches from the Affordmed Notification API and returns top N:

```js
// GET /api/notifications/priority?n=10
exports.getPriorityNotifications = async (req, res) => {
  const n = parseInt(req.query.n) || 10;
  const TOKEN = process.env.ACCESS_TOKEN;

  const response = await axios.get(
    "http://4.224.186.213/evaluation-service/notifications",
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );

  const notifications = response.data.notifications;
  const top = getTopN(notifications, n);

  res.status(200).json({ success: true, data: top });
};
```

**Notification API used:**
```
GET http://4.224.186.213/evaluation-service/notifications
Authorization: Bearer <token>
```

**Sample notification schema from API:**
```json
{
  "ID": "d146095a-0d86-4a34-9e69-3900a14576bc",
  "Type": "Result",
  "Message": "mid-sem",
  "Timestamp": "2026-04-22 17:51:30"
}
```
