/**
 * Formats large numbers into human-readable strings
 * Examples: 3.6M, 42.5K, 85.50
 * Keeps appropriate decimal places for money-like numbers when needed.
 */
export function formatLargeNumber(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + 'M'
  }
  if (abs >= 1_000) {
    return (n / 1_000).toFixed(abs >= 100_000 ? 0 : 1) + 'K'
  }
  if (typeof n === 'number' && !Number.isInteger(n)) {
    return n.toFixed(2)
  }
  return n.toString()
}

