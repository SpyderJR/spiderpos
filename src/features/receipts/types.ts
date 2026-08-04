export interface ReceiptItem {
  name: string
  quantity: number
  unitType: 'piece' | 'kg' | 'g' | 'lt' | 'm'
  unitPrice: number
  discount: number
  subtotal: number
}

export interface ReceiptPayment {
  method: 'cash' | 'card' | 'transfer' | 'credit'
  amount: number
  changeGiven: number
}

export interface ReceiptData {
  saleId: string
  folio: string
  createdAt: string
  cashierName: string
  customerName: string | null
  storeName: string
  storeAddress: string | null
  storePhone: string | null
  storeLogoUrl: string | null
  footerMessage: string | null
  items: ReceiptItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  payments: ReceiptPayment[]
  isCopy: boolean
}
