import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { ModuleCard } from "./Home";

export default function ModulesList() {
  const [modules, setModules] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/modules").then((r) => setModules(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = modules.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase()) ||
    (m.description || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="container" data-testid="modules-list-page">
      <div className="section-head" style={{ marginBottom: 28 }}>
        <div>
          <p className="eyebrow">BIBLIOTHÈQUE COMPLÈTE</p>
          <h2 style={{ fontSize: 32 }}>Tous les modules</h2>
          <p className="muted" style={{ marginTop: 8 }}>Parcourez l’ensemble des spécialités disponibles.</p>
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: 420, marginBottom: 28 }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
        <input
          data-testid="modules-search-input"
          placeholder="Rechercher un module..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", padding: "11px 14px 11px 40px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "var(--surface)", color: "var(--ink)" }}
        />
      </div>

      {loading ? (
        <p className="muted">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="muted" data-testid="modules-empty">
          {modules.length === 0 ? "Aucun module n’a encore été créé." : "Aucun module ne correspond à votre recherche."}
        </p>
      ) : (
        <div className="grid-cards" data-testid="modules-grid">
          {filtered.map((m) => <ModuleCard key={m.id} m={m} />)}
        </div>
      )}
    </main>
  );
}
