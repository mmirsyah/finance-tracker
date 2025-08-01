"use client"
import React from 'react'

export default function TransactionModal({
  isOpen,
  onClose,
  onSave,
  type, setType,
  amount, setAmount,
  category, setCategory,
  note, setNote,
  date, setDate,
  accountId, setAccountId,
  categories,
  accounts,
  editId
}: any) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        {/* Tombol X */}
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4">{editId ? "Edit Transaction" : "Add Transaction"}</h2>
        
        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Jenis</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)} 
              className="w-full border rounded p-2 focus:ring focus:ring-blue-100"
            >
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah</label>
            <input 
              type="number" 
              placeholder="0" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              className="w-full border rounded p-2 focus:ring focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Kategori</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              className="w-full border rounded p-2 focus:ring focus:ring-blue-100"
            >
              <option value="">Pilih Kategori</option>
              {categories.filter((c: any) => c.type === type).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Field Akun */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Akun</label>
            <select 
              value={accountId} 
              onChange={(e) => setAccountId(e.target.value)} 
              className="w-full border rounded p-2 focus:ring focus:ring-blue-100"
            >
              <option value="">Pilih Akun</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full border rounded p-2 focus:ring focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Catatan</label>
            <input 
              type="text" 
              placeholder="Opsional" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              className="w-full border rounded p-2 focus:ring focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Tombol */}
        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={onSave} 
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
          >
            {editId ? "Update" : "Add"}
          </button>
          <button 
            onClick={onClose} 
            className="bg-gray-300 px-5 py-2 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}