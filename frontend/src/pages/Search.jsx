import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, BookOpen, FileText, ClipboardList, Layers } from "lucide-react";
import api from "@/lib/api";

const EMPTY = { modules: [], courses: [], sheets: [], quizzes: [] };

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [input, setInput] = useState(q);
  const [res, setRes] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(q);
    if (q.trim().length < 2) { setRes(EMPTY); return; }
    setLoading(true);
    api.get("/search", { params: { q } }).then((r) => setRes(r.data)).finally(() => setLoading(false));
  }, [q]);

  function submit(e) {
    e.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  }

  const total = res.modules.length + res.courses.length + res.sheets.length + res.quizzes.length;

  return (
    <main className="container" data-testid="search-page">
      <p className="eyebrow">RECHERCHE GLOBALE</p>
      <h2 style={{ fontSize: 32, marginBottom: 20 }}>Rechercher dans tout le contenu</h2>
      <form onSubmit={submit} className="search-form">
        <SearchIcon size={18} />
        <input
          autoFocus
          data-testid="search-page-input"
          placeholder="Un mot-clé, une pathologie, une molécule…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" data-testid="search-page-submit">Rechercher</button>
      </form>

      {q.trim().length < 2 ? (
        <p className="muted" data-testid="search-hint">Saisissez au moins 2 caractères pour lancer la recherche dans les cours, fiches et QCM.</p>
      ) : loading ? (
        <p className="muted">Recherche en cours...</p>
      ) : total === 0 ? (
        <div className="empty-state" data-testid="search-empty"><h3>Aucun résultat pour « {q} »</h3><p>Essayez un autre terme ou une orthographe différente.</p></div>
      ) : (
        <div data-testid="search-results">
          <p className="muted" style={{ marginBottom: 24 }} data-testid="search-count">{total} résultat{total > 1 ? "s" : ""} pour « {q} »</p>
          <Group title="Modules" Icon={Layers} items={res.modules} testid="modules" render={(m) => (
            <Link to={`/modules/${m.id}`} className="result-row" key={m.id} data-testid={`search-result-module-${m.id}`}>
              <strong>{m.title}</strong><small>{m.description}</small>
            </Link>
          )} />
          <Group title="Cours" Icon={BookOpen} items={res.courses} testid="courses" render={(c) => (
            <Link to={`/modules/${c.module_id}/cours/${c.id}`} className="result-row" key={c.id} data-testid={`search-result-course-${c.id}`}>
              <span className="result-module">{c.module_title}</span>
              <strong>{c.title}</strong><small><Highlight text={c.snippet} q={q} /></small>
            </Link>
          )} />
          <Group title="Fiches" Icon={FileText} items={res.sheets} testid="sheets" render={(s) => (
            <Link to={`/modules/${s.module_id}/fiches/${s.id}`} className="result-row" key={s.id} data-testid={`search-result-sheet-${s.id}`}>
              <span className="result-module">{s.module_title}</span>
              <strong>{s.title}</strong><small><Highlight text={s.snippet} q={q} /></small>
            </Link>
          )} />
          <Group title="QCM" Icon={ClipboardList} items={res.quizzes} testid="quizzes" render={(z) => (
            <Link to={`/modules/${z.module_id}/qcm/${z.id}`} className="result-row" key={z.id} data-testid={`search-result-quiz-${z.id}`}>
              <span className="result-module">{z.module_title} · {z.questions_count} questions{z.matched_questions ? ` · ${z.matched_questions} question(s) correspondante(s)` : ""}</span>
              <strong>{z.title}</strong><small><Highlight text={z.snippet} q={q} /></small>
            </Link>
          )} />
        </div>
      )}
    </main>
  );
}

function Group({ title, Icon, items, render, testid }) {
  if (items.length === 0) return null;
  return (
    <section className="result-group" data-testid={`search-group-${testid}`}>
      <h3><Icon size={16} /> {title} <span className="tab-count">{items.length}</span></h3>
      <div className="item-list">{items.map(render)}</div>
    </section>
  );
}

function Highlight({ text, q }) {
  if (!text) return null;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) => (p.toLowerCase() === q.toLowerCase() ? <mark key={i}>{p}</mark> : p));
}
