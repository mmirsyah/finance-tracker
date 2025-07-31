"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [transactions, setTransactions] = useState([])
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')

  // Ambil data transaksi
  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
    if (error) {
      console.error(error)
    }
    console.log("Data transaksi:", data)
    setTransactions(data || [])
  }

  // Tambah transaksi
  const addTransaction = async () => {
    if (!amount || !category) return alert('Lengkapi data!')
    const { error } = await supabase.from('transactions').insert([
      { type, amount: Number(amount), category, note, date: new Date() }
    ])
    if (error) {
      console.error(error)
      return alert('Gagal menambah transaksi')
    }
    setAmount('')
    setCategory('')
    setNote('')
    await fetchTransactions() // langsung refresh daftar
  }

  // Ambil data pertama kali dan refresh tiap 5 detik
  useEffect(() => {
    fetchTransactions()
    const interval = setInterval(fetchTransactions, 5000) // refresh otomatis
    return () => clearInterval(interval)
  }, [])

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
