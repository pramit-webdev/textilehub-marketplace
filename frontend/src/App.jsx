import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AIChatWidget from "./components/AIChatWidget";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

import Landing from "./pages/Landing";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import BuyerDashboard from "./pages/BuyerDashboard";
import Compare from "./pages/Compare";
import SupplierDashboard from "./pages/SupplierDashboard";
import SupplierProducts from "./pages/SupplierProducts";
import SupplierOrders from "./pages/SupplierOrders";
import SupplierProfile from "./pages/SupplierProfile";
import NotFound from "./pages/NotFound";

function AssistantHost() {
  const { user } = useAuth();
  if (!user || user.role !== "buyer") return null;
  return <AIChatWidget />;
}

function SupplierLayout() {
  return (
    <Routes>
      <Route path="" element={<ProtectedRoute role="supplier"><SupplierDashboard /></ProtectedRoute>} />
      <Route path="products" element={<ProtectedRoute role="supplier"><SupplierProducts /></ProtectedRoute>} />
      <Route path="orders" element={<ProtectedRoute role="supplier"><SupplierOrders /></ProtectedRoute>} />
      <Route path="profile" element={<ProtectedRoute role="supplier"><SupplierProfile /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<ProtectedRoute role="buyer"><Onboarding /></ProtectedRoute>} />
                  <Route path="/onboarding/supplier" element={<ProtectedRoute role="supplier"><Onboarding /></ProtectedRoute>} />
                  <Route path="/cart" element={<ProtectedRoute role="buyer"><Cart /></ProtectedRoute>} />
                  <Route path="/checkout" element={<ProtectedRoute role="buyer"><Checkout /></ProtectedRoute>} />
                  <Route path="/checkout/success" element={<ProtectedRoute role="buyer"><OrderSuccess /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute role="buyer"><BuyerDashboard /></ProtectedRoute>} />
                  <Route path="/supplier/*" element={<SupplierLayout />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <AssistantHost />
            </div>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
