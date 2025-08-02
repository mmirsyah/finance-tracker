"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SummaryCards from '@/components/SummaryCards'
import TransactionTable from '@/components/TransactionTable'
import TransactionModal from '@/components/TransactionModal'
import TransactionFilters from '@/components/TransactionFilters'
import { Transaction, Category, Account } from '@/types'

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  // Form state
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [accountId, setAccountId] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Summary
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })

  // Filters
  const [filterType, setFilterType] = useState<string>('') 
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterAccount, setFilterAccount] = useState<string>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')

  const calculateSummary = (data: Transaction[]) => {
    let income = 0, expense = 0
    data.forEach(t => t.type === 'income' ? income += Number(t.amount) : expense += Number(t.amount))
    return { income, expense, balance: income - expense }
  }

  const fetchTransactions = async () => {
    let query = supabase
      .from('transactions')
      .select('*, categories(name), accounts(name)')
      .order('date', { ascending: false })

    if (filterType) query = query.eq('type', filterType)
    if (filterCategory) query = query.eq('category', filterCategory)
    if (filterAccount) query = query.eq('account_id', filterAccount)
    if (filterStartDate) query = query.gte('date', filterStartDate)
    if (filterEndDate) query = query.lte('date', filterEndDate)

    const { data, error } = await query
    if (!error) {
      setTransactions(data || [])
      setSummary(calculateSummary(data || []))
    }
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
  }

  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('*').order('name')
    setAccounts(data || [])
  }

  const saveTransaction = async () => {
    if (!amount || !category || !accountId || !date) return alert('Lengkapi data!')
    const payload = { type, amount: Number(amount), category, account_id: accountId, note, date }
    let error
    if (editId) ({ error } = await supabase.from('transactions').update(payload).eq('id', editId))
    else ({ error } = await supabase.from('transactions').insert([payload]))
    if (!error) { resetForm(); fetchTransactions(); setIsModalOpen(false); }
  }

  const resetForm = () => { 
    setType('expense'); setAmount(''); setCategory(''); setAccountId(''); setNote(''); setDate(''); setEditId(null) 
  }

  const startEdit = (t: Transaction) => { 
    setEditId(t.id)
    setType(t.type)
    setAmount(String(t.amount))
    setCategory(t.category)
    setAccountId(t.account_id || '')
    setNote(t.note || '')
    setDate(t.date)
    setIsModalOpen(true) // langsung buka modal
  }

  useEffect(() => { 
    fetchCategories()
    fetchAccounts()
    fetchTransactions()
  }, [filterType, filterCategory, filterAccount, filterStartDate, filterEndDate])

  return (
    <div className="p-6 w-full min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Catatan Keuangan</h1>

        <SummaryCards {...summary} />

        {/* Filters */}
        <TransactionFilters
          {...{ filterType, setFilterType, filterCategory, setFilterCategory, filterAccount, setFilterAccount, filterStartDate, setFilterStartDate, filterEndDate, setFilterEndDate, categories, accounts, fetchTransactions }}
        />

        {/* Add Transaction Button */}
        <div className="flex justify-end mb-6">
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <span className="text-xl font-bold">＋</span> Add Transaction
          </button>
        </div>

        {/* Modal */}
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); resetForm() }}
          onSave={saveTransaction}
          {...{ type, setType, amount, setAmount, category, setCategory, accountId, setAccountId, note, setNote, date, setDate, categories, accounts, editId }}
        />

        {/* Table */}
        <TransactionTable transactions={transactions} startEdit={startEdit} />
      </div>
    </div>
  )
}
