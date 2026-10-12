import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, BookOpen, FileText, ClipboardList, Grid3x3, Key } from "lucide-react";
import api, { authHeaders, setToken, errorText } from "@/lib/api";
import ModulesAdmin from "@/pages/admin/ModulesAdmin";
import CoursesAdmin from "@/pages/admin/CoursesAdmin";
import SheetsAdmin from "@/pages/admin/SheetsAdmin";
import QuizzesAdmin from "@/pages/admin/QuizzesAdmin";
import CodeAdmin from "@/pages/admin/CodeAdmin";

const SECTIONS = [
  { key: "modules", label: "Modules", Icon: Grid3x3 },
  { key: "courses", label: "Cours", Icon: BookOpen },
  { key: "sheets", label: "Fiches", Icon: FileText },
  { key: "quizzes", label: "QCM", Icon: ClipboardList },
  { key: "code", label: "Code admin", Icon: Key },
];

export default function Admin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState("modules");
  const [modules, setModules] = useState([]);

  useEffect(() => {
    api.get("/admin/me", { headers: authHeaders() })
      .then(() => setChecking(false))
      .catch(() => {
        setToken(null);
        navigate("/admin-login");
      });
  }, [navigate]);

  async function reloadModules() {
    const r = await api.get("/modules");
    setModules(r.data);
  }

  useEffect(() => { if (!checking) reloadModules(); }, [checking]);

  function logout() {
    setToken(null);
    navigate("/");
  }

  if (checking) return <main className="container"><p className="muted">Vérification...</p></main>;

  return (
    <main className="container" data-testid="admin-page">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <p className="eyebrow"><Shield size={11} style={{ display: "inline", verticalAlign: -1 }} /> ESPACE ADMINISTRATEUR</p>
          <h2 style={{ fontSize: 28 }}>Pilotage de la plateforme</h2>
          <p className="muted" style={{ marginTop: 6 }}>Créez modules, cours, fiches et QCM. Réordonnez et sécurisez l’accès.</p>
        </div>
        <button className="btn btn-ghost" onClick={logout} data-testid="admin-logout">
          <LogOut size={14} /> Déconnexion
        </button>
      </div>

      <div className="admin-layout">
        <aside className="admin-side" data-testid="admin-sidebar">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={section === s.key ? "active" : ""}
              onClick={() => setSection(s.key)}
              data-testid={`admin-section-${s.key}`}
            >
              <s.Icon size={16} /> {s.label}
            </button>
          ))}
        </aside>

        <div className="admin-main">
          {section === "modules" && <ModulesAdmin modules={modules} reload={reloadModules} />}
          {section === "courses" && <CoursesAdmin modules={modules} />}
          {section === "sheets" && <SheetsAdmin modules={modules} />}
          {section === "quizzes" && <QuizzesAdmin modules={modules} />}
          {section === "code" && <CodeAdmin />}
        </div>
      </div>
    </main>
  );
}

export function Notice({ type, children, testid }) {
  if (!children) return null;
  return <div className={type === "error" ? "error-msg" : "success-msg"} data-testid={testid}>{children}</div>;
}

export { errorText };
