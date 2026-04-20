import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

export interface WishlistCountResponse {
  count: number;
  product_id: string;
}

interface UseWishlistCountOptions {
  enabled?: boolean;
}

interface UseWishlistCountReturn {
  count: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useWishlistCount = (
  productId: string | undefined,
  options: UseWishlistCountOptions = {}
): UseWishlistCountReturn => {
  const { enabled = true } = options;
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlistCount = useCallback(async () => {
    if (!productId) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Primary endpoint: /admin/products/:productId/wishlist-count
      // This is the main endpoint we created for counting wishlist items
      const primaryEndpoint = `/admin/products/${productId}/wishlist-count`;
      
      try {
        const url = `${API_BASE_URL}${primaryEndpoint}`;
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const fetchedCount = data.count !== undefined ? data.count : 0;
          
          setCount(fetchedCount);
          setLoading(false);
          return;
        }
      } catch (primaryErr: any) {
        console.warn('Primary wishlist count endpoint failed, trying fallbacks:', primaryErr);
      }

      // Fallback: Try fetching all wishlists and counting (less efficient but works if endpoint doesn't exist)
      try {
        const allWishlistsUrl = `${API_BASE_URL}/admin/wishlists`;
        const allResponse = await fetch(allWishlistsUrl, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (allResponse.ok) {
          const allData = await allResponse.json();
          const wishlists = Array.isArray(allData) ? allData : (allData.wishlists || allData.data || []);
          
          // Count wishlists that contain this product
          // Handle different wishlist data structures
          const count = wishlists.filter((wishlist: any) => {
            // Check if wishlist has items array
            const items = wishlist.items || wishlist.products || wishlist.product_items || [];
            
            if (Array.isArray(items) && items.length > 0) {
              return items.some((item: any) => {
                // Check various possible product ID fields
                const itemProductId = 
                  item.product_id || 
                  item.product?.id || 
                  item.id;
                
                // Also check variant product_id
                const variantProductId = 
                  item.variant?.product_id || 
                  item.variant?.product?.id;
                
                return itemProductId === productId || variantProductId === productId;
              });
            }
            
            // Some APIs might store product_id directly on wishlist
            return wishlist.product_id === productId;
          }).length;

          // If we successfully fetched wishlists, use this count
          setCount(count);
          setLoading(false);
          return;
        }
      } catch (fallbackErr: any) {
        // Continue to try specific endpoints if fallback fails
        console.warn('Fetching all wishlists failed, trying specific endpoints:', fallbackErr);
      }

      // List of other possible endpoint patterns to try as fallback
      const endpoints = [
        `/admin/wishlists/count?product_id=${productId}`,
        `/admin/wishlists?product_id=${productId}`,
        `/admin/products/${productId}/wishlists/count`,
        `/admin/wishlists/count?productId=${productId}`,
        `/admin/wishlist-items/count?product_id=${productId}`,
        `/admin/wishlist-items?product_id=${productId}`,
      ];

      let lastError: Error | null = null;

      // Try each endpoint pattern
      for (const endpoint of endpoints) {
        try {
          const url = `${API_BASE_URL}${endpoint}`;
          const response = await fetch(url, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            let fetchedCount = 0;
            
            // Handle different response formats
            if (typeof data === 'number') {
              // Direct count response
              fetchedCount = data;
            } else if (data.count !== undefined) {
              // Object with count property (primary format from our endpoint)
              fetchedCount = data.count || 0;
            } else if (Array.isArray(data.wishlists) || Array.isArray(data)) {
              // Array of wishlists - count them
              const wishlists = Array.isArray(data) ? data : data.wishlists;
              fetchedCount = wishlists.length;
            } else if (data.total !== undefined) {
              // Object with total property
              fetchedCount = data.total || 0;
            }
            
            // For the primary endpoint (/admin/products/:productId/wishlist-count),
            // trust the response even if count is 0
            if (endpoint === `/admin/products/${productId}/wishlist-count`) {
              setCount(fetchedCount);
              setLoading(false);
              return;
            }
            
            // For other endpoints, if we got a count (even 0), use it
            // But if count is 0, we'll still try the fallback to double-check
            if (fetchedCount > 0) {
              setCount(fetchedCount);
              setLoading(false);
              return;
            }
            // If count is 0, continue to try other endpoints or fallback
          } else if (response.status !== 404) {
            // If it's not a 404, store the error but continue trying other endpoints
            const errorText = await response.text();
            let errorData: any = {};
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // If parsing fails, use the text as message
            }
            lastError = new Error(
              errorData.message || `Failed to fetch wishlist count: ${response.statusText}`
            );
          }
        } catch (err: any) {
          // Continue to next endpoint on error
          lastError = err;
        }
      }

      // If all attempts failed, show error or default to 0
      if (lastError) {
        throw lastError;
      }

      // No endpoint worked, default to 0
      setCount(0);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch wishlist count');
      setCount(0);
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (enabled && productId) {
      fetchWishlistCount();
    } else {
      setLoading(false);
    }
  }, [enabled, productId, fetchWishlistCount]);

  return {
    count,
    loading,
    error,
    refetch: fetchWishlistCount,
  };
};

