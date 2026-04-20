import { DeltaArrow } from './delta-arrow'

import type { KPIBoxProps } from './types'

/**
 * KPIBox component - React + Tailwind
 * Matches the clean white card style: small title, large value, small green delta arrow and percent,
 * and a muted gray secondary line that shows "vs previous period" with a green relative change.
 */
export function KPIBox({
  title,
  value,
  prefix = '',
  suffix = '',
  delta = null,
  deltaDirection = 'up',
  comparison = '',
}: KPIBoxProps) {
  const formattedValue =
    typeof value === 'number' 
      ? prefix 
        ? Math.round(value).toLocaleString('en-IN') // Round currency values to whole numbers
        : value.toLocaleString('en-IN') // Keep decimals for non-currency values
      : value

  // Determine color based on delta value or deltaDirection
  const comparisonColorClass =
    delta !== null
      ? typeof delta === 'number'
        ? delta >= 0
          ? 'text-green-600'
          : 'text-red-500'
        : deltaDirection === 'up'
          ? 'text-green-600'
          : deltaDirection === 'down'
            ? 'text-red-500'
            : 'text-gray-500'
      : 'text-gray-500'

  return (
    <div className="bg-white border border-gray-100 rounded-md p-5 shadow-sm">
      <div className="text-sm font-medium text-indigo-800">{title}</div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
          {prefix && (
            <span className="mr-1 text-sm font-semibold text-gray-700">
              {prefix}
            </span>
          )}
          {formattedValue}
          {suffix && (
            <span className="ml-1 text-sm font-medium text-gray-700">
              {suffix}
            </span>
          )}
        </div>

        {delta !== null && (
          <div
            className={`flex items-center text-sm font-medium ${
              deltaDirection === 'up'
                ? 'text-green-600'
                : deltaDirection === 'down'
                  ? 'text-red-500'
                  : 'text-gray-400'
            }`}
          >
            <span className="inline-flex items-center">
              <DeltaArrow direction={deltaDirection} />
            </span>
            <span className="ml-1 whitespace-nowrap">
              {typeof delta === 'number'
                ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`
                : typeof delta === 'string' && !delta.includes('%')
                  ? `${delta}%`
                  : delta}
            </span>
          </div>
        )}
      </div>

      {comparison && (() => {
        // Parse the comparison string to extract previous period value and percentage
        // Format: "vs previous period 28 ( +17.9% )" or "vs previous period 45,051.2 ( -61.6% )"
        const match = comparison.match(/vs previous period\s+([\d,.\d]+)\s*\(([^)]+)\)/)
        
        if (match && match.length >= 3) {
          const previousValue = match[1].trim()
          const percentage = match[2].trim()
          
          return (
            <div className="mt-2 text-sm text-gray-400 text-wrap">
              <span>vs previous period </span>
              <span className="text-gray-500 font-medium">{previousValue}</span>
              <span className="ml-1 whitespace-nowrap font-medium">
                (<span className={comparisonColorClass}>{percentage}</span>)
              </span>
            </div>
          )
        }
        
        // Alternative pattern: try to match even if format is slightly different
        const altMatch = comparison.match(/vs previous period\s+(.+?)\s*\(([^)]+)\)/)
        if (altMatch && altMatch.length >= 3) {
          const previousValue = altMatch[1].trim()
          const percentage = altMatch[2].trim()
          
          return (
            <div className="mt-2 text-sm text-gray-400 text-wrap">
              <span>vs previous period </span>
              <span className="text-gray-500 font-medium">{previousValue}</span>
              <span className="ml-1 whitespace-nowrap font-medium">
                (<span className={comparisonColorClass}>{percentage}</span>)
              </span>
            </div>
          )
        }
        
        // Fallback to original format if pattern doesn't match
        return (
          <div className="mt-2 text-sm text-gray-400 text-wrap">
            <span>{comparison}</span>
          </div>
        )
      })()}
    </div>
  )
}

