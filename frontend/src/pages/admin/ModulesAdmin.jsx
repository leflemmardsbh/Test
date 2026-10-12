import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import api, { authHeaders, errorText } from "@/lib/api";
import { getIcon, ICON_OPTIONS, COLOR_OPTIONS } from "@/lib/icons";
import { Notice } from "@/pages/Admin";

const BLANK = { title: "", description: "", color: "teal", icon: "stethoscope", order: 0 };

export default function ModulesAdmin({ modules, reload }) {
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function openNew() {
    setEdit("new");
    setForm({ ...BLANK, order: modules.length });
    setError(""); setNotice("");
  }
  function openEdit(m) {
    setEdit(m.id);
    setForm({ title: m.title, description: m.description || "", color: m.color || "teal", icon: m.icon || "stethoscope", order: m.order ?? 0 });
    setError(""); setNotice("");
  }
  function close() { setEdit(null); setForm(BLANK); setError(""); }

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (edit === "new") await api.post("/admin/modules", form, { headers: authHeaders() });
      else await api.put(`/admin/modules/${edit}`, form, { headers: authHeaders() });
      await reload();
      setNotice("Module enregistré");
      close();
    } catch (err) { setError(errorText(err)); }
  }

  async function remove(m) {
    if (!window.confirm(`Supprimer le module "${m.title}" et tout son contenu ?`)) return;
    await api.delete(`/admin/modules/${m.id}`, { headers: authHeaders() });
    await reload();
    setNotice("Module supprimé");
  }

  async function move(idx, dir) {
    const ids = modules.map((m) => m.id);
    const target = idx + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    await api.put("/admin/modules/reorder", { ids }, { headers: authHeaders() });
    await reload();
  }

  return (
    <section className="admin-panel" data-testid="admin-modules-panel">
      <div className="admin-panel-head">
        <h2>Modules médicaux</h2>
        <button className="btn btn-primary" onClick={openNew} data-testid="admin-new-module">
          <Plus size={16} /> Nouveau module
        </button>
      </div>

      <Notice type="success" testid="modules-notice">{notice}</Notice>

      {modules.length === 0 ? (
        <p className="muted" data-testid="modules-empty-admin">Aucun module. Créez-en un pour commencer.</p>
      ) : (
        <div className="admin-table">
          {modules.map((m, idx) => {
            const Icon = getIcon(m.icon);
            return (
              <div key={m.id} className="admin-row" data-testid={`admin-module-${m.id}`}>
                <span className={`m-icon ${m.color}`} style={{ width: 40, height: 40 }}><Icon size={18} /></span>
                <div className="admin-row-main">
                  <strong>{m.title}</strong>
                  <small>{m.courses_count} cours · {m.sheets_count} fiches · {m.quizzes_count} QCM</small>
                </div>
                <span className="order-badge">#{String(idx + 1).padStart(2, "0")}</span>
                <div className="admin-row-actions">
                  <button className="icon-btn" onClick={() => move(idx, -1)} disabled={idx === 0} data-testid={`move-up-${m.id}`}><ArrowUp size={14} /></button>
                  <button className="icon-btn" onClick={() => move(idx, 1)} disabled={idx === modules.length - 1} data-testid={`move-down-${m.id}`}><ArrowDown size={14} /></button>
                  <button className="icon-btn" onClick={() => openEdit(m)} data-testid={`edit-module-${m.id}`}><Pencil size={14} /></button>
                  <button className="icon-btn danger" onClick={() => remove(m)} data-testid={`delete-module-${m.id}`}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit && (
        <div className="modal-overlay" onClick={close} data-testid="module-modal">
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="modal-head">
              <h3>{edit === "new" ? "Nouveau module" : "Modifier le module"}</h3>
              <button type="button" className="icon-btn" onClick={close}><X size={16} /></button>
            </div>

            <Notice type="error" testid="module-form-error">{error}</Notice>

            <div className="form-field">
              <label>Titre</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required data-testid="module-title-input" placeholder="Ex. Cardiologie" />
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="module-description-input" placeholder="Résumé du module (optionnel)" style={{ minHeight: 80 }} />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Icône</label>
                <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} data-testid="module-icon-select">
                  {ICON_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Couleur</label>
                <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} data-testid="module-color-select">
                  {COLOR_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" data-testid="save-module">
              Enregistrer
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
