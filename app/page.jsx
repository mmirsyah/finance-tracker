"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [transactions, setTransactions] = useState([])
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })

  const calculateSummary = (data) => {
    let income = 0
    let expense = 0
    data.forEach(t => {
      if (t.type === 'income') {
        income += Number(t.amount)
      } else {
        expense += Number(t.amount)
      }
    })
    return {
      income,
      expense,
      balance: income - expense
    }
  }

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
    if (error) {
      console.error("Failed to fetch transactions:", error)
    } else {
      setTransactions(data || [])
      setSummary(calculateSummary(data || []))
    }
  }

  const addTransaction = async () => {
    if (!amount || !category) return alert('Lengkapi data!')
    const { error } = await supabase.from('transactions').insert([
      { type, amount: Number(amount), category, note, date: new Date() }
    ])
    if (error) {
      console.error("Failed to insert transaction:", error)
      return alert('Gagal menambah transaksi')
    }
    setAmount('')
    setCategory('')
    setNote('')
    await fetchTransactions()
  }

  useEffect(() => {
    fetchTransactions()
    const interval = setInterval(fetchTransactions, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>Catatan Keuangan</h1>

      <div style={{ marginBottom: 20 }}>
        <h3>Ringkasan</h3>
        <p><b>Pemasukan:</b> Rp{summary.income.toLocaleString()}</p>
        <p><b>Pengeluaran:</b> Rp{summary.expense.toLocaleString()}</p>
        <p><b>Saldo:</b> Rp{summary.balance.toLocaleString()}</p>
      </div>

      <div>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
        <input type="number" placeholder="Jumlah" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input type="text" placeholder="Kategori" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input type="text" placeholder="Catatan" value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={addTransaction}>Tambah</button>
      </div>

      <h2>Riwayat Transaksi</h2>
      <ul>
        {transactions.length > 0 ? (
          transactions.map(t => (
            <li key={t.id}>
              [{t.type}] Rp{t.amount} - {t.category} ({t.note})
            </li>
          ))
        ) : (
          <li>Belum ada transaksi</li>
        )}
      </ul>
    </div>
  )
}
