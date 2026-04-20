/**
 * Mock Mode Utility for Shiprocket Integration
 * 
 * This utility provides functions to check if mock mode is enabled
 * and generates mock data that matches Shiprocket API responses.
 * 
 * Set USE_SHIPROCKET_MOCK=true in environment to enable mock mode.
 */

/**
 * Check if mock mode is enabled
 */
export function isMockModeEnabled(): boolean {
  const mockMode = process.env.USE_SHIPROCKET_MOCK || process.env.SHIPROCKET_USE_MOCK;
  return mockMode === 'true' || mockMode === '1';
}

/**
 * Generate mock shipping rates response
 */
export function generateMockRates(args: {
  originPincode: string;
  destPincode: string;
  weightInKg: number;
  carrierCode?: number;
}): any {
  const { originPincode, destPincode, weightInKg, carrierCode } = args;
  
  // Generate mock courier companies
  const mockCouriers = [
    {
      courier_company_id: 1,
      courier_name: "BlueDart",
      rate: Math.round(50 + weightInKg * 20),
      estimated_delivery_days: 2,
      rate_breakup: {
        freight: Math.round(30 + weightInKg * 15),
        fuel_surcharge: Math.round(10 + weightInKg * 3),
        rto_charges: 0,
        cod_charges: 0,
      },
    },
    {
      courier_company_id: 32,
      courier_name: "DTDC",
      rate: Math.round(40 + weightInKg * 18),
      estimated_delivery_days: 3,
      rate_breakup: {
        freight: Math.round(25 + weightInKg * 12),
        fuel_surcharge: Math.round(8 + weightInKg * 2),
        rto_charges: 0,
        cod_charges: 0,
      },
    },
    {
      courier_company_id: 5,
      courier_name: "Delhivery",
      rate: Math.round(45 + weightInKg * 19),
      estimated_delivery_days: 2,
      rate_breakup: {
        freight: Math.round(28 + weightInKg * 14),
        fuel_surcharge: Math.round(9 + weightInKg * 2.5),
        rto_charges: 0,
        cod_charges: 0,
      },
    },
  ];

  // If specific carrier code requested, return only that courier
  if (carrierCode) {
    const specificCourier = mockCouriers.find(c => c.courier_company_id === carrierCode);
    if (specificCourier) {
      return {
        success: true,
        data: {
          data: {
            available_courier_companies: [specificCourier],
            recommended_courier_company_id: specificCourier.courier_company_id,
          },
        },
      };
    }
  }

  // Return all couriers with recommended one
  return {
    success: true,
    data: {
      data: {
        available_courier_companies: mockCouriers,
        recommended_courier_company_id: mockCouriers[0].courier_company_id,
      },
    },
  };
}

/**
 * Generate mock order creation response
 */
export function generateMockOrderCreation(orderId: string): any {
  const mockOrderId = Math.floor(100000000 + Math.random() * 900000000); // 9-digit random ID
  const mockShipmentId = Math.floor(10000000 + Math.random() * 90000000); // 8-digit random ID

  return {
    success: true,
    data: {
      order_id: mockOrderId,
      shipment_id: mockShipmentId,
      status: "NEW",
      status_code: 1,
      onboarding_completed_now: 0,
      awb_code: null,
      courier_company_id: null,
      courier_name: null,
    },
  };
}

/**
 * Generate mock AWB assignment response
 */
export function generateMockAwbAssignment(args: {
  shipmentId: number | string;
  courierId: number | string;
  orderId?: string;
}): any {
  const { shipmentId, courierId, orderId } = args;
  const mockAwbCode = `MOCK${Math.floor(100000000000 + Math.random() * 900000000000)}`; // 12-digit mock AWB
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const courierNames: Record<string, string> = {
    "1": "BlueDart",
    "32": "DTDC",
    "5": "Delhivery",
  };

  return {
    success: true,
    error: null,
    data: {
      awb_assign_status: 1,
      response: {
        data: {
          courier_company_id: typeof courierId === 'string' ? parseInt(courierId) : courierId,
          awb_code: mockAwbCode,
          cod: 0,
          order_id: orderId || Math.floor(100000000 + Math.random() * 900000000),
          shipment_id: typeof shipmentId === 'string' ? parseInt(shipmentId) : shipmentId,
          awb_code_status: 1,
          assigned_date_time: {
            date: new Date().toISOString(),
            timezone_type: 3,
            timezone: "Asia/Kolkata",
          },
          applied_weight: 0.5,
          company_id: 25149,
          courier_name: courierNames[String(courierId)] || "Mock Courier Service",
          child_courier_name: null,
          pickup_scheduled_date: `${tomorrow.toISOString().split('T')[0]} 14:00:00`,
          routing_code: "DEL/DEL",
          rto_routing_code: "DEL",
          invoice_no: `INV${orderId || Date.now()}`,
          transporter_id: "",
          transporter_name: "",
          shipped_by: {
            shipper_company_name: "Test Company",
            shipper_address_1: "Test Address",
            shipper_city: "Delhi",
            shipper_state: "Delhi",
            shipper_country: "India",
            shipper_postcode: "110001",
            shipper_phone: "9999999999",
            shipper_email: "test@test.com",
          },
        },
      },
    },
  };
}

/**
 * Generate mock pickup request response
 */
export function generateMockPickupRequest(shipmentId: number | string): any {
  const mockPickupTokenNumber = `PKP${Date.now()}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const mockPickupScheduledDate = `${tomorrow.toISOString().split('T')[0]} 14:00:00`;

  return {
    success: true,
    data: {
      pickup_token_number: mockPickupTokenNumber,
      pickup_scheduled_date: mockPickupScheduledDate,
      pickup_status: "Scheduled",
      response: {
        pickup_scheduled_date: mockPickupScheduledDate,
      },
    },
  };
}

/**
 * Generate mock manifest generation response
 */
export function generateMockManifest(shipmentId: number | string): any {
  const mockManifestId = `MNF${Date.now()}`;
  const mockManifestUrl = `https://s3.ap-south-1.amazonaws.com/sr-manifest/mock-manifest-${mockManifestId}.pdf`;

  return {
    success: true,
    data: {
      manifest_id: mockManifestId,
      manifest_url: mockManifestUrl,
    },
  };
}

/**
 * Generate mock tracking response
 */
export function generateMockTracking(awbCode: string): any {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  return {
    success: true,
    data: {
      tracking_data: {
        shipment_track: [
          {
            awb_code: awbCode,
            current_status: "IN TRANSIT",
            shipment_status: 42,
            courier_name: "Mock Courier",
            updated_time_stamp: now.toISOString(),
            pickup_date: twoDaysAgo.toISOString().split('T')[0],
            edd: now.toISOString().split('T')[0],
            pod_status: "Pending",
          },
        ],
        shipment_track_activities: [
          {
            date: now.toISOString(),
            activity: "In Transit",
            location: "Mumbai",
            status: "IN_TRANSIT",
            "sr-status": 42,
            "sr-status-label": "IN TRANSIT",
          },
          {
            date: yesterday.toISOString(),
            activity: "Picked Up",
            location: "Delhi",
            status: "PICKED_UP",
            "sr-status": 1,
            "sr-status-label": "PICKED UP",
          },
          {
            date: twoDaysAgo.toISOString(),
            activity: "Order Placed",
            location: "Delhi",
            status: "NEW",
            "sr-status": 0,
            "sr-status-label": "NEW",
          },
        ],
        shipment_status: 42,
        track_url: `https://shiprocket.co/tracking/${awbCode}`,
        etd: now.toISOString().split('T')[0],
      },
    },
  };
}

/**
 * Generate mock cancel order response
 */
export function generateMockCancelOrder(orderId: string | number): any {
  return {
    success: true,
    data: {
      message: "Order cancelled successfully",
      order_id: orderId,
    },
  };
}

/**
 * Generate mock create shipment response
 */
export function generateMockCreateShipment(args: {
  shipmentId: number | string;
  courierId?: number | string;
}): any {
  const { shipmentId, courierId } = args;
  const mockAwbCode = `MOCK${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  return {
    success: true,
    data: {
      shipment_id: typeof shipmentId === 'string' ? parseInt(shipmentId) : shipmentId,
      awb_code: mockAwbCode,
      courier_name: courierId ? `Mock Courier ${courierId}` : "Mock Courier",
      courier_company_id: courierId ? (typeof courierId === 'string' ? parseInt(courierId) : courierId) : 1,
      tracking_data: {
        current_status: "NEW",
        shipment_status: 1,
      },
    },
  };
}

/**
 * Generate mock download label response
 */
export function generateMockDownloadLabel(shipmentId: number | string): any {
  const mockLabelUrl = `https://s3.ap-south-1.amazonaws.com/sr-label/mock-label-${shipmentId}.pdf`;

  return {
    success: true,
    data: {
      label_url: mockLabelUrl,
    },
  };
}

