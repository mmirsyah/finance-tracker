"use client"
import React from 'react'

export default function TransactionTable({ transactions, startEdit }: any) {
  return (
    <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
      <h2 className="text-lg font-semibold mb-4">Riwayat Transaksi</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-center">
            <th className="p-2 border">Tanggal</th>
            <th className="p-2 border">Jenis</th>
            <th className="p-2 border">Kategori</th>
            <th className="p-2 border">Akun</th>
            <th className="p-2 border">Jumlah</th>
            <th className="p-2 border">Catatan</th>
            <th className="p-2 border">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t: any) => (
            <tr 
              key={t.id} 
              className={`text-center ${t.type === 'expense' ? 'bg-red-50' : t.type === 'income' ? 'bg-green-50' : 'bg-gray-50'}`}
            >
              <td className="p-2 border">{t.date}</td>
              <td className="p-2 border capitalize">{t.type}</td>
              <td className="p-2 border">{t.categories?.name || '-'}</td>
              <td className="p-2 border">{t.accounts?.name || '-'}</td>
              <td className={`p-2 border font-bold ${t.type === 'expense' ? 'text-red-500' : t.type === 'income' ? 'text-green-500' : 'text-gray-500'}`}>
                Rp {Number(t.amount).toLocaleString()}
              </td>
              <td className="p-2 border">{t.note || '-'}</td>
              <td className="p-2 border">
                <button 
                  onClick={() => startEdit(t)} 
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
