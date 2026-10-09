/** Valores em ETH sempre como string decimal (ex.: "0.125"). Nunca number. */
export type EthString = string

export type Category = 'art' | 'music' | 'gaming' | 'collectibles' | 'photography'
export type SortKey = 'recent' | 'price-asc' | 'price-desc' | 'name'

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface Session {
  token: string
  user: User
  expiresAt: string
}

export interface NFT {
  id: string
  name: string
  collection: string
  edition: string
  category: Category
  description: string
  price: EthString
  available: number
  featured: boolean
  images: string[]
  version: number
  createdAt: string
}

export interface CartItem {
  nftId: string
  quantity: number
  /** preço no momento em que foi adicionado, usado para detectar mudança */
  unitPrice: EthString
}

export interface Cart {
  items: CartItem[]
  couponCode: string | null
}

export interface Coupon {
  code: string
  percent: number
  expiresAt: string
}

export interface CartLine extends CartItem {
  nft: NFT | null
  currentPrice: EthString
  priceChanged: boolean
  unavailable: boolean
  exceedsStock: boolean
}

export interface Quote {
  lines: CartLine[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  coupon: Coupon | null
  hasIssues: boolean
  /** identifica o conteúdo cotado; o checkout reenvia para confirmar */
  quoteId: string
}

export type WalletProvider = 'metamask' | 'coinbase' | 'walletconnect'
export type Network = 'ethereum' | 'polygon' | 'arbitrum'

export interface Wallet {
  id: string
  provider: WalletProvider
  network: Network
  address: string
  connected: boolean
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export interface OrderItem {
  nftId: string
  name: string
  collection: string
  edition: string
  image: string
  quantity: number
  unitPrice: EthString
}

export interface Order {
  id: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  couponCode: string | null
  txRef: string
  walletId: string
  network: Network
  collector: { name: string; email: string }
  createdAt: string
  version: number
  rejectionReason?: string
}

export interface ApiErrorBody {
  code:
    | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'SESSION_EXPIRED' | 'FORBIDDEN' | 'NOT_FOUND'
    | 'CONFLICT' | 'INTERNAL' | 'COUPON_INVALID' | 'COUPON_EXPIRED' | 'PRICE_CHANGED'
    | 'SOLD_OUT' | 'PAYMENT_REJECTED' | 'TIMEOUT'
  message: string
  details?: Record<string, unknown>
}

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Eventos Socket.IO: identidade estável, recurso afetado e versão. */
export interface SocketEventBase {
  eventId: string
  resource: string
  version: number
  at: string
}
export interface NftUpdatedEvent extends SocketEventBase {
  type: 'nft.updated'
  nftId: string
  changes: Partial<Pick<NFT, 'price' | 'available'>>
}
export interface OrderUpdatedEvent extends SocketEventBase {
  type: 'order.updated'
  orderId: string
  status: OrderStatus
  rejectionReason?: string
}
export type SocketEvent = NftUpdatedEvent | OrderUpdatedEvent

export interface CatalogFacets { categories: Category[]; collections: string[] }
