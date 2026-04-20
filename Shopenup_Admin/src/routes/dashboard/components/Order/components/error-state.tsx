type ErrorStateProps = {
  message?: string
}

export function ErrorState({ message = 'Failed to load data' }: ErrorStateProps) {
  return (
    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
      <div className="text-red-600">Error: {message}</div>
    </div>
  )
}

