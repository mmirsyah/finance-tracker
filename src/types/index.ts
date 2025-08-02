export interface Category {
  id: string
  name: string
  type: 'income' | 'expense' | 'transfer'
}

export interface Transaction {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  category: string
  account_id?: string
  note?: string
  date: string
  categories?: { name: string }
  accounts?: {name: string}
}

export type Account = {
  id: string
  name: string
  type: string // contoh: 'cash', 'bank', 'e-wallet'
}