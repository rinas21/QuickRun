import { useGetDashboardStats, useGetRecentActivity, useGetOrderStatusBreakdown, getGetDashboardStatsQueryKey, getGetRecentActivityQueryKey, getGetOrderStatusBreakdownQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, Bike, Activity, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function AdminDashboard() {
  const { data: stats } = useGetDashboardStats({ query: { refetchInterval: 10000, queryKey: getGetDashboardStatsQueryKey() } });
  const { data: activity } = useGetRecentActivity({ limit: 10 }, { query: { refetchInterval: 10000, queryKey: getGetRecentActivityQueryKey({ limit: 10 }) } });
  const { data: breakdown } = useGetOrderStatusBreakdown({ query: { refetchInterval: 10000, queryKey: getGetOrderStatusBreakdownQueryKey() } });

  const chartData = breakdown?.map(item => ({
    name: item.status.replace(/_/g, ' '),
    count: item.count,
    color: ['cancelled', 'failed'].includes(item.status) ? '#ef4444' : 
           ['delivered'].includes(item.status) ? '#22c55e' : '#f97316'
  })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and real-time metrics.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Active Orders</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeOrders}</div>
              <p className="text-xs text-muted-foreground">Currently in progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.deliveredToday}</div>
              <p className="text-xs text-muted-foreground">Completed orders today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Drivers</CardTitle>
              <Bike className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.onlineDrivers} <span className="text-sm text-muted-foreground font-normal">/ {stats.totalDrivers}</span></div>
              <p className="text-xs text-muted-foreground">Available for jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{stats.totalSellers} Sellers</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Order Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activity?.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 bg-primary/10 p-1.5 rounded-full text-primary">
                    <Activity className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Order #{item.orderId} • {new Date(item.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {!activity?.length && <p className="text-muted-foreground text-sm text-center">No recent activity</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
