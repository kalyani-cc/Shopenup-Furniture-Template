import { QueryKey, useInfiniteQuery, UseInfiniteQueryOptions } from "@tanstack/react-query"
import { ReactNode, useEffect, useMemo, useRef } from "react"
import { toast } from "@shopenup/ui"

type InfiniteListProps<TResponse, TEntity, TParams> = {
  queryKey: QueryKey
  queryFn: (params: TParams) => Promise<TResponse>
  queryOptions?: Omit<UseInfiniteQueryOptions<TResponse, Error, TResponse, TResponse, QueryKey>, 'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam' | 'getPreviousPageParam'>
  renderItem: (item: TEntity) => ReactNode
  renderEmpty: () => ReactNode
  responseKey: keyof TResponse
  pageSize?: number
}

export const InfiniteList = <
  TResponse extends { count: number; offset: number; limit: number },
  TEntity extends { id: string },
  TParams extends { offset?: number; limit?: number },
>({
  queryKey,
  queryFn,
  queryOptions,
  renderItem,
  renderEmpty,
  responseKey,
  pageSize = 20,
}: InfiniteListProps<TResponse, TEntity, TParams>) => {
  const {
    data,
    error,
    fetchNextPage,
    fetchPreviousPage,
    hasPreviousPage,
    hasNextPage,
    isFetching,
    isPending,
  } = useInfiniteQuery({
    queryKey: queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      return await queryFn({
        limit: pageSize,
        offset: pageParam,
      } as TParams)
    },
    initialPageParam: 0,
    maxPages: 5,
    getNextPageParam: (lastPage) => {
      const moreItemsExist = lastPage.count > lastPage.offset + lastPage.limit
      return moreItemsExist ? lastPage.offset + lastPage.limit : undefined
    },
    getPreviousPageParam: (firstPage) => {
      const moreItemsExist = firstPage.offset !== 0
      return moreItemsExist
        ? Math.max(firstPage.offset - firstPage.limit, 0)
        : undefined
    },
    ...queryOptions,
  })

  const items = useMemo(() => {
    if (!data) {
      return []
    }
    
    // Type assertion: useInfiniteQuery returns data with pages array
    const pages = (data as any)?.pages as TResponse[] | undefined
    
    if (!pages) {
      return []
    }
    
    const allItems = pages.flatMap((p: TResponse) => {
      const pageItems = (p[responseKey] as TEntity[]) || []
      return pageItems
    })
    
    const filteredItems = allItems.filter((item: TEntity | null | undefined): item is TEntity => item != null)
    
    return filteredItems
  }, [data, responseKey])

  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const topObserverRef = useRef<IntersectionObserver>()
  const bottomObserverRef = useRef<IntersectionObserver>()
  const isFetchingRef = useRef(false)
  const hasNextPageRef = useRef(hasNextPage)
  const hasPreviousPageRef = useRef(hasPreviousPage)
  const enabledRef = useRef(queryOptions?.enabled)
  const fetchNextPageRef = useRef(fetchNextPage)
  const fetchPreviousPageRef = useRef(fetchPreviousPage)

  // Keep refs in sync
  useEffect(() => {
    hasNextPageRef.current = hasNextPage
    hasPreviousPageRef.current = hasPreviousPage
    enabledRef.current = queryOptions?.enabled
    fetchNextPageRef.current = fetchNextPage
    fetchPreviousPageRef.current = fetchPreviousPage
  }, [hasNextPage, hasPreviousPage, queryOptions?.enabled, fetchNextPage, fetchPreviousPage])

  // Set up intersection observers for infinite scroll
  useEffect(() => {
    // Don't set up observers if disabled
    if (!enabledRef.current) {
      topObserverRef.current?.disconnect()
      bottomObserverRef.current?.disconnect()
      return
    }

    // Wait a bit after fetching completes before setting up observers
    // This prevents immediate retriggering when data loads
    if (isFetching || isPending) {
      topObserverRef.current?.disconnect()
      bottomObserverRef.current?.disconnect()
      return
    }

    const timeoutId = setTimeout(() => {
      // Double-check we're still not fetching
      if (isFetchingRef.current) {
        return
      }

      // Disconnect existing observers before creating new ones
      topObserverRef.current?.disconnect()
      bottomObserverRef.current?.disconnect()

      // Create observer for top sentinel (load previous)
      if (hasPreviousPageRef.current && topSentinelRef.current) {
        topObserverRef.current = new IntersectionObserver(
          (entries) => {
            // Only trigger if intersecting AND we're not already fetching
            if (
              entries[0].isIntersecting &&
              hasPreviousPageRef.current &&
              !isFetchingRef.current
            ) {
              isFetchingRef.current = true
              topObserverRef.current?.disconnect()
              fetchPreviousPageRef.current().finally(() => {
                // Small delay before allowing next fetch
                setTimeout(() => {
                  isFetchingRef.current = false
                }, 100)
              })
            }
          },
          { rootMargin: "50px" }
        )
        topObserverRef.current.observe(topSentinelRef.current)
      }

      // Create observer for bottom sentinel (load next)
      if (hasNextPageRef.current && bottomSentinelRef.current) {
        bottomObserverRef.current = new IntersectionObserver(
          (entries) => {
            // Only trigger if intersecting AND we're not already fetching
            if (
              entries[0].isIntersecting &&
              hasNextPageRef.current &&
              !isFetchingRef.current
            ) {
              isFetchingRef.current = true
              bottomObserverRef.current?.disconnect()
              fetchNextPageRef.current().finally(() => {
                // Small delay before allowing next fetch
                setTimeout(() => {
                  isFetchingRef.current = false
                }, 100)
              })
            }
          },
          { rootMargin: "50px" }
        )
        bottomObserverRef.current.observe(bottomSentinelRef.current)
      }
    }, 150) // Delay after fetching completes

    return () => {
      clearTimeout(timeoutId)
      topObserverRef.current?.disconnect()
      bottomObserverRef.current?.disconnect()
    }
  }, [isFetching, isPending])

  useEffect(() => {
    if (error) {
      toast.error(error.message)
    }
  }, [error])

  // Show loading spinner if pending or fetching without data
  const isLoading = isPending || (isFetching && !data)

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        {renderEmpty()}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Top sentinel for loading previous items */}
      {hasPreviousPage && <div ref={topSentinelRef} className="h-1" />}

      {items?.length
        ? items.map((item) => <div key={item.id}>{renderItem(item)}</div>)
        : renderEmpty()}

      {/* Bottom sentinel for loading next items */}
      {hasNextPage && <div ref={bottomSentinelRef} className="h-1" />}
    </div>
  )
}
