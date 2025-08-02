"use client"
import React from 'react'

export default function TransactionFilters({
  filterType, setFilterType,
  filterCategory, setFilterCategory,
  filterStartDate, setFilterStartDate,
  filterEndDate, setFilterEndDate,
  filterAccount, setFilterAccount,
  categories, accounts,
  fetchTransactions
}: any) {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-600">Jenis</label>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded p-2">
          <option value="">Semua</option>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600">Kategori</label>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border rounded p-2">
          <option value="">Semua</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {/* Filter Akun */}
      <div>
        <label className="block text-sm font-medium text-gray-600">Akun</label>
        <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="border rounded p-2">
          <option value="">Semua</option>
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600">Dari</label>
        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="border rounded p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600">Sampai</label>
        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="border rounded p-2" />
      </div>
      <div className="flex items-end gap-2">
        <button 
          onClick={fetchTransactions} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
          Filter
        </button>
        <button 
          onClick={() => { setFilterType(''); setFilterCategory(''); setFilterAccount(''); setFilterStartDate(''); setFilterEndDate(''); fetchTransactions(); }} 
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition">
          Clear
        </button>
      </div>
    </div>
  )
}