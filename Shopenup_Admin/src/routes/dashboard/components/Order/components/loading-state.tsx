type LoadingStateProps = {
  message?: string
  variant?: 'default' | 'kpi' | 'chart'
}

export function LoadingState({ message = 'Loading...', variant = 'default' }: LoadingStateProps) {
  if (variant === 'kpi') {
    return (
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-md p-5 shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-40"></div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'chart') {
    return (
      <div className="mt-6 w-full lg:flex-1 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="w-full" style={{ minHeight: '300px', height: '400px' }}>
          <div className="h-full bg-gray-50 rounded-md animate-pulse flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="text-gray-500 text-sm">{message}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-center space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <span className="text-gray-600 font-medium">{message}</span>
      </div>
    </div>
  )
}

