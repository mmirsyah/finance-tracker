"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SummaryCards from '@/components/SummaryCards'
import TransactionForm from '@/components/TransactionForm'
import TransactionTable from '@/components/TransactionTable'
import { Transaction, Category } from '@/types'

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })

  const calculateSummary = (data: Transaction[]) => {
    let income = 0, expense = 0
    data.forEach(t => t.type === 'income' ? income += Number(t.amount) : expense += Number(t.amount))
    return { income, expense, balance: income - expense }
  }

  const fetchTransactions = async () => {
    const { data, error } = await supabase.from('transactions').select('*, categories(name)').order('date', { ascending: false })
    if (!error) {
      setTransactions(data || [])
      setSummary(calculateSummary(data || []))
    }
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
  }

  const saveTransaction = async () => {
    if (!amount || !category || !date) return alert('Lengkapi data!')
    const payload = { type, amount: Number(amount), category, note, date }
    let error
    if (editId) ({ error } = await supabase.from('transactions').update(payload).eq('id', editId))
    else ({ error } = await supabase.from('transactions').insert([payload]))
    if (!error) { resetForm(); fetchTransactions() }
  }

  const resetForm = () => { setType('expense'); setAmount(''); setCategory(''); setNote(''); setDate(''); setEditId(null) }
  const startEdit = (t: Transaction) => { setEditId(t.id); setType(t.type); setAmount(String(t.amount)); setCategory(t.category); setNote(t.note || ''); setDate(t.date) }

  useEffect(() => { fetchCategories(); fetchTransactions() }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">📒 Catatan Keuangan</h1>
      <SummaryCards {...summary} />
      <TransactionForm {...{ type, amount, category, note, date, editId, categories, setType, setAmount, setCategory, setNote, setDate, saveTransaction, resetForm }} />
      <TransactionTable transactions={transactions} startEdit={startEdit} />
    </div>
  )
}
