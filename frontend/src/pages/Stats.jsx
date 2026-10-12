import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Trophy, Repeat, Trash2, ClipboardList, Target, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { getStats, clearStats } from "@/lib/stats";

export default function Stats() {
  const [data, setData] = useState(getStats());
  const [modules, setModules] = useState([]);

  useEffect(() => {
    api.get("/modules").then((r) => setModules(r.data)).catch(() => {});
  }, []);

  const modTitle = (mid) => modules.find((m) => m.id === mid)?.title || "Module";

  const perQuiz = useMemo(() => {
    const map = {};
    data.attempts.forEach((a) => {
      const e = map[a.quiz_id] || { quiz_id: a.quiz_id, quiz_title: a.quiz_title, module_id: a.module_id, attempts: 0, best: 0, last: null };
      e.attempts += 1;
      e.best = Math.max(e.best, a.pct);
      e.last = a;
      map[a.quiz_id] = e;
    });
    return Object.values(map).map((e) => ({ ...e, pending: data.wrong[e.quiz_id]?.questions?.length || 0 }));
  }, [data]);

  const totalAttempts = data.attempts.length;
  const avg = totalAttempts ? Math.round(data.attempts.reduce((s, a) => s + a.pct, 0) / totalAttempts) : 0;
  const totalPending = Object.values(data.wrong).reduce((s, w) => s + w.questions.length, 0);
  const history = [...data.attempts].reverse().slice(0, 30);

  function reset() {
    if (!window.confirm("Effacer tout l’historique de scores sur cet appareil ?")) return;
    clearStats();
    setData(getStats());
  }

  return (
    <main className="container" data-testid="stats-page">
      <div className="section-head" style={{ marginBottom: 28 }}>
        <div>
          <p className="eyebrow">PROGRESSION LOCALE</p>
          <h2 style={{ fontSize: 32 }}>Mes stats</h2>
          <p className="muted" style={{ marginTop: 8 }}>Vos scores sont mémorisés sur cet appareil, sans compte.</p>
        </div>
        {totalAttempts > 0 && (
          <button className="btn btn-danger btn-sm" onClick={reset} data-testid="stats-clear-button"><Trash2 size={14} /> Effacer</button>
        )}
      </div>

      {totalAttempts === 0 ? (
        <div className="empty-state" data-testid="stats-empty">
          <BarChart3 size={32} color="#0D5C75" />
          <h3>Aucun QCM joué pour l’instant</h3>
          <p>Terminez un QCM pour voir apparaître ici votre score, votre historique et vos questions à réviser.</p>
          <Link to="/modules" className="btn btn-primary" data-testid="stats-go-modules">Choisir un module <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <>
          <div className="stat-grid" data-testid="stats-summary">
            <div className="stat-card"><ClipboardList size={18} /><b data-testid="stats-total-attempts">{totalAttempts}</b><small>QCM terminés</small></div>
            <div className="stat-card"><Trophy size={18} /><b data-testid="stats-average">{avg}%</b><small>Score moyen</small></div>
            <div className="stat-card"><Target size={18} /><b data-testid="stats-quizzes-count">{perQuiz.length}</b><small>QCM distincts</small></div>
            <div className="stat-card accent"><Repeat size={18} /><b data-testid="stats-pending-errors">{totalPending}</b><small>Questions à réviser</small></div>
          </div>

          <section style={{ marginBottom: 40 }}>
            <div className="section-head"><div><p className="eyebrow">PAR QCM</p><h2>Vos meilleurs scores</h2></div></div>
            <div className="item-list" data-testid="stats-per-quiz">
              {perQuiz.map((e) => (
                <div className="item-row stat-row" key={e.quiz_id} data-testid={`stats-quiz-${e.quiz_id}`}>
                  <div className="item-row-left">
                    <span className={`score-chip ${e.best >= 70 ? "good" : e.best >= 40 ? "mid" : "low"}`}>{e.best}%</span>
                    <div>
                      <strong>{e.quiz_title}</strong>
                      <small>{modTitle(e.module_id)} · {e.attempts} tentative{e.attempts > 1 ? "s" : ""} · dernier {e.last.pct}%</small>
                    </div>
                  </div>
                  <div className="stat-row-actions">
                    {e.pending > 0 && (
                      <Link to={`/modules/${e.module_id}/qcm/${e.quiz_id}?mode=revision`} className="btn btn-accent btn-sm" data-testid={`stats-revise-${e.quiz_id}`}>
                        <Repeat size={14} /> Réviser ({e.pending})
                      </Link>
                    )}
                    <Link to={`/modules/${e.module_id}/qcm/${e.quiz_id}`} className="btn btn-ghost btn-sm" data-testid={`stats-replay-${e.quiz_id}`}>Rejouer</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="section-head"><div><p className="eyebrow">HISTORIQUE</p><h2>Dernières tentatives</h2></div></div>
            <div className="history-table" data-testid="stats-history">
              {history.map((a) => (
                <div className="history-row" key={a.id}>
                  <span className="history-date">{new Date(a.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span className="history-title">{a.quiz_title}{a.mode === "revision" && <em> · révision</em>}</span>
                  <span className="history-score">{a.score}/{a.total}</span>
                  <span className={`score-chip ${a.pct >= 70 ? "good" : a.pct >= 40 ? "mid" : "low"}`}>{a.pct}%</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
