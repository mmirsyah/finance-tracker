"use client"
import { Transaction } from "@/types"

interface TransactionTableProps {
  transactions: Transaction[]
  startEdit: (transaction: Transaction) => void
}

export default function TransactionTable({ transactions, startEdit }: TransactionTableProps) {
  const getRowClass = (type: string) => {
    switch (type) {
      case "expense": return "bg-red-50"
      case "income": return "bg-green-50"
      case "transfer": return "bg-gray-50"
      default: return ""
    }
  }

  const getAmountTextClass = (type: string) => {
    switch (type) {
      case "expense": return "text-red-700"
      case "income": return "text-green-700"
      case "transfer": return "text-gray-700"
      default: return "text-gray-800"
    }
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Riwayat Transaksi</h2>
      <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-center text-gray-700 font-semibold">Tanggal</th>
            <th className="px-4 py-2 text-center text-gray-700 font-semibold">Jenis</th>
            <th className="px-4 py-2 text-center text-gray-700 font-semibold">Kategori</th>
            <th className="px-4 py-2 text-center text-gray-700 font-semibold">Akun</th>
            <th className="px-4 py-2 text-center text-gray-700 font-semibold">Jumlah</th>
            <th className="px-4 py-2 text-center text-gray-700 font-semibold">Catatan</th>
            <th className="px-4 py-2 text-center text-gray-700 font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length > 0 ? (
            transactions.map((t) => (
              <tr key={t.id} className={`${getRowClass(t.type)} border-t border-gray-300`}>
                <td className="px-4 py-2 text-center">{t.date}</td>
                <td className="px-4 py-2 text-center capitalize">{t.type}</td>
                <td className="px-4 py-2 text-center">{t.categories?.name || "-"}</td>
                <td className="px-4 py-2 text-center">{t.accounts?.name || "-"}</td>
                <td className={`px-4 py-2 text-center font-semibold ${getAmountTextClass(t.type)}`}>
                  Rp {t.amount.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-2 text-center">{t.note || "-"}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => startEdit(t)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                Belum ada transaksi
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
