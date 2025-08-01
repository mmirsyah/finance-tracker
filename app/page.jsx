"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  // ======== STATE (Data yang disimpan di memori saat aplikasi berjalan) ========
  const [transactions, setTransactions] = useState([])   // daftar transaksi
  const [categories, setCategories] = useState([])       // daftar kategori
  const [type, setType] = useState('expense')            // jenis transaksi (default: expense)
  const [amount, setAmount] = useState('')               // jumlah uang
  const [category, setCategory] = useState('')           // kategori (id kategori)
  const [note, setNote] = useState('')                   // catatan
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]) // tanggal transaksi (default: hari ini)
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 }) // ringkasan keuangan

  // ======== HITUNG RINGKASAN (total income, expense, balance) ========
  const calculateSummary = (data) => {
    let income = 0
    let expense = 0
    data.forEach(t => {
      if (t.type === 'income') {
        income += Number(t.amount)
      } else if (t.type === 'expense') {
        expense += Number(t.amount)
      }
    })
    return { income, expense, balance: income - expense }
  }

  // ======== AMBIL TRANSAKSI DARI SUPABASE ========
  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(name)') // ambil transaksi + nama kategori (relasi foreign key)
      .order('date', { ascending: false }) // urutkan dari terbaru
    if (!error) {
      setTransactions(data || [])
      setSummary(calculateSummary(data || []))
    } else {
      console.error("Fetch transactions error:", error)
    }
  }

  // ======== AMBIL KATEGORI DARI SUPABASE ========
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (!error) {
      setCategories(data || [])
    } else {
      console.error("Fetch categories error:", error)
    }
  }

  // ======== TAMBAH TRANSAKSI BARU ========
  const addTransaction = async () => {
    if (!amount || !category || !date) return alert('Lengkapi data!')
    const { error } = await supabase.from('transactions').insert([
      { type, amount: Number(amount), category: Number(category), note, date }
    ])
    if (error) {
      console.error("Insert error:", error)
      return alert('Gagal menambah transaksi')
    }
    // Reset input setelah berhasil
    setAmount('')
    setCategory('')
    setNote('')
    setDate(new Date().toISOString().split('T')[0]) // kembalikan ke tanggal hari ini
    await fetchTransactions()
  }

  // ======== USE EFFECT (jalan saat halaman pertama kali dibuka) ========
  useEffect(() => {
    fetchCategories()
    fetchTransactions()
    // auto-refresh setiap 5 detik
    const interval = setInterval(fetchTransactions, 5000)
    return () => clearInterval(interval)
  }, [])

  // ======== RENDER (TAMPILAN) ========
  return (
    <div style={{ padding: 20 }}>
      <h1>Catatan Keuangan</h1>

      {/* ===== RINGKASAN KEUANGAN ===== */}
      <div style={{ marginBottom: 20 }}>
        <h3>Ringkasan</h3>
        <p><b>Pemasukan:</b> Rp{summary.income.toLocaleString()}</p>
        <p><b>Pengeluaran:</b> Rp{summary.expense.toLocaleString()}</p>
        <p><b>Saldo:</b> Rp{summary.balance.toLocaleString()}</p>
      </div>

      {/* ===== FORM INPUT TRANSAKSI ===== */}
      <div>
        {/* Pilih tipe transaksi */}
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
          <option value="transfer">Transfer</option>
        </select>

        {/* Input jumlah uang */}
        <input 
          type="number" 
          placeholder="Jumlah" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
        />

        {/* Dropdown kategori */}
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Pilih Kategori</option>
          {categories
            .filter(c => c.type?.toLowerCase() === type)
            .map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Input tanggal (baru ditambahkan) */}
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
        />

        {/* Input catatan */}
        <input 
          type="text" 
          placeholder="Catatan" 
          value={note} 
          onChange={(e) => setNote(e.target.value)} 
        />

        {/* Tombol tambah transaksi */}
        <button onClick={addTransaction}>Tambah</button>
      </div>

      {/* ===== DAFTAR TRANSAKSI ===== */}
      <h2>Riwayat Transaksi</h2>
      <ul>
        {transactions.length > 0 ? (
          transactions.map(t => (
            <li key={t.id}>
              [{t.type}] Rp{t.amount} - {t.categories?.name || t.category} ({t.note}) pada {t.date}
            </li>
          ))
        ) : (
          <li>Belum ada transaksi</li>
        )}
      </ul>
    </div>
  )
}
