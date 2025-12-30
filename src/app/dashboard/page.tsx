import { DashboardStatsCards } from "@/components/dashboard-stats-cards"
import { RevenueChart } from "@/components/revenue-chart"
import { RecentTransactions } from "@/components/recent-transactions"

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Stats Cards */}
        <DashboardStatsCards />

        {/* Revenue Chart */}
        <div className="px-0 lg:px-2">
          <RevenueChart />
        </div>

        {/* Recent Transactions */}
        <div className="px-0 lg:px-2">
          <RecentTransactions />
        </div>
      </div>
    </div>
  )
}
