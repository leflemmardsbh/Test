import { useRef, useState } from "react";
import { FileText, Upload, Trash2, ExternalLink } from "lucide-react";
import { uploadPdf, fileUrl, errorText } from "@/lib/api";

export function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function AttachmentsField({ value, onChange, testid = "attachments" }) {
  const inputRef = useRef(null);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");

  async function handleFiles(files) {
    setError("");
    const list = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (list.length !== files.length) setError("Seuls les fichiers PDF sont acceptés.");
    for (const file of list) {
      const key = `${file.name}-${Date.now()}`;
      setUploads((u) => [...u, { key, name: file.name, pct: 0 }]);
      try {
        const att = await uploadPdf(file, (pct) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, pct } : x))));
        onChange((prev) => [...prev, att]);
      } catch (e) {
        setError(errorText(e));
      } finally {
        setUploads((u) => u.filter((x) => x.key !== key));
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="attachments" data-testid={testid}>
      {value.map((a) => (
        <div className="attachment-row" key={a.id} data-testid={`${testid}-item-${a.id}`}>
          <FileText size={18} />
          <div className="attachment-main">
            <strong>{a.name}</strong>
            <small>{formatSize(a.size)}</small>
          </div>
          <a href={fileUrl(a.id)} target="_blank" rel="noreferrer" className="icon-btn" title="Ouvrir"><ExternalLink size={14} /></a>
          <button type="button" className="icon-btn danger" title="Retirer" onClick={() => onChange((prev) => prev.filter((x) => x.id !== a.id))} data-testid={`${testid}-remove-${a.id}`}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {uploads.map((u) => (
        <div className="attachment-row uploading" key={u.key} data-testid={`${testid}-uploading`}>
          <Upload size={18} />
          <div className="attachment-main">
            <strong>{u.name}</strong>
            <div className="upload-bar"><span style={{ width: `${u.pct}%` }} /></div>
          </div>
          <small>{u.pct}%</small>
        </div>
      ))}
      <label className="attachment-drop" data-testid={`${testid}-drop`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
        <Upload size={18} />
        <span>Glissez un PDF ici ou <u>parcourir</u></span>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => handleFiles(e.target.files)} data-testid={`${testid}-input`} />
      </label>
      {error && <div className="error-msg" data-testid={`${testid}-error`}>{error}</div>}
    </div>
  );
}
