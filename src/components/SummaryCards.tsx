interface Props {
  income: number
  expense: number
  balance: number
}

export default function SummaryCards({ income, expense, balance }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow">
        <p className="font-bold text-green-700">Pemasukan</p>
        <p className="text-2xl font-semibold text-green-800">Rp{income.toLocaleString()}</p>
      </div>
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg shadow">
        <p className="font-bold text-red-700">Pengeluaran</p>
        <p className="text-2xl font-semibold text-red-800">Rp{expense.toLocaleString()}</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow">
        <p className="font-bold text-blue-700">Saldo</p>
        <p className="text-2xl font-semibold text-blue-800">Rp{balance.toLocaleString()}</p>
      </div>
    </div>
    
  )
}