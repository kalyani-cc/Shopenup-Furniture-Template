type EmptyStateProps = {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-gray-500 text-center py-8">{message}</div>
  )
}

