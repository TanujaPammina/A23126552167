// Priority Inbox - Top N notifications by type weight + recency
// Priority: Placement (3) > Result (2) > Event (1)

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
