

export interface ResumeAnalysis {
  summary: string;
  skills: string[];
  experience: string;
  potentialJobTitles: string[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
}

export interface GroundingSource {
  web: {
    uri: string;
    title: string;
  }
}

export type TranscriptEntry = {
  speaker: 'user' | 'ai';
  text: string;
  isFinal: boolean;
};

export type InterviewStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' | 'ended';

export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface InterviewAnalysis {
  id: string;
  timestamp: number;
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  relevanceScore: number;
  strengths: string;
  areasForImprovement: string;
  transcript: TranscriptEntry[];
}

export interface JobHistoryEntry {
  id: string;
  job: Job;
  questions: string[];
  timestamp: number;
  interviewHistory: InterviewAnalysis[];
}

export type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};


// --- PDF.js Type Declarations ---

export interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

export interface PDFPageProxy {
  getTextContent(): Promise<TextContent>;
}

export interface TextContent {
  items: TextItem[];
}

export interface TextItem {
  str: string;
}

declare global {
  const pdfjsLib: {
    GlobalWorkerOptions: {
      workerSrc: string;
    };
    getDocument(src: any): { promise: Promise<PDFDocumentProxy> };
  };
}