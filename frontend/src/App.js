import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import ModulesList from "@/pages/ModulesList";
import ModuleDetail from "@/pages/ModuleDetail";
import ContentView from "@/pages/ContentView";
import QuizPlay from "@/pages/QuizPlay";
import AdminLogin from "@/pages/AdminLogin";
import Admin from "@/pages/Admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/modules" element={<ModulesList />} />
          <Route path="/modules/:id" element={<ModuleDetail />} />
          <Route path="/modules/:id/cours/:itemId" element={<ContentView kind="course" />} />
          <Route path="/modules/:id/fiches/:itemId" element={<ContentView kind="sheet" />} />
          <Route path="/modules/:id/qcm/:itemId" element={<QuizPlay />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
