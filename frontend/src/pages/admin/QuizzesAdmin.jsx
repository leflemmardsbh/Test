import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Trash, Plus as PlusIcon } from "lucide-react";
import api, { authHeaders, errorText } from "@/lib/api";
import { Notice } from "@/pages/Admin";

const BLANK_QUESTION = { question: "", choices: ["", ""], correct_index: 0, explanation: "" };
function BLANK(moduleId) { return { module_id: moduleId || "", title: "", description: "", questions: [], order: 0 }; }

export default function QuizzesAdmin({ modules }) {
  const [moduleId, setModuleId] = useState("");
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(BLANK());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (modules.length > 0 && !moduleId) setModuleId(modules[0].id);
  }, [modules, moduleId]);

  async function reload() {
    if (!moduleId) { setItems([]); return; }
    const r = await api.get(`/modules/${moduleId}`);
    setItems(r.data.quizzes);
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [moduleId]);

  function openNew() {
    setEdit("new");
    setForm({ ...BLANK(moduleId), order: items.length });
    setError(""); setNotice("");
  }
  async function openEdit(q) {
    setEdit(q.id);
    setError(""); setNotice("");
    const r = await api.get(`/quizzes/${q.id}`);
    setForm({ module_id: moduleId, title: r.data.title, description: r.data.description || "", questions: r.data.questions || [], order: r.data.order ?? 0 });
  }
  function close() { setEdit(null); setError(""); }

  function updateQ(idx, patch) {
    const copy = [...form.questions];
    copy[idx] = { ...copy[idx], ...patch };
    setForm({ ...form, questions: copy });
  }
  function updateChoice(qi, ci, value) {
    const copy = [...form.questions];
    const choices = [...copy[qi].choices];
    choices[ci] = value;
    copy[qi] = { ...copy[qi], choices };
    setForm({ ...form, questions: copy });
  }
  function addQuestion() {
    setForm({ ...form, questions: [...form.questions, { ...BLANK_QUESTION, choices: ["", ""] }] });
  }
  function removeQuestion(idx) {
    setForm({ ...form, questions: form.questions.filter((_, i) => i !== idx) });
  }
  function addChoice(qi) {
    const copy = [...form.questions];
    if (copy[qi].choices.length >= 6) return;
    copy[qi] = { ...copy[qi], choices: [...copy[qi].choices, ""] };
    setForm({ ...form, questions: copy });
  }
  function removeChoice(qi, ci) {
    const copy = [...form.questions];
    if (copy[qi].choices.length <= 2) return;
    const choices = copy[qi].choices.filter((_, i) => i !== ci);
    let correct = copy[qi].correct_index;
    if (correct >= choices.length) correct = 0;
    else if (ci < correct) correct -= 1;
    copy[qi] = { ...copy[qi], choices, correct_index: correct };
    setForm({ ...form, questions: copy });
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    for (const q of form.questions) {
      if (!q.question.trim()) { setError("Chaque question doit avoir un énoncé."); return; }
      if (q.choices.some((c) => !c.trim())) { setError("Chaque choix doit être rempli."); return; }
    }
    try {
      if (edit === "new") await api.post("/admin/quizzes", form, { headers: authHeaders() });
      else await api.put(`/admin/quizzes/${edit}`, form, { headers: authHeaders() });
      await reload();
      setNotice("QCM enregistré");
      close();
    } catch (err) { setError(errorText(err)); }
  }

  async function remove(it) {
    if (!window.confirm(`Supprimer le QCM "${it.title}" ?`)) return;
    await api.delete(`/admin/quizzes/${it.id}`, { headers: authHeaders() });
    await reload();
    setNotice("QCM supprimé");
  }

  if (modules.length === 0) {
    return (
      <section className="admin-panel" data-testid="admin-quizzes-panel">
        <h2>QCM</h2>
        <p className="muted">Créez d’abord au moins un module.</p>
      </section>
    );
  }

  return (
    <section className="admin-panel" data-testid="admin-quizzes-panel">
      <div className="admin-panel-head">
        <h2>QCM par module</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} style={{ padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff" }} data-testid="quizzes-module-filter">
            {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openNew} data-testid="admin-new-quiz">
            <Plus size={16} /> Nouveau QCM
          </button>
        </div>
      </div>

      <Notice type="success" testid="quizzes-notice">{notice}</Notice>

      {items.length === 0 ? (
        <p className="muted" data-testid="quizzes-empty">Aucun QCM pour ce module.</p>
      ) : (
        <div className="admin-table">
          {items.map((it, idx) => (
            <div key={it.id} className="admin-row" data-testid={`admin-quiz-${it.id}`}>
              <span className="item-row-num">{String(idx + 1).padStart(2, "0")}</span>
              <div className="admin-row-main">
                <strong>{it.title}</strong>
                <small>{it.questions_count ?? 0} questions</small>
              </div>
              <div className="admin-row-actions">
                <button className="icon-btn" onClick={() => openEdit(it)} data-testid={`edit-quiz-${it.id}`}><Pencil size={14} /></button>
                <button className="icon-btn danger" onClick={() => remove(it)} data-testid={`delete-quiz-${it.id}`}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div className="modal-overlay" onClick={close}>
          <form className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="modal-head">
              <h3>{edit === "new" ? "Nouveau QCM" : "Modifier le QCM"}</h3>
              <button type="button" className="icon-btn" onClick={close}><X size={16} /></button>
            </div>

            <Notice type="error" testid="quiz-form-error">{error}</Notice>

            <div className="form-field">
              <label>Titre du QCM</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required data-testid="quiz-title-input" placeholder="Ex. ECG — rythmes" />
            </div>
            <div className="form-field">
              <label>Description (optionnelle)</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="quiz-desc-input" />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 10px" }}>
              <strong style={{ fontSize: 14 }}>Questions ({form.questions.length})</strong>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addQuestion} data-testid="quiz-add-question">
                <PlusIcon size={14} /> Ajouter une question
              </button>
            </div>

            {form.questions.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Aucune question. Cliquez sur "Ajouter une question" pour commencer.</p>}

            {form.questions.map((q, qi) => (
              <div key={qi} className="question-block" data-testid={`question-block-${qi}`}>
                <div className="question-head">
                  <small>QUESTION {qi + 1}</small>
                  <button type="button" className="icon-btn danger" onClick={() => removeQuestion(qi)} data-testid={`remove-question-${qi}`}><Trash size={13} /></button>
                </div>
                <div className="form-field" style={{ marginBottom: 10 }}>
                  <input value={q.question} onChange={(e) => updateQ(qi, { question: e.target.value })} required data-testid={`question-text-${qi}`} placeholder="Énoncé de la question" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {q.choices.map((c, ci) => (
                    <div key={ci} className="choice-input-row">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correct_index === ci}
                        onChange={() => updateQ(qi, { correct_index: ci })}
                        data-testid={`correct-${qi}-${ci}`}
                      />
                      <input
                        type="text"
                        value={c}
                        onChange={(e) => updateChoice(qi, ci, e.target.value)}
                        placeholder={`Choix ${String.fromCharCode(65 + ci)}`}
                        required
                        data-testid={`choice-${qi}-${ci}`}
                      />
                      <button type="button" className="icon-btn danger" onClick={() => removeChoice(qi, ci)} disabled={q.choices.length <= 2} data-testid={`remove-choice-${qi}-${ci}`}><X size={12} /></button>
                    </div>
                  ))}
                  {q.choices.length < 6 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => addChoice(qi)} style={{ marginTop: 6 }} data-testid={`add-choice-${qi}`}>
                      <PlusIcon size={12} /> Ajouter un choix
                    </button>
                  )}
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>Explication (optionnelle)</label>
                  <input value={q.explanation} onChange={(e) => updateQ(qi, { explanation: e.target.value })} data-testid={`explanation-${qi}`} placeholder="Correction / rappel pédagogique" />
                </div>
              </div>
            ))}

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 16 }} data-testid="save-quiz">
              Enregistrer le QCM
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
