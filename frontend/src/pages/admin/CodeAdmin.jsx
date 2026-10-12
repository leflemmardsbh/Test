import { useState } from "react";
import { Key, Copy, Check } from "lucide-react";
import api, { authHeaders, errorText } from "@/lib/api";
import { Notice } from "@/pages/Admin";

export default function CodeAdmin() {
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function save(e) {
    e.preventDefault();
    setNotice(""); setError("");
    try {
      await api.put("/admin/code", { code: code.trim() }, { headers: authHeaders() });
      setNotice("Code mis à jour. Utilisez-le à votre prochaine connexion.");
      setCode("");
    } catch (err) { setError(errorText(err)); }
  }

  function copyNew() {
    if (!code.trim()) return;
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="admin-panel" data-testid="admin-code-panel">
      <div className="admin-panel-head">
        <h2>Code d’accès admin</h2>
      </div>

      <Notice type="success" testid="code-success">{notice}</Notice>
      <Notice type="error" testid="code-error">{error}</Notice>

      <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
        Ce code remplace l’actuel pour toute nouvelle connexion. Choisissez quelque chose de simple à retenir mais difficile à deviner.
      </p>

      <form onSubmit={save} style={{ maxWidth: 440 }}>
        <div className="form-field">
          <label htmlFor="new-code">Nouveau code</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="new-code"
              data-testid="new-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex. MEDGL-2026"
              minLength={4}
              maxLength={64}
              required
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-ghost" onClick={copyNew} disabled={!code.trim()} data-testid="copy-code">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <span className="hint">4 à 64 caractères. Majuscules, chiffres et tirets recommandés.</span>
        </div>

        <button type="submit" className="btn btn-primary" data-testid="save-code">
          <Key size={14} /> Mettre à jour le code
        </button>
      </form>
    </section>
  );
}
