import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ChevronLeft, RotateCcw, ArrowRight, Trophy, Printer, Repeat, BarChart3 } from "lucide-react";
import api from "@/lib/api";
import { getWrongQuestions, recordAttempt } from "@/lib/stats";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function QuizPlay() {
  const { id, itemId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const revision = params.get("mode") === "revision";
  const [quiz, setQuiz] = useState(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongTexts, setWrongTexts] = useState([]);
  const [correctTexts, setCorrectTexts] = useState([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    api.get(`/quizzes/${itemId}`).then((r) => setQuiz(r.data)).finally(() => setLoading(false));
  }, [itemId]);

  const questions = useMemo(() => {
    const all = quiz?.questions || [];
    if (!revision) return all;
    const wrong = getWrongQuestions(itemId);
    return all.filter((q) => wrong.includes(q.question));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, revision, itemId, runKey]);

  function finish() {
    recordAttempt({ quiz, moduleId: id, score, total: questions.length, wrongTexts, correctTexts, mode: revision ? "revision" : "normal" });
    setDone(true);
  }

  function restart() {
    setIdx(0); setSelected(null); setChecked(false); setScore(0); setDone(false);
    setWrongTexts([]); setCorrectTexts([]); setRunKey((k) => k + 1);
  }

  function switchMode(toRevision) {
    navigate(`/modules/${id}/qcm/${itemId}${toRevision ? "?mode=revision" : ""}`);
    restart();
  }

  if (loading) return <main className="container"><p className="muted">Chargement...</p></main>;
  if (!quiz) return <main className="container"><p className="muted">QCM introuvable.</p></main>;

  const Header = () => (
    <div className="quiz-topbar">
      <Link to={`/modules/${id}`} className="back-link" data-testid="quiz-back-link"><ChevronLeft size={16} /> Retour au module</Link>
      <div className="quiz-topbar-actions">
        {revision && <span className="mode-badge" data-testid="revision-mode-badge"><Repeat size={12} /> MODE RÉVISION</span>}
        <Link to={`/modules/${id}/qcm/${itemId}/print`} target="_blank" className="btn btn-ghost btn-sm" data-testid="quiz-print-link">
          <Printer size={14} /> Imprimer / PDF
        </Link>
      </div>
    </div>
  );

  if (questions.length === 0) {
    return (
      <main className="container" data-testid="quiz-empty">
        <Header />
        <div className="empty-state">
          {revision ? (
            <>
              <h3>Aucune erreur à réviser</h3>
              <p>Vous avez corrigé toutes vos erreurs sur ce QCM. Bravo !</p>
              <button className="btn btn-primary" onClick={() => switchMode(false)} data-testid="quiz-play-normal">Rejouer le QCM complet <ArrowRight size={16} /></button>
            </>
          ) : (
            <>
              <h3>Ce QCM n’a pas encore de questions</h3>
              <p>Ajoutez-en depuis le panneau admin.</p>
            </>
          )}
        </div>
      </main>
    );
  }

  if (done) {
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const pendingWrong = getWrongQuestions(itemId).length;
    return (
      <main className="container" data-testid="quiz-result">
        <Header />
        <div className="quiz-result">
          <Trophy size={36} color="#2EA44F" />
          <p className="eyebrow" style={{ marginTop: 10 }}>{revision ? "RÉSULTAT RÉVISION" : "RÉSULTAT FINAL"}</p>
          <div className="quiz-result-score" data-testid="quiz-score-value">{pct}%</div>
          <h2>{score} / {total} bonnes réponses</h2>
          <p>{pct >= 70 ? "Excellent, vous maîtrisez ce chapitre." : pct >= 40 ? "Bon début, à retravailler." : "À revoir — reprenez les cours associés."}</p>
          <p className="muted" style={{ fontSize: 13, marginTop: -16 }} data-testid="quiz-saved-note">Score enregistré dans <Link to="/stats" style={{ color: "var(--primary)", fontWeight: 600 }}>Mes stats</Link>.</p>
          <div className="quiz-result-actions">
            {pendingWrong > 0 && (
              <button className="btn btn-accent" onClick={() => switchMode(true)} data-testid="quiz-revise-errors">
                <Repeat size={16} /> Réviser mes erreurs ({pendingWrong})
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => (revision ? switchMode(false) : restart())} data-testid="quiz-restart">
              <RotateCcw size={16} /> {revision ? "QCM complet" : "Recommencer"}
            </button>
            <Link to="/stats" className="btn btn-ghost" data-testid="quiz-go-stats"><BarChart3 size={16} /> Mes stats</Link>
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
    if (selected === q.correct_index) { setScore((s) => s + 1); setCorrectTexts((c) => [...c, q.question]); }
    else setWrongTexts((w) => [...w, q.question]);
  }

  function next() {
    if (idx + 1 >= questions.length) finish();
    else { setIdx(idx + 1); setSelected(null); setChecked(false); }
  }

  return (
    <main className="container" data-testid="quiz-play">
      <Header />
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
                <button key={i} className={cls} data-testid={`quiz-choice-${i}`} onClick={() => !checked && setSelected(i)} disabled={checked}>
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
              <button className="btn btn-primary" onClick={check} disabled={selected === null} data-testid="quiz-check">Valider</button>
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
