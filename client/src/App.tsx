import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import Shops from "@/pages/Shops";
import ProductDetail from "@/pages/ProductDetail";
import ShopDetail from "@/pages/ShopDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Auth from "@/pages/Auth";
import Account from "@/pages/Account";
import ShopDashboard from "@/pages/ShopDashboard";
import Admin from "@/pages/Admin";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/catalog" component={Catalog} />
          <Route path="/shops" component={Shops} />
          <Route path="/product/:id" component={ProductDetail} />
          <Route path="/shop/:id" component={ShopDetail} />
          <Route path="/cart" component={Cart} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/auth" component={Auth} />
          <Route path="/account" component={Account} />
          <Route path="/shop-dashboard" component={ShopDashboard} />
          <Route path="/admin" component={Admin} />
          <Route path="/chat" component={Chat} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
