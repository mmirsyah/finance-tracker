"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  // STATE
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })

  // FILTER STATE
  const [filterField, setFilterField] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [filteredTransactions, setFilteredTransactions] = useState([])

  // HITUNG RINGKASAN
  const calculateSummary = (data) => {
    let income = 0, expense = 0
    data.forEach(t => {
      if (t.type === 'income') income += Number(t.amount)
      else if (t.type === 'expense') expense += Number(t.amount)
    })
    return { income, expense, balance: income - expense }
  }

  // APPLY FILTER (dipanggil manual & otomatis)
  const applyFilter = (data, field = filterField, value = filterValue) => {
    if (!field || !value) {
      setFilteredTransactions(data)
      setSummary(calculateSummary(data))
      return
    }
    const filtered = data.filter(t => {
      if (field === 'categories.name') {
        return t.categories?.name?.toLowerCase().includes(value.toLowerCase())
      } else if (field === 'amount') {
        return Number(t.amount) === Number(value)
      } else {
        return t[field]?.toString().toLowerCase().includes(value.toLowerCase())
      }
    })
    setFilteredTransactions(filtered)
    setSummary(calculateSummary(filtered))
  }

  // AMBIL TRANSAKSI
  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .order('date', { ascending: false })
    if (!error) {
      setTransactions(data || [])
      applyFilter(data || []) // langsung apply filter setelah refresh
    } else {
      console.error("Fetch transactions error:", error)
    }
  }

  // AMBIL KATEGORI
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (!error) setCategories(data || [])
    else console.error("Fetch categories error:", error)
  }

  // TAMBAH TRANSAKSI
  const addTransaction = async () => {
    if (!amount || !category || !date) return alert('Lengkapi data!')
    const { error } = await supabase.from('transactions').insert([
      { type, amount: Number(amount), category: Number(category), note, date }
    ])
    if (error) {
      console.error("Insert error:", error)
      return alert('Gagal menambah transaksi')
    }
    setAmount(''); setCategory(''); setNote(''); setDate(new Date().toISOString().split('T')[0])
    await fetchTransactions()
  }

  const clearFilter = () => {
    setFilterField(''); setFilterValue('')
    applyFilter(transactions, '', '')
  }

  // INIT + AUTO REFRESH
  useEffect(() => {
    fetchCategories()
    fetchTransactions()
    const interval = setInterval(fetchTransactions, 5000)
    return () => clearInterval(interval)
  }, [])

  // Kalau filter diubah manual, langsung apply ke data sekarang
  useEffect(() => {
    applyFilter(transactions)
  }, [filterField, filterValue])

  // RENDER
  return (
    <div style={{ padding: 20 }}>
      <h1>Catatan Keuangan</h1>

      {/* Ringkasan */}
      <div style={{ marginBottom: 20 }}>
        <h3>Ringkasan</h3>
        <p><b>Pemasukan:</b> Rp{summary.income.toLocaleString()}</p>
        <p><b>Pengeluaran:</b> Rp{summary.expense.toLocaleString()}</p>
        <p><b>Saldo:</b> Rp{summary.balance.toLocaleString()}</p>
      </div>

      {/* Input transaksi */}
      <div>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
          <option value="transfer">Transfer</option>
        </select>
        <input type="number" placeholder="Jumlah" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Pilih Kategori</option>
          {categories.filter(c => c.type?.toLowerCase() === type).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="text" placeholder="Catatan" value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={addTransaction}>Tambah</button>
      </div>

      {/* Filter */}
      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <h3>Filter Transaksi</h3>
        <select value={filterField} onChange={(e) => setFilterField(e.target.value)}>
          <option value="">Pilih Kolom</option>
          <option value="type">Jenis</option>
          <option value="categories.name">Kategori</option>
          <option value="date">Tanggal</option>
          <option value="note">Catatan</option>
          <option value="amount">Jumlah</option>
        </select>
        <input type={filterField === 'date' ? 'date' : 'text'} placeholder="Nilai filter" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} />
        <button onClick={clearFilter} style={{ marginLeft: 10 }}>Clear Filter</button>
        {filterField && filterValue && (
          <p style={{ marginTop: 10, fontStyle: 'italic', color: 'green' }}>
            Filter aktif: {filterField} = "{filterValue}"
          </p>
        )}
      </div>

      {/* Daftar transaksi */}
      <h2>Riwayat Transaksi</h2>
      <ul>
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map(t => (
            <li key={t.id}>
              [{t.type}] Rp{t.amount} - {t.categories?.name || t.category} ({t.note}) pada {t.date}
            </li>
          ))
        ) : (
          <li>Tidak ada transaksi yang sesuai filter</li>
        )}
      </ul>
    </div>
  )
}
