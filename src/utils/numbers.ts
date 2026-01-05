/**
 * Number utility functions for consistent decimal handling across the application.
 */

/**
 * Rounds a number to exactly 2 decimal places.
 * Uses multiplication/division method to avoid floating-point precision issues.
 *
 * @param value - The number to round
 * @returns The number rounded to 2 decimal places
 *
 * @example
 * roundToTwoDecimals(3.33 * 150) // 499.5
 * roundToTwoDecimals(10.999)     // 11
 * roundToTwoDecimals(0.1 + 0.2)  // 0.3 (not 0.30000000000000004)
 */
export function roundToTwoDecimals(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Calculates quantity × unit_price and rounds to 2 decimal places.
 * Used for delivery item total calculations.
 *
 * @param quantity - The quantity
 * @param unitPrice - The unit price
 * @returns The total amount rounded to 2 decimal places
 */
export function calculateItemTotal(quantity: number, unitPrice: number): number {
  const safeQuantity = Math.max(0, quantity || 0);
  const safeUnitPrice = Math.max(0, unitPrice || 0);
  return roundToTwoDecimals(safeQuantity * safeUnitPrice);
}

/**
 * Calculates unit price from total amount and quantity, rounded to 2 decimal places.
 *
 * @param totalAmount - The total amount
 * @param quantity - The quantity (must be > 0)
 * @returns The unit price rounded to 2 decimal places
 */
export function calculateUnitPrice(totalAmount: number, quantity: number): number {
  const safeTotal = Math.max(0, totalAmount || 0);
  const safeQuantity = Math.max(0.01, quantity || 0.01); // Prevent division by zero
  return roundToTwoDecimals(safeTotal / safeQuantity);
}
