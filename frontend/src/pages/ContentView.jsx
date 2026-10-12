import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import api from "@/lib/api";
import { toSafeHtml } from "@/lib/html";
import PdfViewer from "@/components/PdfViewer";

export default function ContentView({ kind }) {
  const { id, itemId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = kind === "course" ? `/courses/${itemId}` : `/sheets/${itemId}`;
    api.get(url).then((r) => setItem(r.data)).finally(() => setLoading(false));
  }, [itemId, kind]);

  if (loading) return <main className="container"><p className="muted">Chargement...</p></main>;
  if (!item) return <main className="container"><p className="muted">Contenu introuvable.</p></main>;

  const attachments = item.attachments || [];
  const hasText = Boolean(item.content && item.content.trim());

  return (
    <main className="container" data-testid={`content-view-${kind}`}>
      <Link to={`/modules/${id}`} className="back-link" data-testid="back-to-module">
        <ChevronLeft size={16} /> Retour au module
      </Link>
      <article className="content-view">
        <p className="eyebrow">{kind === "course" ? "COURS" : "FICHE DE RÉVISION"}</p>
        <h1>{item.title}</h1>
        {(hasText || attachments.length === 0) && (
          <div className="content-body rich-content" data-testid="content-body" dangerouslySetInnerHTML={{ __html: toSafeHtml(item.content) }} />
        )}
        {attachments.length > 0 && (
          <section className="pdf-section" data-testid="pdf-section">
            {hasText && <p className="eyebrow" style={{ marginTop: 32 }}>DOCUMENTS PDF</p>}
            {attachments.map((a) => <PdfViewer key={a.id} a={a} />)}
          </section>
        )}
      </article>
    </main>
  );
}
