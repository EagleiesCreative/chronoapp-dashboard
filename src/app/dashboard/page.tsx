"use client"

import { useEffect, useState } from "react"
import { ActionBar } from "@/components/dashboard/ActionBar"
import { StatCards } from "@/components/dashboard/StatCards"
import { SpendingLimitsCard } from "@/components/dashboard/SpendingLimitsCard"
import { BalanceCard } from "@/components/dashboard/BalanceCard"
import { TransactionTable } from "@/components/dashboard/TransactionTable"

export default function Page() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [globalSearch, setGlobalSearch] = useState("")

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleGenerateReport = () => {
    window.print()
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 print:p-0 print:gap-4 print:bg-white print:text-black">
      <div className="print:hidden">
        <ActionBar
          searchTerm={globalSearch}
          onSearch={setGlobalSearch}
          onGenerateReport={handleGenerateReport}
        />
      </div>

      <StatCards stats={data?.stats} loading={loading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 print:grid-cols-1 print:gap-4">
        <div className="lg:col-span-2">
          <SpendingLimitsCard stats={data?.stats} loading={loading} />
        </div>
        <div className="lg:col-span-3">
          <BalanceCard chartData={data?.chartData} stats={data?.stats} loading={loading} />
        </div>
      </div>

      <TransactionTable
        transactions={data?.recentTransactions}
        loading={loading}
        globalSearch={globalSearch}
      />
    </div>
  )
}
