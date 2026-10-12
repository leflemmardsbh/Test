import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import api from "@/lib/api";

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

  return (
    <main className="container" data-testid={`content-view-${kind}`}>
      <Link to={`/modules/${id}`} className="back-link" data-testid="back-to-module">
        <ChevronLeft size={16} /> Retour au module
      </Link>
      <article className="content-view">
        <p className="eyebrow">{kind === "course" ? "COURS" : "FICHE DE RÉVISION"}</p>
        <h1>{item.title}</h1>
        <div className="content-body" data-testid="content-body">{item.content}</div>
      </article>
    </main>
  );
}
