import { Category } from '@/types'

interface Props {
  type: string
  amount: string
  category: string
  note: string
  date: string
  editId: string | null
  categories: Category[]
  setType: (val: string) => void
  setAmount: (val: string) => void
  setCategory: (val: string) => void
  setNote: (val: string) => void
  setDate: (val: string) => void
  saveTransaction: () => void
  resetForm: () => void
}

export default function TransactionForm({
  type, amount, category, note, date, editId, categories,
  setType, setAmount, setCategory, setNote, setDate,
  saveTransaction, resetForm
}: Props) {
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">{editId ? "✏️ Edit Transaksi" : "➕ Tambah Transaksi"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Jenis</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded p-2 focus:ring focus:ring-blue-100">
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah</label>
          <input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded p-2 focus:ring focus:ring-blue-100"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded p-2 focus:ring focus:ring-blue-100">
            <option value="">Pilih Kategori</option>
            {categories.filter(c => c.type === type).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded p-2 focus:ring focus:ring-blue-100"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Catatan</label>
          <input type="text" placeholder="Opsional" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border rounded p-2 focus:ring focus:ring-blue-100"/>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <button onClick={saveTransaction} className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition">
          {editId ? "Update" : "Tambah"}
        </button>
        {editId && (
          <button onClick={resetForm} className="bg-gray-300 px-5 py-2 rounded hover:bg-gray-400 transition">
            Batal
          </button>
        )}
      </div>
    </div>
  )
}
