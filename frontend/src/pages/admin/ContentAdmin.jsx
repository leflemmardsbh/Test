import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import api, { authHeaders, errorText } from "@/lib/api";
import { Notice } from "@/pages/Admin";
import RichEditor from "@/components/RichEditor";
import AttachmentsField from "@/components/AttachmentsField";

function BLANK(moduleId) { return { module_id: moduleId || "", title: "", content: "", attachments: [], order: 0 }; }

export default function ContentAdmin({ modules, kind, label, singularLabel }) {
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
    const list = kind === "courses" ? r.data.courses : r.data.sheets;
    setItems(list);
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [moduleId]);

  function openNew() {
    setEdit("new");
    setForm({ ...BLANK(moduleId), order: items.length });
    setError(""); setNotice("");
  }
  async function openEdit(it) {
    setEdit(it.id);
    setError(""); setNotice("");
    const r = await api.get(`/${kind}/${it.id}`);
    setForm({ module_id: moduleId, title: r.data.title, content: r.data.content || "", attachments: r.data.attachments || [], order: r.data.order ?? 0 });
  }
  function close() { setEdit(null); setError(""); }

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (edit === "new") await api.post(`/admin/${kind}`, form, { headers: authHeaders() });
      else await api.put(`/admin/${kind}/${edit}`, form, { headers: authHeaders() });
      await reload();
      setNotice(`${singularLabel} enregistré${singularLabel.endsWith("e") ? "e" : ""}`);
      close();
    } catch (err) { setError(errorText(err)); }
  }

  async function remove(it) {
    if (!window.confirm(`Supprimer "${it.title}" ?`)) return;
    await api.delete(`/admin/${kind}/${it.id}`, { headers: authHeaders() });
    await reload();
    setNotice(`${singularLabel} supprimé${singularLabel.endsWith("e") ? "e" : ""}`);
  }

  if (modules.length === 0) {
    return (
      <section className="admin-panel" data-testid={`admin-${kind}-panel`}>
        <h2>{label}</h2>
        <p className="muted">Créez d’abord au moins un module dans l’onglet Modules.</p>
      </section>
    );
  }

  return (
    <section className="admin-panel" data-testid={`admin-${kind}-panel`}>
      <div className="admin-panel-head">
        <h2>{label}</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="admin-select" data-testid={`${kind}-module-filter`}>
            {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openNew} data-testid={`admin-new-${kind}`}>
            <Plus size={16} /> Nouveau
          </button>
        </div>
      </div>

      <Notice type="success" testid={`${kind}-notice`}>{notice}</Notice>

      {items.length === 0 ? (
        <p className="muted" data-testid={`${kind}-empty`}>Aucun contenu pour ce module.</p>
      ) : (
        <div className="admin-table">
          {items.map((it, idx) => (
            <div key={it.id} className="admin-row" data-testid={`admin-${kind}-${it.id}`}>
              <span className="item-row-num">{String(idx + 1).padStart(2, "0")}</span>
              <div className="admin-row-main">
                <strong>{it.title}</strong>
                <small>Ordre #{(it.order ?? 0) + 1}{it.attachments?.length > 0 && ` · ${it.attachments.length} PDF`}</small>
              </div>
              <div className="admin-row-actions">
                <button className="icon-btn" onClick={() => openEdit(it)} data-testid={`edit-${kind}-${it.id}`}><Pencil size={14} /></button>
                <button className="icon-btn danger" onClick={() => remove(it)} data-testid={`delete-${kind}-${it.id}`}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div className="modal-overlay" onClick={close}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="modal-head">
              <h3>{edit === "new" ? `Nouveau ${singularLabel.toLowerCase()}` : `Modifier ${singularLabel.toLowerCase()}`}</h3>
              <button type="button" className="icon-btn" onClick={close}><X size={16} /></button>
            </div>

            <Notice type="error" testid={`${kind}-form-error`}>{error}</Notice>

            <div className="form-field">
              <label>Titre</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required data-testid={`${kind}-title-input`} />
            </div>
            <div className="form-field">
              <label>Contenu</label>
              <RichEditor value={form.content} onChange={(html) => setForm((f) => ({ ...f, content: html }))} testid={`${kind}-content-editor`} />
              <span className="hint">Gras, italique, titres, listes et points clés : la mise en forme est conservée à l’affichage. Le texte est facultatif si vous joignez un PDF.</span>
            </div>
            <div className="form-field">
              <label>Fichiers PDF</label>
              <AttachmentsField value={form.attachments} onChange={(fn) => setForm((f) => ({ ...f, attachments: typeof fn === "function" ? fn(f.attachments) : fn }))} testid={`${kind}-attachments`} />
              <span className="hint">Lecteur intégré côté étudiant, avec téléchargement. Plusieurs PDF possibles.</span>
            </div>
            <div className="form-field">
              <label>Ordre</label>
              <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: +e.target.value })} data-testid={`${kind}-order-input`} />
            </div>

            <button type="submit" className="btn btn-primary btn-full" data-testid={`save-${kind}`}>
              Enregistrer
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
