const DB_KEY = 'job_history_db';

const getDb = () => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to parse job history DB', e);
    return {};
  }
};

const saveDb = (db) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save job history DB', e);
  }
};

export const addJob = (job, questions) => {
  const db = getDb();
  const id = job.id || `${(job.title || '').trim().toLowerCase()}-${(job.company || '').trim().toLowerCase()}`;
  const existing = db[id];
  if (existing) {
    existing.timestamp = Date.now();
    existing.questions = questions || existing.questions || [];
    db[id] = existing;
    saveDb(db);
    return existing;
  }
  const entry = {
    id,
    job: { ...job, id },
    questions: questions || [],
    timestamp: Date.now(),
    interviewHistory: [],
  };
  db[id] = entry;
  saveDb(db);
  return entry;
};

const genAnalysisId = () => `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const addAnalysisToJob = (jobId, analysisData) => {
  const db = getDb();
  const entry = db[jobId];
  if (!entry) {
    console.error(`Job ${jobId} not found when saving analysis`);
    return { ...analysisData, id: 'unsaved', timestamp: Date.now() };
  }
  const analysis = { ...analysisData, id: genAnalysisId(), timestamp: Date.now() };
  entry.interviewHistory.push(analysis);
  db[jobId] = entry;
  saveDb(db);
  return analysis;
};

export const listJobs = () => {
  const entries = Object.values(getDb());
  entries.sort((a, b) => {
    if ((b.interviewHistory?.length || 0) !== (a.interviewHistory?.length || 0)) {
      return (b.interviewHistory?.length || 0) - (a.interviewHistory?.length || 0);
    }
    return (b.timestamp || 0) - (a.timestamp || 0);
  });
  return entries;
};

export const clearJobs = () => {
  try {
    localStorage.removeItem(DB_KEY);
  } catch (e) {
    console.error('Failed to clear job history DB', e);
  }
};

export const getAnalysisById = (id) => {
  const db = getDb();
  for (const entry of Object.values(db)) {
    const found = (entry.interviewHistory || []).find((a) => a.id === id);
    if (found) return found;
  }
  return null;
};

