import { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
  startEdit: (t: Transaction) => void
}

export default function TransactionTable({ transactions, startEdit }: Props) {
  return (
    <>
      <h2 className="text-xl font-bold mt-6 mb-3 text-gray-800">📑 Riwayat Transaksi</h2>
      {transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 shadow-md rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">Tanggal</th>
                <th className="border px-4 py-2 text-left">Jenis</th>
                <th className="border px-4 py-2 text-left">Kategori</th>
                <th className="border px-4 py-2 text-right">Jumlah</th>
                <th className="border px-4 py-2 text-left">Catatan</th>
                <th className="border px-4 py-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50 ${t.type === "income" ? "bg-green-50" : t.type === "expense" ? "bg-red-50" : "bg-gray-50"}`}>
                  <td className="border px-4 py-2">{t.date}</td>
                  <td className="border px-4 py-2 capitalize">{t.type}</td>
                  <td className="border px-4 py-2">{t.categories?.name || t.category}</td>
                  <td className={`border px-4 py-2 text-right font-semibold ${t.type === "income" ? "text-green-700" : t.type === "expense" ? "text-red-700" : "text-gray-700"}`}>
                    Rp{Number(t.amount).toLocaleString()}
                  </td>
                  <td className="border px-4 py-2">{t.note}</td>
                  <td className="border px-4 py-2 text-center">
                    <button onClick={() => startEdit(t)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 italic">Belum ada transaksi</p>
      )}
    </>
  )
}
