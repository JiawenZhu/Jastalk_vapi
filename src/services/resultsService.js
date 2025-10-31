// Utilities to aggregate interview results across the app

const MOCK_DB_KEY = 'mock_interview_history';
const JOB_DB_KEY = 'job_history_db';

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('Failed to read key', key, e);
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to write key', key, e);
  }
};

export const saveMockInterview = ({ title, category, questions, answers, durationMinutes }) => {
  const list = readJson(MOCK_DB_KEY, []);
  list.push({
    id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    category: category || 'Mock',
    questions: questions || [],
    answers: answers || [],
    durationMinutes: durationMinutes || null,
    timestamp: Date.now(),
  });
  writeJson(MOCK_DB_KEY, list);
  return list[list.length - 1];
};

export const getMockInterviews = () => readJson(MOCK_DB_KEY, []);

// Collect all analyses saved under job history (custom interviews)
export const getCustomAnalyses = () => {
  const jobDb = readJson(JOB_DB_KEY, {});
  const list = [];
  Object.values(jobDb).forEach((entry) => {
    (entry.interviewHistory || []).forEach((a) => list.push({ ...a, job: entry.job }));
  });
  return list;
};

export const getResultsSummary = () => {
  const mocks = getMockInterviews();
  const analyses = getCustomAnalyses();
  const total = mocks.length + analyses.length;
  const scored = analyses.filter(a => typeof a.overallScore === 'number');
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (a.overallScore || 0), 0) / scored.length) : null;
  return {
    total,
    mockCount: mocks.length,
    customCount: analyses.length,
    averageScore: avg,
  };
};

