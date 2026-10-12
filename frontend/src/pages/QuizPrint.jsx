import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ChevronLeft } from "lucide-react";
import api from "@/lib/api";
import "@/App.css";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function QuizPrint() {
  const { id, itemId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [module, setModule] = useState(null);

  useEffect(() => {
    api.get(`/quizzes/${itemId}`).then((r) => setQuiz(r.data));
    api.get(`/modules/${id}`).then((r) => setModule(r.data)).catch(() => {});
  }, [id, itemId]);

  if (!quiz) return <div className="print-page"><p className="muted">Chargement...</p></div>;
  const questions = quiz.questions || [];
  const today = new Date().toLocaleDateString("fr-FR");

  return (
    <div className="print-page" data-testid="quiz-print-page">
      <div className="print-toolbar no-print">
        <Link to={`/modules/${id}/qcm/${itemId}`} className="back-link" style={{ margin: 0 }} data-testid="print-back-link"><ChevronLeft size={16} /> Retour au QCM</Link>
        <button className="btn btn-primary" onClick={() => window.print()} data-testid="print-trigger-button"><Printer size={16} /> Imprimer / Enregistrer en PDF</button>
      </div>

      <header className="print-head">
        <p className="eyebrow">MEDGL · {module?.title?.toUpperCase() || "QCM"}</p>
        <h1 data-testid="print-quiz-title">{quiz.title}</h1>
        {quiz.description && <p className="muted">{quiz.description}</p>}
        <div className="print-meta">
          <span>{questions.length} questions</span>
          <span>Imprimé le {today}</span>
          <span>Nom : ______________________</span>
          <span>Score : ______ / {questions.length}</span>
        </div>
      </header>

      <section className="print-questions" data-testid="print-questions">
        {questions.map((q, i) => (
          <div className="print-q" key={i}>
            <p className="print-q-title"><b>{i + 1}.</b> {q.question}</p>
            <ul>
              {q.choices.map((c, j) => (
                <li key={j}><span className="print-box" /> <b>{LETTERS[j]}.</b> {c}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="print-answers" data-testid="print-answers">
        <p className="eyebrow">CORRIGÉ</p>
        <h2>Réponses et explications</h2>
        <div className="print-answer-grid">
          {questions.map((q, i) => (
            <div className="print-answer" key={i}>
              <b>{i + 1}. Réponse {LETTERS[q.correct_index]}</b> — {q.choices[q.correct_index]}
              {q.explanation && <p>{q.explanation}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
