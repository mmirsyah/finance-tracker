"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [transactions, setTransactions] = useState([])
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')

  const fetchTransactions = async () => {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    setTransactions(data)
  }

  const addTransaction = async () => {
    if (!amount || !category) return alert('Lengkapi data!')
    await supabase.from('transactions').insert([{ type, amount, category, note, date: new Date() }])
    setAmount('')
    setCategory('')
    setNote('')
    fetchTransactions()
  }

  useEffect(() => { fetchTransactions() }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>Catatan Keuangan</h1>
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
        {transactions.map(t => (
          <li key={t.id}>
            [{t.type}] Rp{t.amount} - {t.category} ({t.note})
          </li>
        ))}
      </ul>
    </div>
  )
}
