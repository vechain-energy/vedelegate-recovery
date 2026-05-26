import { formatUnits, type Address } from 'viem'

export const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

export const formatTokenAmount = (value: bigint, decimals: number, precision = 4): string => {
  const raw = formatUnits(value, decimals)
  const [whole = '0', fraction = ''] = raw.split('.')
  const trimmedFraction = fraction.slice(0, precision).replace(/0+$/, '')

  if (!trimmedFraction) {
    return whole
  }

  return `${whole}.${trimmedFraction}`
}

export const formatDateTime = (seconds: number): string => {
  if (seconds <= 0) {
    return 'unknown'
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(seconds * 1000))
}

export const sameAddress = (left: Address, right: Address) =>
  left.toLowerCase() === right.toLowerCase()
