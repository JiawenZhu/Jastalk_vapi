import type { Job, JobHistoryEntry, InterviewAnalysis } from '../types';

const DB_KEY = 'job_history_db';

// --- Private Helper Functions ---

const getDb = (): Record<string, JobHistoryEntry> => {
    try {
        const rawDb = localStorage.getItem(DB_KEY);
        return rawDb ? JSON.parse(rawDb) : {};
    } catch (e) {
        console.error("Failed to parse job history DB from localStorage", e);
        return {};
    }
};

const saveDb = (db: Record<string, JobHistoryEntry>): void => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
        console.error("Failed to save job history DB to localStorage", e);
    }
};

const createJobId = (job: Job): string => {
    // Creates a stable ID based on title and company to identify duplicates.
    return `${job.title.trim().toLowerCase()}-${job.company.trim().toLowerCase()}`;
}

// Generate a simple unique ID for analyses
const generateAnalysisId = (): string => `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;


// --- "API" Endpoint Functions ---

/**
 * Simulates POST /api/jobs/add
 * Saves a new job entry. If it already exists, it updates the timestamp and questions.
 * The interview history is NOT modified here.
 */
export const addJob = (job: Job, questions: string[]): JobHistoryEntry => {
    const db = getDb();
    const id = job.id; // Use the stable ID from the Job object
    
    const existingEntry = db[id];

    if (existingEntry) {
        // Job exists, update timestamp and questions but preserve interview history.
        existingEntry.timestamp = Date.now();
        existingEntry.questions = questions;
        db[id] = existingEntry;
        saveDb(db);
        return existingEntry;
    } else {
        // This is a new job entry, initialize with empty history.
        const newEntry: JobHistoryEntry = {
            id,
            job,
            questions,
            timestamp: Date.now(),
            interviewHistory: [],
        };
        db[id] = newEntry;
        saveDb(db);
        return newEntry;
    }
};

/**
 * Adds a completed interview analysis to a job's history.
 */
export const addAnalysisToJob = (jobId: string, analysisData: Omit<InterviewAnalysis, 'id' | 'timestamp'>): InterviewAnalysis => {
    const db = getDb();
    const entry = db[jobId];

    if (!entry) {
        // This can happen if the user clears history while an analysis is running.
        // We'll log an error but won't crash the app. The analysis is just not saved.
        console.error(`Job with id ${jobId} not found in history. Could not save analysis.`);
        // Return a temporary analysis object so the UI can still display it.
        return { ...analysisData, id: 'unsaved', timestamp: Date.now() };
    }

    const newAnalysis: InterviewAnalysis = {
        ...analysisData,
        id: generateAnalysisId(),
        timestamp: Date.now(),
    };
    
    entry.interviewHistory.push(newAnalysis);
    db[jobId] = entry;
    saveDb(db);
    return newAnalysis;
};

/**
 * Retrieves an interview analysis report by its ID.
 * @param id The unique ID of the analysis report.
 * @returns The analysis object, or null if not found.
 */
export const getAnalysisById = (id: string): InterviewAnalysis | null => {
    const db = getDb();
    for (const jobEntry of Object.values(db)) {
        const foundAnalysis = jobEntry.interviewHistory.find(analysis => analysis.id === id);
        if (foundAnalysis) {
            return foundAnalysis;
        }
    }
    return null;
};


/**
 * Simulates GET /api/jobs/list
 * Retrieves all previously searched jobs, sorted by interview count then recency.
 */
export const listJobs = (): JobHistoryEntry[] => {
    const db = getDb();
    const entries = Object.values(db);
    // Sort by interview count (descending), then by timestamp (descending for recency)
    entries.sort((a, b) => {
        if (b.interviewHistory.length !== a.interviewHistory.length) {
            return b.interviewHistory.length - a.interviewHistory.length;
        }
        return b.timestamp - a.timestamp;
    });
    return entries;
};


/**
 * Simulates DELETE /api/jobs/clear
 * Removes all stored jobs.
 */
export const clearJobs = (): void => {
    try {
        localStorage.removeItem(DB_KEY);
    } catch (e) {
        console.error("Failed to clear job history from localStorage", e);
    }
};