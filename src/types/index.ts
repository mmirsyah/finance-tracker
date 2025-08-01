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
  note?: string
  date: string
  categories?: { name: string }
}