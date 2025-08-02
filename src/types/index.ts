export interface Category {
  id: string
  name: string
  type: string // expense | income | transfer
}

export interface Account {
  id: string
  name: string
  balance?: number
}

export interface Transaction {
  id: string
  type: string // expense | income | transfer
  amount: number
  category: string
  account_id?: string
  note?: string
  date: string
  categories?: { name: string }
  accounts?: { name: string }
}