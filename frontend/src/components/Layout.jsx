import { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Stethoscope, Shield, Search, BarChart3 } from "lucide-react";
import "@/App.css";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!location.pathname.startsWith("/recherche")) setQ("");
  }, [location.pathname]);

  function submit(e) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    navigate(`/recherche?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="shell" data-testid="app-shell">
      <nav className="shell-nav">
        <div className="nav-inner">
          <Link to="/" className="brand" data-testid="brand-home-link">
            <span className="brand-mark"><Stethoscope size={20} /></span>
            <b>med<span>gl</span></b>
          </Link>
          <div className="nav-links">
            <NavLink to="/" end data-testid="nav-home">Accueil</NavLink>
            <NavLink to="/modules" data-testid="nav-modules">Modules</NavLink>
            <NavLink to="/stats" data-testid="nav-stats"><BarChart3 size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Mes stats</NavLink>
          </div>
          <form className="nav-search" onSubmit={submit} role="search">
            <Search size={15} />
            <input
              data-testid="nav-search-input"
              placeholder="Rechercher cours, fiches, QCM…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <Link to="/admin" className="admin-pill" data-testid="nav-admin">
            <Shield size={14} /> Admin
          </Link>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
