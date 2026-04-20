export type DeltaDirection = 'up' | 'down' | 'flat'

export type KPIBoxProps = {
  title: string
  value: number | string
  prefix?: string
  suffix?: string
  delta?: number | string | null // e.g. 20.7 (number) or '+20.7%'
  deltaDirection?: DeltaDirection
  comparison?: string // e.g. 'vs previous period 35.2K'
}

