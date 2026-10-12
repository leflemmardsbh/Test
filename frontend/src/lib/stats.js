const KEY = "medgl_stats";

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { attempts: raw.attempts || [], wrong: raw.wrong || {} };
  } catch {
    return { attempts: [], wrong: {} };
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getStats() {
  return load();
}

export function getWrongQuestions(quizId) {
  return load().wrong[quizId]?.questions || [];
}

export function getQuizSummary(quizId) {
  const { attempts, wrong } = load();
  const mine = attempts.filter((a) => a.quiz_id === quizId);
  if (mine.length === 0) return null;
  const best = Math.max(...mine.map((a) => a.pct));
  const last = mine[mine.length - 1];
  return { attempts: mine.length, best, last, pending: wrong[quizId]?.questions?.length || 0 };
}

export function recordAttempt({ quiz, moduleId, score, total, wrongTexts, correctTexts, mode }) {
  const data = load();
  data.attempts.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    quiz_id: quiz.id,
    quiz_title: quiz.title,
    module_id: moduleId,
    score,
    total,
    pct: total ? Math.round((score / total) * 100) : 0,
    mode,
    date: new Date().toISOString(),
  });
  const prev = data.wrong[quiz.id]?.questions || [];
  const merged = Array.from(new Set([...prev.filter((t) => !correctTexts.includes(t)), ...wrongTexts]));
  if (merged.length) data.wrong[quiz.id] = { quiz_title: quiz.title, module_id: moduleId, questions: merged };
  else delete data.wrong[quiz.id];
  save(data);
}

export function clearStats() {
  localStorage.removeItem(KEY);
}
