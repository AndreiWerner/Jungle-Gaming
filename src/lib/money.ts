import Decimal from 'decimal.js'
import type { EthString } from '@/types'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })
const SCALE = 18
const trim = (s: string) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s)

export const norm = (v: Decimal.Value): EthString => trim(new Decimal(v).toDecimalPlaces(SCALE).toFixed())
export const add = (a: EthString, b: EthString) => norm(new Decimal(a).plus(b))
export const sub = (a: EthString, b: EthString) => norm(new Decimal(a).minus(b))
export const mul = (a: EthString, q: number | string) => norm(new Decimal(a).times(q))
export const pct = (a: EthString, p: number) => norm(new Decimal(a).times(p).div(100))
export const cmp = (a: EthString, b: EthString) => new Decimal(a).comparedTo(b)
export const sum = (values: EthString[]) => norm(values.reduce((acc, v) => acc.plus(v), new Decimal(0)))
export const isValidEth = (v: string) => /^\d+(\.\d{1,18})?$/.test(v)
export const formatEth = (v: EthString) => `${trim(new Decimal(v).toDecimalPlaces(4).toFixed())} ETH`
