import { NavLink, Outlet, Link } from "react-router-dom";
import { Stethoscope, Shield } from "lucide-react";
import "@/App.css";

export default function Layout() {
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
          </div>
          <Link to="/admin" className="admin-pill" data-testid="nav-admin">
            <Shield size={14} /> Admin
          </Link>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
