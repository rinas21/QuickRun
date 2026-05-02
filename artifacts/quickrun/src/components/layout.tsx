import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Package, Menu, X, LogOut, User, LayoutDashboard, ListOrdered, Users, ShoppingBag, Archive, Bike } from "lucide-react";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => logout(),
      onError: () => logout(),
    });
  };

  const NavLinks = () => {
    if (!isAuthenticated || !user) return null;

    if (user.role === "buyer") {
      return (
        <>
          <Link href="/buyer" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> My Orders
          </Link>
          <Link href="/marketplace" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Marketplace
          </Link>
        </>
      );
    }
    if (user.role === "seller") {
      return (
        <>
          <Link href="/seller" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Requests
          </Link>
          <Link href="/seller/inventory" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
            <Archive className="h-4 w-4" /> My Inventory
          </Link>
        </>
      );
    }
    if (user.role === "driver") {
      return (
        <>
          <Link href="/driver" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
            <Bike className="h-4 w-4" /> Deliveries
          </Link>
        </>
      );
    }
    if (user.role === "admin") {
      return (
        <>
          <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link href="/admin/orders" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Orders
          </Link>
          <Link href="/admin/users" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
            <Users className="h-4 w-4" /> Users
          </Link>
          <Link href="/marketplace" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Marketplace
          </Link>
        </>
      );
    }
    return null;
  };

  // Online status dot for drivers
  const DriverStatusDot = () => {
    if (!user || user.role !== "driver") return null;
    return (
      <span
        title={user.isOnline ? "Online" : "Offline"}
        className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background ${user.isOnline ? "bg-green-500" : "bg-gray-400"}`}
      />
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Package className="h-5 w-5" />
              </div>
              QuickRun
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLinks />
            {isAuthenticated ? (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-foreground">{user?.name}</span>
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
                  <DriverStatusDot />
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 -mr-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t p-4 bg-background shadow-lg absolute top-16 left-0 right-0 z-50 flex flex-col gap-4">
            <NavLinks />
            {isAuthenticated ? (
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center gap-2 text-sm mb-4">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{user?.name}</span>
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
                  <DriverStatusDot />
                </div>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                </Button>
                <Button asChild className="w-full justify-start">
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
