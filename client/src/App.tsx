import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { CartProvider, useCart } from "@/lib/cart";
import { CityProvider } from "@/lib/cityContext";
import { AddonSuggestionDialog } from "@/components/AddonSuggestionDialog";
import { CookieConsent } from "@/components/CookieConsent";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FloatingCart } from "@/components/FloatingCart";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { useEffect, lazy, Suspense } from "react";
import { useAnalytics } from "@/lib/analytics";

import Home from "@/pages/Home";

const Catalog = lazy(() => import("@/pages/Catalog"));
const Shops = lazy(() => import("@/pages/Shops"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const ShopDetail = lazy(() => import("@/pages/ShopDetail"));
const Cart = lazy(() => import("@/pages/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Auth = lazy(() => import("@/pages/Auth"));
const SellerAuth = lazy(() => import("@/pages/SellerAuth"));
const Account = lazy(() => import("@/pages/Account"));
const ShopDashboard = lazy(() => import("@/pages/ShopDashboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const Chat = lazy(() => import("@/pages/Chat"));
const DeliveryAndPayment = lazy(() => import("@/pages/DeliveryAndPayment"));
const TermsOfUse = lazy(() => import("@/pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const LegalInfo = lazy(() => import("@/pages/LegalInfo"));
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("@/pages/PaymentFail"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AddonModalMount() {
  const { addonShopId, clearAddonSuggestion } = useCart();
  return <AddonSuggestionDialog shopId={addonShopId} onClose={clearAddonSuggestion} />;
}

function ServiceWorkerNavigator() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE" && event.data.link) {
        setLocation(event.data.link);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [setLocation]);
  return null;
}

function AnalyticsTracker() {
  useAnalytics();
  return null;
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/catalog" component={Catalog} />
            <Route path="/shops" component={Shops} />
            <Route path="/product/:id" component={ProductDetail} />
            <Route path="/shop/:id" component={ShopDetail} />
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/auth" component={Auth} />
            <Route path="/seller-auth" component={SellerAuth} />
            <Route path="/account" component={Account} />
            <Route path="/shop-dashboard" component={ShopDashboard} />
            <Route path="/admin" component={Admin} />
            <Route path="/chat" component={Chat} />
            <Route path="/delivery-and-payment" component={DeliveryAndPayment} />
            <Route path="/terms-of-use" component={TermsOfUse} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/legal-info" component={LegalInfo} />
            <Route path="/payment/success" component={PaymentSuccess} />
            <Route path="/payment/fail" component={PaymentFail} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
      <FloatingCart />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CityProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
              <AnalyticsTracker />
              <AddonModalMount />
              <CookieConsent />
              <PushNotificationPrompt />
              <ServiceWorkerNavigator />
            </TooltipProvider>
          </CartProvider>
        </CityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
