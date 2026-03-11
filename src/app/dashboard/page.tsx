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

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <StatCards stats={data?.stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[1px] bg-border animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="lg:col-span-1">
          <SpendingLimitsCard stats={data?.stats} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <BalanceCard chartData={data?.chartData} stats={data?.stats} loading={loading} />
        </div>
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
        <TransactionTable
          transactions={data?.recentTransactions}
          loading={loading}
          globalSearch={globalSearch}
        />
      </div>
    </div>
  )
}
