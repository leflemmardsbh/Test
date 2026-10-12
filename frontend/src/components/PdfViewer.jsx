import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { formatSize } from "@/components/AttachmentsField";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export default function PdfViewer({ a }) {
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(0);
  const [full, setFull] = useState(false);
  const [error, setError] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [full]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e) => {
      if (e.key === "Escape") setFull(false);
      if (e.key === "ArrowRight") setPage((p) => Math.min(pages, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [full, pages]);

  const prev = () => setPage((p) => Math.max(1, p - 1));
  const next = () => setPage((p) => Math.min(pages, p + 1));

  return (
    <div className={`pdf-card ${full ? "fullscreen" : ""}`} data-testid={`pdf-card-${a.id}`}>
      <div className="pdf-head">
        <FileText size={18} />
        <div className="pdf-head-main">
          <strong data-testid={`pdf-name-${a.id}`}>{a.name}</strong>
          <small>{formatSize(a.size)}{pages ? ` · ${pages} page${pages > 1 ? "s" : ""}` : ""}</small>
        </div>
        <div className="pdf-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setFull((f) => !f)} data-testid={`pdf-expand-${a.id}`}>
            {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {full ? "Quitter" : "Plein écran"}
          </button>
          <a href={fileUrl(a.id)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" data-testid={`pdf-open-${a.id}`}><ExternalLink size={14} /> Ouvrir</a>
          <a href={fileUrl(a.id, true)} className="btn btn-primary btn-sm" data-testid={`pdf-download-${a.id}`}><Download size={14} /> Télécharger</a>
        </div>
      </div>

      <div className="pdf-stage" ref={boxRef}>
        {error ? (
          <div className="pdf-fallback" data-testid={`pdf-error-${a.id}`}>
            <p>Aperçu indisponible dans ce navigateur.</p>
            <a href={fileUrl(a.id)} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Ouvrir le PDF</a>
          </div>
        ) : (
          <Document
            file={fileUrl(a.id)}
            onLoadSuccess={({ numPages }) => { setPages(numPages); setPage(1); }}
            onLoadError={() => setError(true)}
            loading={<div className="pdf-loading"><Loader2 size={22} className="spin" /> Chargement du PDF…</div>}
          >
            {width > 0 && <Page pageNumber={page} width={Math.min(width, full ? 1100 : width)} renderAnnotationLayer={false} />}
          </Document>
        )}
        {pages > 1 && (
          <>
            <button className="pdf-nav prev" onClick={prev} disabled={page <= 1} aria-label="Page précédente" data-testid={`pdf-prev-${a.id}`}><ChevronLeft size={22} /></button>
            <button className="pdf-nav next" onClick={next} disabled={page >= pages} aria-label="Page suivante" data-testid={`pdf-next-${a.id}`}><ChevronRight size={22} /></button>
          </>
        )}
      </div>

      {pages > 0 && (
        <div className="pdf-foot">
          <button className="btn btn-ghost btn-sm" onClick={prev} disabled={page <= 1} data-testid={`pdf-prev-btn-${a.id}`}><ChevronLeft size={14} /> Précédent</button>
          <span className="pdf-counter" data-testid={`pdf-counter-${a.id}`}>Page {page} / {pages}</span>
          <button className="btn btn-ghost btn-sm" onClick={next} disabled={page >= pages} data-testid={`pdf-next-btn-${a.id}`}>Suivant <ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}
