import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Customers from "@/pages/Customers";
import Orders from "@/pages/Orders";
import Categories from "@/pages/Categories";
import Suppliers from "@/pages/Suppliers";
import Inventory from "@/pages/Inventory";
import Reports from "@/pages/Reports";
import AuditTrail from "@/pages/AuditTrail";
import Profile from "@/pages/Profile";
import "@/App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="/audit"
              element={<ProtectedRoute roles={["admin", "manager"]}><AuditTrail /></ProtectedRoute>}
            />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster richColors position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
