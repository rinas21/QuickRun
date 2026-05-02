import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Register from "@/pages/register";
import BuyerDashboard from "@/pages/buyer/index";
import BuyerOrderDetail from "@/pages/buyer/order-detail";
import BuyerTracking from "@/pages/buyer/tracking";
import SellerDashboard from "@/pages/seller/index";
import SellerRespond from "@/pages/seller/respond";
import DriverDashboard from "@/pages/driver/index";
import DriverDelivery from "@/pages/driver/delivery";
import AdminDashboard from "@/pages/admin/index";
import AdminOrders from "@/pages/admin/orders";
import AdminUsers from "@/pages/admin/users";
import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(() => localStorage.getItem("qr_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ path, component: Component, allowedRoles }: { path: string, component: any, allowedRoles?: string[] }) {
  return (
    <Route path={path}>
      {(params) => {
        const { isAuthenticated, isLoading, user } = useAuth();
        
        if (isLoading) return <div>Loading...</div>;
        if (!isAuthenticated) return <Redirect to="/login" />;
        
        if (allowedRoles && user && !allowedRoles.includes(user.role)) {
          // Redirect to their default dashboard if wrong role
          if (user.role === 'buyer') return <Redirect to="/buyer" />;
          if (user.role === 'seller') return <Redirect to="/seller" />;
          if (user.role === 'driver') return <Redirect to="/driver" />;
          if (user.role === 'admin') return <Redirect to="/admin" />;
          return <Redirect to="/login" />;
        }
        
        return <Component {...params} />;
      }}
    </Route>
  );
}

function HomeRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading...</div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role === 'buyer') return <Redirect to="/buyer" />;
  if (user?.role === 'seller') return <Redirect to="/seller" />;
  if (user?.role === 'driver') return <Redirect to="/driver" />;
  if (user?.role === 'admin') return <Redirect to="/admin" />;
  return <Redirect to="/login" />;
}

function Router() {
  return (
    <Switch>
      {/* Auth — public routes first so they always match */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Buyer */}
      <ProtectedRoute path="/buyer/order/:orderId" component={BuyerOrderDetail} allowedRoles={['buyer']} />
      <ProtectedRoute path="/buyer/tracking/:orderId" component={BuyerTracking} allowedRoles={['buyer']} />
      <ProtectedRoute path="/buyer" component={BuyerDashboard} allowedRoles={['buyer']} />

      {/* Seller */}
      <ProtectedRoute path="/seller/respond/:orderId" component={SellerRespond} allowedRoles={['seller']} />
      <ProtectedRoute path="/seller" component={SellerDashboard} allowedRoles={['seller']} />

      {/* Driver */}
      <ProtectedRoute path="/driver/delivery/:deliveryId" component={DriverDelivery} allowedRoles={['driver']} />
      <ProtectedRoute path="/driver" component={DriverDashboard} allowedRoles={['driver']} />

      {/* Admin */}
      <ProtectedRoute path="/admin/orders" component={AdminOrders} allowedRoles={['admin']} />
      <ProtectedRoute path="/admin/users" component={AdminUsers} allowedRoles={['admin']} />
      <ProtectedRoute path="/admin" component={AdminDashboard} allowedRoles={['admin']} />

      {/* Root — redirect based on role, placed last */}
      <Route path="/" component={HomeRedirect} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Layout>
              <Router />
            </Layout>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
