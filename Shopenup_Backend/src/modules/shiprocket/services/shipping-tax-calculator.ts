/**
 * Shipping Tax Calculator Service
 * 
 * Handles tax-inclusive shipping calculations for Shiprocket shipping options.
 * Extracts tax from tax-inclusive shipping amounts and creates tax lines.
 */

interface TaxCalculationResult {
  baseAmount: number;
  taxAmount: number;
  taxRate: number;
  taxLines: Array<{
    code: string;
    name: string;
    rate: number;
    amount: number;
  }>;
}

export class ShippingTaxCalculator {
  /**
   * Default GST rate (18% for India)
   * Can be configured via environment variable
   */
  private static readonly DEFAULT_GST_RATE = parseFloat(
    process.env.SHIPROCKET_GST_RATE || "18"
  );

  /**
   * Extract tax from tax-inclusive shipping amount
   * Formula: tax = (inclusive_amount * tax_rate) / (100 + tax_rate)
   *          base = inclusive_amount - tax
   * 
   * @param inclusiveAmount - The tax-inclusive shipping amount
   * @param taxRate - The tax rate percentage (e.g., 18 for 18%)
   * @returns Object with base amount, tax amount, and tax rate
   */
  static extractTaxFromInclusiveAmount(
    inclusiveAmount: number,
    taxRate: number = this.DEFAULT_GST_RATE
  ): TaxCalculationResult {
    if (inclusiveAmount <= 0) {
      return {
        baseAmount: 0,
        taxAmount: 0,
        taxRate: 0,
        taxLines: [],
      };
    }

    // Calculate tax amount: tax = (inclusive * rate) / (100 + rate)
    const taxAmount = Math.round(
      (inclusiveAmount * taxRate) / (100 + taxRate)
    );

    // Calculate base amount: base = inclusive - tax
    const baseAmount = inclusiveAmount - taxAmount;

    // Create tax line
    const taxLines = [
      {
        code: "GST",
        name: "GST (Goods and Services Tax)",
        rate: taxRate,
        amount: taxAmount,
      },
    ];

    return {
      baseAmount,
      taxAmount,
      taxRate,
      taxLines,
    };
  }

  /**
   * Check if shipping option has tax-inclusive flag
   * 
   * @param shippingOption - The shipping option object
   * @returns true if tax-inclusive flag is set
   */
  static isTaxInclusive(shippingOption: any): boolean {
    if (!shippingOption) {
      return false;
    }

    // Check metadata flag
    const metadata = shippingOption.metadata || {};
    const taxInclusiveFlag = metadata.shiprocket_tax_inclusive;

    // Accept "true" (string), true (boolean), or "1"
    return (
      taxInclusiveFlag === "true" ||
      taxInclusiveFlag === true ||
      taxInclusiveFlag === "1"
    );
  }

  /**
   * Get tax rate from shipping option metadata or use default
   * 
   * @param shippingOption - The shipping option object
   * @returns Tax rate percentage
   */
  static getTaxRate(shippingOption: any): number {
    if (!shippingOption) {
      return this.DEFAULT_GST_RATE;
    }

    const metadata = shippingOption.metadata || {};
    const customRate = metadata.shiprocket_tax_rate;

    if (customRate && !isNaN(parseFloat(customRate))) {
      return parseFloat(customRate);
    }

    return this.DEFAULT_GST_RATE;
  }

  /**
   * Process shipping method and extract tax if tax-inclusive
   * 
   * @param shippingMethod - The shipping method from cart
   * @returns Updated shipping method with tax lines and flags, or null if not tax-inclusive
   */
  static processShippingMethod(shippingMethod: any): any | null {
    if (!shippingMethod || !shippingMethod.shipping_option) {
      return null;
    }

    const shippingOption = shippingMethod.shipping_option;
    
    // Check if this shipping option is tax-inclusive
    if (!this.isTaxInclusive(shippingOption)) {
      return null;
    }

    // Get the shipping amount (this is tax-inclusive)
    const inclusiveAmount = shippingMethod.amount || 0;

    if (inclusiveAmount <= 0) {
      return null;
    }

    // Get tax rate
    const taxRate = this.getTaxRate(shippingOption);

    // Extract tax from inclusive amount
    const taxCalculation = this.extractTaxFromInclusiveAmount(
      inclusiveAmount,
      taxRate
    );

    // Update shipping method
    return {
      ...shippingMethod,
      amount: taxCalculation.baseAmount, // Set base amount (tax-exclusive)
      is_tax_inclusive: true,
      tax_lines: taxCalculation.taxLines,
      // Keep original inclusive amount in metadata for reference
      metadata: {
        ...(shippingMethod.metadata || {}),
        original_inclusive_amount: inclusiveAmount,
        tax_extracted: taxCalculation.taxAmount,
        tax_rate: taxRate,
      },
    };
  }

  /**
   * Calculate total shipping tax from all shipping methods in cart
   * 
   * @param shippingMethods - Array of shipping methods
   * @returns Total shipping tax amount
   */
  static calculateTotalShippingTax(shippingMethods: any[]): number {
    if (!shippingMethods || !Array.isArray(shippingMethods)) {
      return 0;
    }

    return shippingMethods.reduce((total, method) => {
      if (!this.isTaxInclusive(method?.shipping_option)) {
        return total;
      }

      const inclusiveAmount = method.amount || 0;
      const taxRate = this.getTaxRate(method?.shipping_option);
      const taxCalculation = this.extractTaxFromInclusiveAmount(
        inclusiveAmount,
        taxRate
      );

      return total + taxCalculation.taxAmount;
    }, 0);
  }
}

