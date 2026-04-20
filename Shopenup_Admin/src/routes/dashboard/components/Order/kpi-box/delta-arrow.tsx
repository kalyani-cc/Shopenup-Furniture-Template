type DeltaArrowProps = {
  direction?: 'up' | 'down' | 'flat'
}

export function DeltaArrow({ direction = 'up' }: DeltaArrowProps) {
  // small geometric triangle similar to the screenshot
  if (direction === 'flat') {
    return null
  }
  const rotation = direction === 'down' ? 'rotate-180' : ''
  return (
    <svg
      className={`w-3 h-3 inline-block ml-2 ${rotation}`}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M6 2l4 6H2l4-6z" fill="currentColor" />
    </svg>
  )
}

