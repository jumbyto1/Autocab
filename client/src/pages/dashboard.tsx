import { Header } from "@/components/layout/header";
import { MobileMenuButton } from "@/components/layout/sidebar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { JobsTable } from "@/components/dashboard/jobs-table";

export default function Dashboard() {
  return (
    <>
      {/* Mobile-optimized header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <MobileMenuButton />
          <div>
            <h1 className="text-base md:text-lg font-semibold text-gray-900">Job Dashboard</h1>
            <p className="text-xs md:text-sm text-gray-500">Manage and process transportation bookings</p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 md:p-8">
        <StatsCards />
        
        <div className="mt-4 md:mt-6">
          <JobsTable />
        </div>
      </div>
    </>
  );
}
