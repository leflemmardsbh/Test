import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope, ArrowRight } from "lucide-react";
import api, { setToken, errorText } from "@/lib/api";

export default function AdminLogin() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api.post("/admin/verify", { code });
      setToken(r.data.token);
      navigate("/admin");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login" data-testid="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <span className="brand-mark"><Stethoscope size={24} /></span>
        <h1>Panneau administrateur</h1>
        <p>Saisissez le code d’accès pour gérer vos modules médicaux.</p>

        <div className="form-field">
          <label htmlFor="admin-code">Code d’accès</label>
          <input
            id="admin-code"
            data-testid="admin-code-input"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="MEDGL-2026"
            autoFocus
            required
          />
          <span className="hint">Code personnalisable depuis le panneau une fois connecté.</span>
        </div>

        {error && <div className="error-msg" data-testid="admin-login-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-full" disabled={loading} data-testid="admin-login-submit">
          {loading ? "Vérification..." : <>Entrer <ArrowRight size={16} /></>}
        </button>
      </form>
    </div>
  );
}
