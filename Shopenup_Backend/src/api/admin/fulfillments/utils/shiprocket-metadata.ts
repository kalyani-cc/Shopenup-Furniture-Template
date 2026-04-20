/**
 * Shiprocket Fulfillment Metadata Standardization
 * 
 * This utility provides standardized structure for storing Shiprocket data in fulfillment.data
 * 
 * Metadata Structure:
 * {
 *   // Core Identifiers (required for tracking)
 *   awb_code: string,                    // AWB tracking number
 *   shiprocket_order_id: number,         // Shiprocket order ID
 *   shiprocket_shipment_id: number,      // Shiprocket shipment ID
 * 
 *   // Status Tracking (updated by webhooks)
 *   last_status: string,                 // Current status: "Picked Up", "Delivered", etc.
 *   last_status_at: string,              // ISO timestamp of last status update
 *   current_status_id: number,           // Shiprocket status ID
 * 
 *   // Courier Information
 *   courier_name: string,                // Courier service name
 *   courier_id: number,                   // Courier ID
 * 
 *   // Tracking & URLs
 *   tracking_url: string,                // Shiprocket tracking URL
 *   label_url: string,                   // Shipping label download URL
 *   manifest_url: string,                // Manifest download URL
 *   scans: Array<{                        // Tracking scan history
 *     date: string,
 *     activity: string,
 *     location: string
 *   }>,
 * 
 *   // Timestamps (informative)
 *   packed_at: string,                   // ISO timestamp when packed
 *   shipped_at: string,                  // ISO timestamp when shipped (also in fulfillment.shipped_at)
 *   delivered_at: string,                // ISO timestamp when delivered (also in fulfillment.delivered_at)
 *   awb_assigned_at: string,             // ISO timestamp when AWB was assigned
 * 
 *   // Pickup Information
 *   pickup_status: string,               // "Scheduled", "Picked Up", etc.
 *   pickup_token_number: string,         // Pickup token number
 *   pickup_scheduled_date: string,       // Scheduled pickup date/time
 *   pickup_requested_at: string,          // ISO timestamp when pickup was requested
 * 
 *   // Manifest Information
 *   manifest_id: string,                 // Manifest ID
 *   manifest_generated_at: string,       // ISO timestamp when manifest was generated
 * 
 *   // Additional Info
 *   invoice_no: string,                  // Invoice number
 *   routing_code: string,                // Routing code
 *   rto_routing_code: string,           // RTO routing code
 *   applied_weight: number,              // Applied weight in kg
 * }
 */

export interface ShiprocketMetadata {
  // Core Identifiers
  awb_code?: string;
  shiprocket_order_id?: number;
  shiprocket_shipment_id?: number;

  // Status Tracking
  last_status?: string;
  last_status_at?: string;
  current_status_id?: number;

  // Courier Information
  courier_name?: string;
  courier_id?: number;

  // Tracking & URLs
  tracking_url?: string;
  label_url?: string;
  manifest_url?: string;
  scans?: Array<{
    date: string;
    activity: string;
    location: string;
  }>;

  // Timestamps
  packed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  awb_assigned_at?: string;

  // Pickup Information
  pickup_status?: string;
  pickup_token_number?: string;
  pickup_scheduled_date?: string;
  pickup_requested_at?: string;

  // Manifest Information
  manifest_id?: string;
  manifest_generated_at?: string;

  // Additional Info
  invoice_no?: string;
  routing_code?: string;
  rto_routing_code?: string;
  applied_weight?: number;
}

/**
 * Standardize Shiprocket metadata by keeping only informative fields
 * Removes redundant or unnecessary data
 */
export function standardizeShiprocketMetadata(
  existingData: any,
  updates: Partial<ShiprocketMetadata>
): Record<string, unknown> {
  // Start with existing data, but only keep standardized fields
  const standardized: ShiprocketMetadata = {
    // Core Identifiers
    ...(existingData?.awb_code && { awb_code: existingData.awb_code }),
    ...(existingData?.shiprocket_order_id && { shiprocket_order_id: existingData.shiprocket_order_id }),
    ...(existingData?.shiprocket_shipment_id && { shiprocket_shipment_id: existingData.shiprocket_shipment_id }),

    // Status Tracking
    ...(existingData?.last_status && { last_status: existingData.last_status }),
    ...(existingData?.last_status_at && { last_status_at: existingData.last_status_at }),
    ...(existingData?.current_status_id && { current_status_id: existingData.current_status_id }),

    // Courier Information
    ...(existingData?.courier_name && { courier_name: existingData.courier_name }),
    ...(existingData?.courier_id && { courier_id: existingData.courier_id }),

    // Tracking & URLs
    ...(existingData?.tracking_url && { tracking_url: existingData.tracking_url }),
    ...(existingData?.label_url && { label_url: existingData.label_url }),
    ...(existingData?.manifest_url && { manifest_url: existingData.manifest_url }),
    ...(existingData?.scans && Array.isArray(existingData.scans) && { scans: existingData.scans }),

    // Timestamps
    ...(existingData?.packed_at && { packed_at: existingData.packed_at }),
    ...(existingData?.shipped_at && { shipped_at: existingData.shipped_at }),
    ...(existingData?.delivered_at && { delivered_at: existingData.delivered_at }),
    ...(existingData?.awb_assigned_at && { awb_assigned_at: existingData.awb_assigned_at }),

    // Pickup Information
    ...(existingData?.pickup_status && { pickup_status: existingData.pickup_status }),
    ...(existingData?.pickup_token_number && { pickup_token_number: existingData.pickup_token_number }),
    ...(existingData?.pickup_scheduled_date && { pickup_scheduled_date: existingData.pickup_scheduled_date }),
    ...(existingData?.pickup_requested_at && { pickup_requested_at: existingData.pickup_requested_at }),

    // Manifest Information
    ...(existingData?.manifest_id && { manifest_id: existingData.manifest_id }),
    ...(existingData?.manifest_generated_at && { manifest_generated_at: existingData.manifest_generated_at }),

    // Additional Info
    ...(existingData?.invoice_no && { invoice_no: existingData.invoice_no }),
    ...(existingData?.routing_code && { routing_code: existingData.routing_code }),
    ...(existingData?.rto_routing_code && { rto_routing_code: existingData.rto_routing_code }),
    ...(existingData?.applied_weight !== undefined && { applied_weight: existingData.applied_weight }),
  };

  // Apply updates (only standardized fields)
  if (updates.awb_code !== undefined) standardized.awb_code = updates.awb_code;
  if (updates.shiprocket_order_id !== undefined) standardized.shiprocket_order_id = updates.shiprocket_order_id;
  if (updates.shiprocket_shipment_id !== undefined) standardized.shiprocket_shipment_id = updates.shiprocket_shipment_id;
  if (updates.last_status !== undefined) standardized.last_status = updates.last_status;
  if (updates.last_status_at !== undefined) standardized.last_status_at = updates.last_status_at;
  if (updates.current_status_id !== undefined) standardized.current_status_id = updates.current_status_id;
  if (updates.courier_name !== undefined) standardized.courier_name = updates.courier_name;
  if (updates.courier_id !== undefined) standardized.courier_id = updates.courier_id;
  if (updates.tracking_url !== undefined) standardized.tracking_url = updates.tracking_url;
  if (updates.label_url !== undefined) standardized.label_url = updates.label_url;
  if (updates.manifest_url !== undefined) standardized.manifest_url = updates.manifest_url;
  if (updates.scans !== undefined) standardized.scans = updates.scans;
  if (updates.packed_at !== undefined) standardized.packed_at = updates.packed_at;
  if (updates.shipped_at !== undefined) standardized.shipped_at = updates.shipped_at;
  if (updates.delivered_at !== undefined) standardized.delivered_at = updates.delivered_at;
  if (updates.awb_assigned_at !== undefined) standardized.awb_assigned_at = updates.awb_assigned_at;
  if (updates.pickup_status !== undefined) standardized.pickup_status = updates.pickup_status;
  if (updates.pickup_token_number !== undefined) standardized.pickup_token_number = updates.pickup_token_number;
  if (updates.pickup_scheduled_date !== undefined) standardized.pickup_scheduled_date = updates.pickup_scheduled_date;
  if (updates.pickup_requested_at !== undefined) standardized.pickup_requested_at = updates.pickup_requested_at;
  if (updates.manifest_id !== undefined) standardized.manifest_id = updates.manifest_id;
  if (updates.manifest_generated_at !== undefined) standardized.manifest_generated_at = updates.manifest_generated_at;
  if (updates.invoice_no !== undefined) standardized.invoice_no = updates.invoice_no;
  if (updates.routing_code !== undefined) standardized.routing_code = updates.routing_code;
  if (updates.rto_routing_code !== undefined) standardized.rto_routing_code = updates.rto_routing_code;
  if (updates.applied_weight !== undefined) standardized.applied_weight = updates.applied_weight;

  return standardized as Record<string, unknown>;
}

/**
 * Extract Shiprocket metadata from raw fulfillment data
 */
export function extractShiprocketMetadata(fulfillmentData: any): ShiprocketMetadata {
  // Handle both old structure (data.shiprocket) and new structure (direct fields)
  const shiprocketData = fulfillmentData?.shiprocket || fulfillmentData || {};

  return {
    awb_code: shiprocketData.awb_code || shiprocketData.awb,
    shiprocket_order_id: shiprocketData.shiprocket_order_id || shiprocketData.order_id,
    shiprocket_shipment_id: shiprocketData.shiprocket_shipment_id || shiprocketData.shipment_id,
    last_status: shiprocketData.last_status,
    last_status_at: shiprocketData.last_status_at,
    current_status_id: shiprocketData.current_status_id,
    courier_name: shiprocketData.courier_name,
    courier_id: shiprocketData.courier_id,
    tracking_url: shiprocketData.tracking_url || shiprocketData.shiprocket_tracking_url,
    label_url: shiprocketData.label_url || shiprocketData.shiprocket_label_url,
    manifest_url: shiprocketData.manifest_url,
    scans: shiprocketData.scans,
    packed_at: fulfillmentData.packed_at,
    shipped_at: fulfillmentData.shipped_at,
    delivered_at: fulfillmentData.delivered_at,
    awb_assigned_at: shiprocketData.awb_assigned_at || shiprocketData.shiprocket_awb_assigned_at,
    pickup_status: shiprocketData.pickup_status,
    pickup_token_number: shiprocketData.pickup_token_number,
    pickup_scheduled_date: shiprocketData.pickup_scheduled_date,
    pickup_requested_at: shiprocketData.pickup_requested_at,
    manifest_id: shiprocketData.manifest_id,
    manifest_generated_at: shiprocketData.manifest_generated_at,
    invoice_no: shiprocketData.invoice_no,
    routing_code: shiprocketData.routing_code,
    rto_routing_code: shiprocketData.rto_routing_code,
    applied_weight: shiprocketData.applied_weight,
  };
}

