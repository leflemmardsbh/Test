import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { BookOpen, FileText, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { getIcon } from "@/lib/icons";
import { getQuizSummary } from "@/lib/stats";

function QuizMeta({ it }) {
  const s = getQuizSummary(it.id);
  return (
    <small data-testid={`quiz-meta-${it.id}`}>
      {it.questions_count ?? 0} questions
      {s && <> · <b className={`score-inline ${s.best >= 70 ? "good" : s.best >= 40 ? "mid" : "low"}`}>Meilleur {s.best}%</b></>}
      {s?.pending > 0 && <> · <span className="score-inline pending">{s.pending} à réviser</span></>}
    </small>
  );
}

const TABS = [
  { key: "cours", label: "Cours", Icon: BookOpen, source: "courses", kind: "courses" },
  { key: "fiches", label: "Fiches", Icon: FileText, source: "sheets", kind: "sheets" },
  { key: "qcm", label: "QCM", Icon: ClipboardList, source: "quizzes", kind: "quizzes" },
];

export default function ModuleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("cours");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/modules/${id}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="container"><p className="muted">Chargement...</p></main>;
  if (!data) return <main className="container"><p className="muted">Module introuvable.</p></main>;

  const Icon = getIcon(data.icon);
  const list = tab === "cours" ? data.courses : tab === "fiches" ? data.sheets : data.quizzes;

  function openItem(item) {
    if (tab === "cours") navigate(`/modules/${id}/cours/${item.id}`);
    else if (tab === "fiches") navigate(`/modules/${id}/fiches/${item.id}`);
    else navigate(`/modules/${id}/qcm/${item.id}`);
  }

  return (
    <main className="container" data-testid="module-detail-page">
      <Link to="/modules" className="back-link" data-testid="back-to-modules">
        <ChevronLeft size={16} /> Retour aux modules
      </Link>

      <section className="module-head">
        <span className={`m-icon ${data.color}`}><Icon size={28} /></span>
        <div>
          <p className="eyebrow">MODULE DE MÉDECINE</p>
          <h1>{data.title}</h1>
          <p>{data.description || "Pas de description."}</p>
        </div>
      </section>

      <div className="tabs" data-testid="module-tabs">
        {TABS.map((t) => {
          const count = (data[t.source] || []).length;
          return (
            <button
              key={t.key}
              data-testid={`tab-${t.key}`}
              className={`tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.Icon size={16} /> {t.label} <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="empty-state" data-testid={`empty-${tab}`}>
          <h3>Aucun contenu pour l’instant</h3>
          <p>Cette section sera remplie depuis le panneau admin.</p>
        </div>
      ) : (
        <div className="item-list" data-testid={`items-${tab}`}>
          {list.map((it, idx) => (
            <div
              key={it.id}
              className="item-row"
              data-testid={`item-${tab}-${it.id}`}
              onClick={() => openItem(it)}
            >
              <div className="item-row-left">
                <span className="item-row-num">{String(idx + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{it.title}</strong>
                  {tab === "qcm" && <QuizMeta it={it} />}
                  {tab !== "qcm" && it.order !== undefined && <small>Ordre #{it.order + 1}</small>}
                </div>
              </div>
              <ChevronRight size={18} color="var(--muted)" />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
