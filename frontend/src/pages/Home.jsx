import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, FileText, ArrowRight, Compass, Target, Sparkles, Stethoscope } from "lucide-react";
import api from "@/lib/api";
import { getIcon } from "@/lib/icons";

export default function Home() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/modules").then((r) => setModules(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <main className="container" data-testid="home-page">
      <section className="hero">
        <div>
          <p className="eyebrow">PLATEFORME DE RÉVISION MÉDICALE</p>
          <h1>Vos révisions médicales,<br /><em>structurées comme en vol.</em></h1>
          <p>Inspiré d’Aérogligli pour le PPL, MedGL rassemble vos cours, fiches et QCM par spécialité. Simple, sobre, et prêt à être adapté à votre programme.</p>
          <Link to="/modules" className="btn btn-primary" data-testid="hero-explore-button">
            Explorer les modules <ArrowRight size={16} />
          </Link>
        </div>
        <aside className="hero-side">
          <div className="hero-side-row">
            <span className="hero-side-icon"><BookOpen size={20} /></span>
            <div className="hero-side-text"><strong>Cours structurés</strong><small>Chapitres par spécialité, lecture confortable.</small></div>
          </div>
          <div className="hero-side-row">
            <span className="hero-side-icon"><FileText size={20} /></span>
            <div className="hero-side-text"><strong>Fiches de révision</strong><small>Synthèses rapides, prêtes à l’oral ou l’examen.</small></div>
          </div>
          <div className="hero-side-row">
            <span className="hero-side-icon"><ClipboardList size={20} /></span>
            <div className="hero-side-text"><strong>QCM interactifs</strong><small>Entraînement avec correction immédiate.</small></div>
          </div>
        </aside>
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">BIBLIOTHÈQUE</p>
            <h2>Modules disponibles</h2>
          </div>
          <Link to="/modules" className="btn btn-ghost btn-sm" data-testid="see-all-modules">
            Tout voir <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <p className="muted" data-testid="home-loading">Chargement...</p>
        ) : modules.length === 0 ? (
          <EmptyModules />
        ) : (
          <div className="grid-cards" data-testid="home-modules-grid">
            {modules.slice(0, 6).map((m) => <ModuleCard key={m.id} m={m} />)}
          </div>
        )}
      </section>
    </main>
  );
}

export function ModuleCard({ m }) {
  const Icon = getIcon(m.icon);
  return (
    <Link to={`/modules/${m.id}`} className="module-card" data-testid={`module-card-${m.id}`}>
      <div className="module-card-top">
        <span className={`m-icon ${m.color}`}><Icon size={22} /></span>
        <span className="pill-badge">#{String((m.order ?? 0) + 1).padStart(2, "0")}</span>
      </div>
      <h3>{m.title}</h3>
      <p>{m.description || "Pas encore de description — à compléter depuis l’admin."}</p>
      <div className="module-meta">
        <span><BookOpen size={13} /><b>{m.courses_count}</b> cours</span>
        <span><FileText size={13} /><b>{m.sheets_count}</b> fiches</span>
        <span><ClipboardList size={13} /><b>{m.quizzes_count}</b> QCM</span>
      </div>
    </Link>
  );
}

function EmptyModules() {
  return (
    <div className="empty-state" data-testid="home-empty-state">
      <Compass size={32} color="#0D5C75" />
      <h3>Aucun module pour l’instant</h3>
      <p>Rendez-vous dans l’espace admin pour créer votre premier module de médecine (titre, icône, cours, fiches et QCM).</p>
      <Link to="/admin" className="btn btn-primary" data-testid="empty-go-admin">
        Ouvrir le panneau admin <ArrowRight size={16} />
      </Link>
    </div>
  );
}
