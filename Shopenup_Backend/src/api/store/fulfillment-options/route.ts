import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http";
import { Shiprocket } from "@shopenup/logistic";
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { isMockModeEnabled, generateMockRates } from 'src/modules/shiprocket/utils/mock-mode';
import { getNearestStockLocationPincode } from "src/modules/shiprocket/utils/stock-location-service";

export const POST = async (
  req: ShopenupRequest,
  res: ShopenupResponse
) => {
  try {
    // Log request body
    const body = req.body as {
      items?: Array<{
        variant_id?: string;
        quantity?: number;
        title?: string;
        sku?: string;
        weight?: number;
        length?: number;
        breadth?: number;
        height?: number;
      }>;
      shipping_address?: {
        address_1?: string;
        address_2?: string;
        city?: string;
        country_code?: string;
        province?: string;
        postal_code?: string;
        phone?: string;
      };
      pickup_address?: {
        address_1?: string;
        city?: string;
        country_code?: string;
        province?: string;
        postal_code?: string;
      };
      stock_pincode?: string; // Stock location postal code from product availability
      stock_location_id?: string; // Stock location ID from product availability
    };

    // Get Shiprocket configuration - try container first, then fallback to env vars
    let shiprocketConfig: any;
    try {
      shiprocketConfig = req.scope.resolve("shiprocketConfig") as any;
    } catch (error) {
      // If not in container, get from environment variables
      shiprocketConfig = {
        email: process.env.SHIPROCKET_EMAIL || "",
        password: process.env.SHIPROCKET_PASSWORD || "",
        baseUrl: process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1/external",
        timeout: parseInt(process.env.SHIPROCKET_TIMEOUT || "30000"),
        retryAttempts: parseInt(process.env.SHIPROCKET_RETRY_ATTEMPTS || "3"),
        retryDelay: parseInt(process.env.SHIPROCKET_RETRY_DELAY || "1000"),
        defaultPickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION
          ? JSON.parse(process.env.SHIPROCKET_PICKUP_LOCATION)
          : undefined,
      };
    }

    if (!shiprocketConfig || !shiprocketConfig.email || !shiprocketConfig.password) {
      return res.status(500).json({
        error: "Shiprocket configuration not found. Please set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD environment variables.",
      });
    }

    // Get delivery postcode
    const deliveryPostcode = body.shipping_address?.postal_code || "400001";

    // Get variant IDs from items
    const items = body.items || [];
    const variantIds = items
      .map((item) => item.variant_id)
      .filter((id): id is string => !!id);

    // Get pickup postcode - use provided stock_pincode if available, otherwise find nearest
    let pickupPostcode = "400001"; // Default Mumbai postcode
    
    // Priority 1: Use stock_pincode from request (from product availability)
    if (body.stock_pincode) {
      pickupPostcode = body.stock_pincode.trim();
    }
    // Priority 2: Use pickup_address postal_code if provided
    else if (body.pickup_address?.postal_code) {
      pickupPostcode = body.pickup_address.postal_code.trim();
    }
    // Priority 3: Find nearest stock location based on delivery postal code
    else if (deliveryPostcode && variantIds.length > 0) {
      try {
        // Use the shared stock location service
        pickupPostcode = await getNearestStockLocationPincode(deliveryPostcode);
      } catch (dbError: any) {
        // Fallback to default or config
        pickupPostcode =
          shiprocketConfig.defaultPickupLocation?.pin_code ||
          body.pickup_address?.postal_code ||
          pickupPostcode;
      }
    } else {
      // Fallback if no delivery postcode or variant IDs
      pickupPostcode =
        shiprocketConfig.defaultPickupLocation?.pin_code ||
        body.pickup_address?.postal_code ||
        pickupPostcode;
    }
    
    // Final fallback to config default
    if (!pickupPostcode || pickupPostcode === "400001") {
      pickupPostcode =
        shiprocketConfig.defaultPickupLocation?.pin_code ||
        body.pickup_address?.postal_code ||
        "400001";
    }

    // Calculate total weight
    // Shiprocket requires minimum weight of 0.5 kg (500 gm)
    const MINIMUM_WEIGHT_KG = 0.5
    const totalWeight = Math.max(
      items.length > 0
        ? items.reduce((sum, item) => sum + (item.weight || 0.5) * (item.quantity || 1), 0) || MINIMUM_WEIGHT_KG
        : MINIMUM_WEIGHT_KG, // Default weight if no items
      MINIMUM_WEIGHT_KG
    )

    // Check if mock mode is enabled
    let rates: any;

    if (isMockModeEnabled()) {
      console.log('[Fulfillment Options] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      rates = generateMockRates({
        originPincode: pickupPostcode,
        destPincode: deliveryPostcode,
        weightInKg: totalWeight,
      });
    } else {
      // Get authenticated Shiprocket client (uses shared instance to avoid duplicate auth calls)
      const shiprocket = await getAuthenticatedClient({
        email: shiprocketConfig.email,
        password: shiprocketConfig.password,
        baseUrl: shiprocketConfig.baseUrl,
      });

      // Check courier serviceability using the Logistic package (this returns available couriers with rates)
      // Call Shiprocket API with timeout protection
      try {
        rates = await Promise.race([
          shiprocket.couriers.checkServiceability({
            pickup_postcode: pickupPostcode,
            delivery_postcode: deliveryPostcode,
            weight: totalWeight,
            cod: false, // Can be determined from payment method
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Shiprocket API call timeout after 30 seconds")), 30000)
          )
        ]) as any;
      } catch (apiError: any) {
        return res.status(500).json({
          success: false,
          error: apiError.message || "Shiprocket API call failed",
          options: [],
        });
      }
    }

    if (!rates.success) {
      return res.json({
        success: true,
        options: [],
      });
    }

    // Shiprocket API returns: { data: { available_courier_companies: [...] } }
    // The client wraps it, so rates.data is the entire Shiprocket response
    // We need to access rates.data.data.available_courier_companies
    const shiprocketResponse = rates.data as any;
    const availableCouriers = shiprocketResponse?.data?.available_courier_companies || [];
    let recommendedCourierId = shiprocketResponse?.data?.recommended_courier_company_id;
    
    // If recommendedCourierId is null, calculate best courier based on price + delivery days + rating
    if (!recommendedCourierId && availableCouriers.length > 0) {
      // Calculate normalized scores for each courier
      // Lower score = better option
      const courierScores = availableCouriers.map((courier: any) => {
        const price = courier.rate || 0;
        const deliveryDays = typeof courier.estimated_delivery_days === 'string' 
          ? parseInt(courier.estimated_delivery_days) || 999
          : courier.estimated_delivery_days || 999;
        const rating = courier.rating || 0;
        
        // Find min/max values for normalization
        const allPrices = availableCouriers.map((c: any) => c.rate || 0);
        const allDeliveryDays = availableCouriers.map((c: any) => {
          const days = typeof c.estimated_delivery_days === 'string' 
            ? parseInt(c.estimated_delivery_days) || 999
            : c.estimated_delivery_days || 999;
          return days;
        });
        const allRatings = availableCouriers.map((c: any) => c.rating || 0);
        
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const minDeliveryDays = Math.min(...allDeliveryDays);
        const maxDeliveryDays = Math.max(...allDeliveryDays);
        const minRating = Math.min(...allRatings);
        const maxRating = Math.max(...allRatings);
        
        // Normalize values (0-1 scale, lower is better for price and delivery days, higher is better for rating)
        // For price: normalize to 0-1 where 0 = lowest price, 1 = highest price
        const normalizedPrice = maxPrice > minPrice 
          ? (price - minPrice) / (maxPrice - minPrice)
          : 0;
        
        // For delivery days: normalize to 0-1 where 0 = fastest, 1 = slowest
        const normalizedDeliveryDays = maxDeliveryDays > minDeliveryDays
          ? (deliveryDays - minDeliveryDays) / (maxDeliveryDays - minDeliveryDays)
          : 0;
        
        // For rating: normalize to 0-1 where 0 = lowest rating, 1 = highest rating
        // Then invert (1 - normalized) so lower score = better
        const normalizedRating = maxRating > minRating
          ? 1 - ((rating - minRating) / (maxRating - minRating))
          : 0;
        
        // Weighted score: 40% price, 40% delivery days, 20% rating
        // Lower total score = better option
        const totalScore = (normalizedPrice * 0.4) + (normalizedDeliveryDays * 0.4) + (normalizedRating * 0.2);
        
        return {
          courier_company_id: courier.courier_company_id,
          score: totalScore,
          price,
          deliveryDays,
          rating,
        };
      });
      
      // Sort by score (ascending - lower is better)
      courierScores.sort((a, b) => a.score - b.score);
      
      // Get the best courier (lowest score)
      const bestCourier = courierScores[0];
      recommendedCourierId = bestCourier.courier_company_id;
    }
    
    if (!Array.isArray(availableCouriers)) {
      return res.json({
        success: true,
        options: [],
      });
    }

    if (availableCouriers.length === 0) {
      return res.json({
        success: true,
        options: [],
      });
    }

    // Map couriers to fulfillment options
    // Each courier includes: courier_company_id, courier_name, rate, estimated_delivery_days
    const allOptions = availableCouriers.map((courier: any) => {
      // Parse estimated_delivery_days (can be string like "3" or number)
      const deliveryDays = typeof courier.estimated_delivery_days === 'string' 
        ? parseInt(courier.estimated_delivery_days) || 0
        : courier.estimated_delivery_days || 0;
      
      return {
        id: `shiprocket_${courier.courier_company_id}`,
        name: courier.courier_name || "Courier",
        data: {
          courier_company_id: courier.courier_company_id,
          courier_name: courier.courier_name,
          estimated_delivery_days: deliveryDays,
          rate: courier.rate || 0,
          freight_charge: courier.freight_charge || 0,
          other_charges: courier.other_charges || 0,
          rating: courier.rating || 0,
          is_recommended: courier.courier_company_id === recommendedCourierId,
          // Store courier type/mode if available
          courier_type: courier.courier_type || courier.mode || courier.service_type || null,
        },
        amount: courier.rate || 0,
        is_return: false,
      };
    });
    
    // Filter out Indian Post and non-land couriers from all options
    const filteredAllOptions = allOptions.filter((option: any) => {
      const courierName = (option.data?.courier_name || '').toLowerCase();
      const courierCompanyId = String(option.data?.courier_company_id || '').toLowerCase();
      const courierType = String(option.data?.courier_type || '').toLowerCase();
      const courierMode = String(option.data?.mode || '').toLowerCase();
      
      // Filter out Indian Post
      const isIndianPost = 
        courierName.includes('indian post') || 
        courierName.includes('india post') ||
        courierName.includes('post office') ||
        courierName.includes('indianpost') ||
        courierCompanyId.includes('indian_post') ||
        courierCompanyId.includes('india_post') ||
        courierCompanyId.includes('indianpost');
      
      // Filter to only land-based couriers (Surface mode)
      // Check if courier type/mode indicates air transport
      // Common air courier indicators: "air", "express" (in name), "air express"
      const isAirCourier = 
        courierType === 'air' ||
        courierMode === 'air' ||
        (courierName.includes('air express') && !courierName.includes('surface')) ||
        (courierName.includes('express') && courierName.includes('air'));
      
      // Check if explicitly land-based (Surface mode)
      const isExplicitlyLand = 
        courierType === 'surface' || 
        courierType === 'land' ||
        courierMode === 'surface' ||
        courierMode === 'land' ||
        courierName.includes('surface');
      
      // Only keep land-based couriers
      // If explicitly air, filter out
      // If explicitly land, keep
      // If unclear, keep (assume land-based as most couriers are land-based)
      const isLandCourier = !isAirCourier || isExplicitlyLand;
      
      if (isIndianPost) {
        return false;
      }
      
      if (!isLandCourier) {
        return false;
      }
      
      return true;
    });
    
    // Use filtered options for all further processing
    const optionsToProcess = filteredAllOptions;

    // Filter to show only 3 options: Recommended, Lowest Price, Highest Price
    const filteredOptions: any[] = [];
    
    // Find recommended option (from filtered options)
    const recommendedOption = optionsToProcess.find(
      (opt: any) => opt.data?.is_recommended === true
    );
    
    // Sort filtered options by price (amount or rate)
    const sortedByPrice = [...optionsToProcess].sort((a: any, b: any) => {
      const priceA = a.amount || a.data?.rate || 0;
      const priceB = b.amount || b.data?.rate || 0;
      return priceA - priceB;
    });
    
    // Get lowest and highest from filtered options (Indian Post already excluded)
    const lowestPriceOption = sortedByPrice[0]; // This is now the second lowest if Indian Post was filtered
    const highestPriceOption = sortedByPrice[sortedByPrice.length - 1];
    
    // Track which courier IDs we've already added to avoid duplicates
    const addedCourierIds = new Set<string>();
    
    // Check if recommended is also the lowest price
    const isRecommendedAlsoLowest = recommendedOption && 
      recommendedOption.data?.courier_company_id === lowestPriceOption?.data?.courier_company_id;
    
    // If recommended = lowest, we'll use it as "Lowest Price" and find next best as "Recommended"
    let finalRecommendedOption = recommendedOption;
    let nextBestRecommendedOption = null;
    
    if (isRecommendedAlsoLowest && recommendedOption) {
      // Recommended IS the lowest price
      // Use the recommended option as "Lowest Price"
      // Find the next best option (excluding the recommended) to use as "Recommended by Shiprocket"
      // Calculate scores for all options except the recommended one (from filtered options)
      const optionsExcludingRecommended = optionsToProcess.filter(
        (opt: any) => opt.data?.courier_company_id !== recommendedOption.data?.courier_company_id
      );
      
      if (optionsExcludingRecommended.length > 0) {
        // Calculate normalized scores (same algorithm as before)
        const courierScores = optionsExcludingRecommended.map((courier: any) => {
          const price = courier.amount || courier.data?.rate || 0;
          const deliveryDays = typeof courier.data?.estimated_delivery_days === 'number'
            ? courier.data.estimated_delivery_days
            : (typeof courier.data?.estimated_delivery_days === 'string'
              ? parseInt(courier.data.estimated_delivery_days) || 999
              : 999);
          const rating = courier.data?.rating || 0;
          
          // Find min/max values for normalization (from all options excluding recommended)
          const allPrices = optionsExcludingRecommended.map((c: any) => c.amount || c.data?.rate || 0);
          const allDeliveryDays = optionsExcludingRecommended.map((c: any) => {
            const days = typeof c.data?.estimated_delivery_days === 'number'
              ? c.data.estimated_delivery_days
              : (typeof c.data?.estimated_delivery_days === 'string'
                ? parseInt(c.data.estimated_delivery_days) || 999
                : 999);
            return days;
          });
          const allRatings = optionsExcludingRecommended.map((c: any) => c.data?.rating || 0);
          
          const minPrice = Math.min(...allPrices);
          const maxPrice = Math.max(...allPrices);
          const minDeliveryDays = Math.min(...allDeliveryDays);
          const maxDeliveryDays = Math.max(...allDeliveryDays);
          const minRating = Math.min(...allRatings);
          const maxRating = Math.max(...allRatings);
          
          // Normalize values (0-1 scale, lower is better for price and delivery days, higher is better for rating)
          const normalizedPrice = maxPrice > minPrice 
            ? (price - minPrice) / (maxPrice - minPrice)
            : 0;
          
          const normalizedDeliveryDays = maxDeliveryDays > minDeliveryDays
            ? (deliveryDays - minDeliveryDays) / (maxDeliveryDays - minDeliveryDays)
            : 0;
          
          const normalizedRating = maxRating > minRating
            ? 1 - ((rating - minRating) / (maxRating - minRating))
            : 0;
          
          // Weighted score: 40% price, 40% delivery days, 20% rating
          // Lower total score = better option
          const totalScore = (normalizedPrice * 0.4) + (normalizedDeliveryDays * 0.4) + (normalizedRating * 0.2);
          
          return {
            option: courier,
            score: totalScore,
            price,
            deliveryDays,
            rating,
          };
        });
        
        // Sort by score (ascending - lower is better)
        courierScores.sort((a, b) => a.score - b.score);
        
        // Get the best option (lowest score)
        if (courierScores.length > 0) {
          nextBestRecommendedOption = courierScores[0].option;
        }
      }
      
      // Use the next best option as "Recommended by Shiprocket"
      finalRecommendedOption = nextBestRecommendedOption;
    }
    
    // 1. Add recommended option with "Recommended by Shiprocket" label
    if (finalRecommendedOption) {
      const courierId = finalRecommendedOption.data?.courier_company_id;
      if (courierId) {
        filteredOptions.push({
          ...finalRecommendedOption,
          displayLabel: "Recommended by Shiprocket"
        });
        addedCourierIds.add(courierId);
      }
    }
    
    // 2. Always add lowest price option with "Lowest Price" label
    if (isRecommendedAlsoLowest && recommendedOption) {
      // Recommended IS the lowest, so use it as "Lowest Price"
      const courierId = recommendedOption.data?.courier_company_id;
      if (courierId && !addedCourierIds.has(courierId)) {
        filteredOptions.push({
          ...recommendedOption,
          displayLabel: "Lowest Price"
        });
        addedCourierIds.add(courierId);
      }
    } else {
      // Recommended is NOT the lowest, so show the actual lowest price option
      if (lowestPriceOption) {
        const courierId = lowestPriceOption.data?.courier_company_id;
        if (courierId && !addedCourierIds.has(courierId)) {
          filteredOptions.push({
            ...lowestPriceOption,
            displayLabel: "Lowest Price"
          });
          addedCourierIds.add(courierId);
        }
      }
    }
    
    // 3. Always add highest price option with "Highest Price" label
    // Check if recommended is also the highest price
    const isRecommendedAlsoHighest = recommendedOption && 
      recommendedOption.data?.courier_company_id === highestPriceOption?.data?.courier_company_id;
    
    if (isRecommendedAlsoHighest) {
      // Recommended IS the highest price, so show the next highest option but label it with courier name
      const reversedSorted = [...sortedByPrice].reverse();
      const nextHighest = reversedSorted.find(
        (opt: any) => opt.data?.courier_company_id !== recommendedOption.data?.courier_company_id
      );
      if (nextHighest) {
        const courierId = nextHighest.data?.courier_company_id;
        if (courierId && !addedCourierIds.has(courierId)) {
          // Don't label as "Highest Price" since the recommended one is actually the highest
          filteredOptions.push({
            ...nextHighest,
            displayLabel: nextHighest.name || "Shipping Option"
          });
          addedCourierIds.add(courierId);
        }
      }
    } else {
      // Recommended is NOT the highest, so show the actual highest price option
      if (highestPriceOption) {
        const courierId = highestPriceOption.data?.courier_company_id;
        if (courierId && !addedCourierIds.has(courierId)) {
          filteredOptions.push({
            ...highestPriceOption,
            displayLabel: "Highest Price"
          });
          addedCourierIds.add(courierId);
        }
      }
    }
    
    // Ensure we have exactly 3 options with the correct labels
    // If we have less than 3, fill with additional options from sorted list
    if (filteredOptions.length < 3 && sortedByPrice.length > filteredOptions.length) {
      for (const option of sortedByPrice) {
        if (filteredOptions.length >= 3) break;
        const courierId = option.data?.courier_company_id;
        if (courierId && !addedCourierIds.has(courierId)) {
          // Determine which label is missing
          const hasRecommended = filteredOptions.some(opt => opt.displayLabel === "Recommended by Shiprocket");
          const hasLowest = filteredOptions.some(opt => opt.displayLabel === "Lowest Price");
          const hasHighest = filteredOptions.some(opt => opt.displayLabel === "Highest Price");
          
          let label = option.name || "Shipping Option";
          
          // Only assign "Lowest Price" or "Highest Price" if:
          // 1. The label is missing AND
          // 2. This option is actually the lowest/highest (not when recommended = lowest/highest)
          if (!hasRecommended && recommendedOption) {
            label = "Recommended by Shiprocket";
          } else if (!hasLowest && !isRecommendedAlsoLowest) {
            // Only label as "Lowest Price" if recommended is NOT the lowest
            const optionPrice = option.amount || option.data?.rate || 0;
            const actualLowestPrice = lowestPriceOption?.amount || lowestPriceOption?.data?.rate || 0;
            if (optionPrice === actualLowestPrice) {
              label = "Lowest Price";
            }
          } else if (!hasHighest && !isRecommendedAlsoHighest) {
            // Only label as "Highest Price" if recommended is NOT the highest
            const optionPrice = option.amount || option.data?.rate || 0;
            const actualHighestPrice = highestPriceOption?.amount || highestPriceOption?.data?.rate || 0;
            if (optionPrice === actualHighestPrice) {
              label = "Highest Price";
            }
          }
          
          filteredOptions.push({
            ...option,
            displayLabel: label
          });
          addedCourierIds.add(courierId);
        }
      }
    }
    
    // Ensure we return exactly 3 options with the correct labels in order: Recommended, Highest, Lowest
    const finalOptions: any[] = [];
    
    // Find and add in correct order: Recommended, Highest, Lowest
    let recommended = filteredOptions.find(opt => opt.displayLabel === "Recommended by Shiprocket");
    let highest = filteredOptions.find(opt => opt.displayLabel === "Highest Price");
    let lowest = filteredOptions.find(opt => opt.displayLabel === "Lowest Price");
    
    // When recommended = lowest, we don't create a duplicate "Lowest Price" entry
    // Instead, we show: Recommended, Highest, and Next Lowest (with courier name)
    // When recommended = highest, we show: Recommended, Lowest, and Next Highest (with courier name)
    
    // Add in order: Recommended, Highest, Lowest (or alternative if recommended = lowest/highest)
    if (recommended) finalOptions.push(recommended);
    if (highest) finalOptions.push(highest);
    if (lowest) finalOptions.push(lowest);
    
    // If we still don't have 3 unique options, add any remaining options
    // This handles cases where recommended = lowest or recommended = highest
    filteredOptions.forEach(opt => {
      if (finalOptions.length < 3) {
        // Check if this option is already in finalOptions (by courier ID)
        const alreadyAdded = finalOptions.some(
          fo => fo.data?.courier_company_id === opt.data?.courier_company_id
        );
        if (!alreadyAdded) {
          finalOptions.push(opt);
        }
      }
    });
    
    const options = finalOptions.slice(0, 3);

    const response = {
      success: true,
      options: options || [],
    };

    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to get fulfillment options",
      options: [],
    });
  }
};

