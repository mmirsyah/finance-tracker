"use client"
import { Category, Account } from "@/types"

interface TransactionFiltersProps {
  filterType: string
  setFilterType: (v: string) => void
  filterCategory: string
  setFilterCategory: (v: string) => void
  filterAccount: string
  setFilterAccount: (v: string) => void
  filterStartDate: string
  setFilterStartDate: (v: string) => void
  filterEndDate: string
  setFilterEndDate: (v: string) => void
  categories: Category[]
  accounts: Account[]
  fetchTransactions: () => void
}

export default function TransactionFilters({
  filterType, setFilterType,
  filterCategory, setFilterCategory,
  filterAccount, setFilterAccount,
  filterStartDate, setFilterStartDate,
  filterEndDate, setFilterEndDate,
  categories, accounts,
  fetchTransactions
}: TransactionFiltersProps) {
  const clearFilters = () => {
    setFilterType("")
    setFilterCategory("")
    setFilterAccount("")
    setFilterStartDate("")
    setFilterEndDate("")
    fetchTransactions()
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Jenis */}
      <div>
        <label className="block text-sm font-medium text-gray-600">Jenis</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border rounded p-2 w-full"
        >
          <option value="">Semua</option>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      {/* Kategori */}
      <div>
        <label className="block text-sm font-medium text-gray-600">Kategori</label>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border rounded p-2 w-full"
        >
          <option value="">Semua</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Akun */}
      <div>
        <label className="block text-sm font-medium text-gray-600">Akun</label>
        <select
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className="border rounded p-2 w-full"
        >
          <option value="">Semua</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Dari */}
      <div>
        <label className="block text-sm font-medium text-gray-600">Dari</label>
        <input
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          className="border rounded p-2 w-full"
        />
      </div>

      {/* Sampai */}
      <div>
        <label className="block text-sm font-medium text-gray-600">Sampai</label>
        <input
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          className="border rounded p-2 w-full"
        />
      </div>

      {/* Tombol */}
      <div className="sm:col-span-2 lg:col-span-5 flex gap-2 justify-end">
        <button
          onClick={fetchTransactions}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Filter
        </button>
        <button
          onClick={clearFilters}
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition"
        >
          Clear
        </button>
      </div>
    </div>
  )
}