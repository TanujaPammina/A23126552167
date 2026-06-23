function optimizeVehicles(vehicles, capacity) {
  const n = vehicles.length;
  // Guard: ensure capacity is a non-negative integer
  const cap = Math.floor(capacity);
  if (cap <= 0 || n === 0) {
    return { totalImpact: 0, selectedVehicles: [] };
  }

  const dp = Array(n + 1)
    .fill()
    .map(() => Array(cap + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const duration = vehicles[i - 1].Duration;
    const impact = vehicles[i - 1].Impact;

    for (let w = 0; w <= cap; w++) {
      if (duration <= w) {
        dp[i][w] = Math.max(
          impact + dp[i - 1][w - duration],
          dp[i - 1][w]
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  let w = cap;
  const selectedVehicles = [];

  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selectedVehicles.push(vehicles[i - 1]);
      w -= vehicles[i - 1].Duration;
    }
  }

  return {
    totalImpact: dp[n][cap],
    selectedVehicles
  };
}

module.exports = { optimizeVehicles };