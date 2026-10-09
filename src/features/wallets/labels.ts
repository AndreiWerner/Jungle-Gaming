import type { Network, WalletProvider } from '@/types'

export const PROVIDER_LABEL: Record<WalletProvider, string> = { metamask: 'MetaMask', coinbase: 'Coinbase Wallet', walletconnect: 'WalletConnect' }
export const NETWORK_LABEL: Record<Network, string> = { ethereum: 'Ethereum', polygon: 'Polygon', arbitrum: 'Arbitrum' }
export const PROVIDERS = Object.keys(PROVIDER_LABEL) as WalletProvider[]
export const NETWORKS = Object.keys(NETWORK_LABEL) as Network[]
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
