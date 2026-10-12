import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, RotateCcw, ArrowRight, Trophy } from "lucide-react";
import api from "@/lib/api";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function QuizPlay() {
  const { id, itemId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/quizzes/${itemId}`).then((r) => setQuiz(r.data)).finally(() => setLoading(false));
  }, [itemId]);

  function restart() {
    setIdx(0); setSelected(null); setChecked(false); setScore(0); setDone(false);
  }

  if (loading) return <main className="container"><p className="muted">Chargement...</p></main>;
  if (!quiz) return <main className="container"><p className="muted">QCM introuvable.</p></main>;

  const questions = quiz.questions || [];
  if (questions.length === 0) {
    return (
      <main className="container" data-testid="quiz-empty">
        <Link to={`/modules/${id}`} className="back-link"><ChevronLeft size={16} /> Retour au module</Link>
        <div className="empty-state">
          <h3>Ce QCM n’a pas encore de questions</h3>
          <p>Ajoutez-en depuis le panneau admin.</p>
        </div>
      </main>
    );
  }

  if (done) {
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    return (
      <main className="container" data-testid="quiz-result">
        <Link to={`/modules/${id}`} className="back-link"><ChevronLeft size={16} /> Retour au module</Link>
        <div className="quiz-result">
          <Trophy size={36} color="#2EA44F" />
          <p className="eyebrow" style={{ marginTop: 10 }}>RÉSULTAT FINAL</p>
          <div className="quiz-result-score" data-testid="quiz-score-value">{pct}%</div>
          <h2>{score} / {total} bonnes réponses</h2>
          <p>{pct >= 70 ? "Excellent, vous maîtrisez ce chapitre." : pct >= 40 ? "Bon début, à retravailler." : "À revoir — reprenez les cours associés."}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="btn btn-ghost" onClick={restart} data-testid="quiz-restart"><RotateCcw size={16} /> Recommencer</button>
            <Link to={`/modules/${id}`} className="btn btn-primary" data-testid="quiz-back-module">Retour au module <ArrowRight size={16} /></Link>
          </div>
        </div>
      </main>
    );
  }

  const q = questions[idx];
  const isCorrect = checked && selected === q.correct_index;

  function check() {
    if (selected === null) return;
    setChecked(true);
    if (selected === q.correct_index) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 >= questions.length) setDone(true);
    else { setIdx(idx + 1); setSelected(null); setChecked(false); }
  }

  return (
    <main className="container" data-testid="quiz-play">
      <Link to={`/modules/${id}`} className="back-link" data-testid="quiz-back-link">
        <ChevronLeft size={16} /> Retour au module
      </Link>
      <div className="quiz-wrap">
        <div className="quiz-progress">
          <small data-testid="quiz-position">QUESTION {idx + 1} / {questions.length}</small>
          <small>{quiz.title}</small>
        </div>
        <div className="quiz-bar"><span style={{ width: `${((idx + 1) / questions.length) * 100}%` }} /></div>

        <div className="quiz-card">
          <h2 data-testid="quiz-question">{q.question}</h2>
          <div className="choice-list">
            {q.choices.map((c, i) => {
              let cls = "choice";
              if (checked) {
                if (i === q.correct_index) cls += " correct";
                else if (i === selected) cls += " wrong";
              } else if (i === selected) cls += " selected";
              return (
                <button
                  key={i}
                  className={cls}
                  data-testid={`quiz-choice-${i}`}
                  onClick={() => !checked && setSelected(i)}
                  disabled={checked}
                >
                  <span className="choice-letter">{LETTERS[i]}</span>
                  <span>{c}</span>
                </button>
              );
            })}
          </div>

          {checked && (
            <div className="quiz-feedback" data-testid="quiz-feedback">
              <strong>{isCorrect ? "Bonne réponse" : "Mauvaise réponse"}</strong>
              {q.explanation || (isCorrect ? "Bravo !" : `La bonne réponse était ${LETTERS[q.correct_index]}.`)}
            </div>
          )}

          <div className="quiz-actions">
            <small className="muted" style={{ alignSelf: "center" }}>Score : {score} / {questions.length}</small>
            {!checked ? (
              <button className="btn btn-primary" onClick={check} disabled={selected === null} data-testid="quiz-check">
                Valider
              </button>
            ) : (
              <button className="btn btn-primary" onClick={next} data-testid="quiz-next">
                {idx + 1 >= questions.length ? "Voir le résultat" : "Question suivante"} <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
