import { GoogleGenAI, Type } from "@google/genai";
import type { ResumeAnalysis, Job, GroundingSource, TokenUsage, InterviewAnalysis, TranscriptEntry, ChatMessage } from '../types';
import { addAnalysisToJob } from "./jobHistoryService";

/**
 * Creates and returns a new GoogleGenAI client instance.
 * Throws an error if the API key is not available.
 */
const createAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set");
  }
  return new GoogleGenAI({ apiKey });
};

const getUsage = (response: any): TokenUsage => {
    const metadata = response?.usageMetadata;
    return {
        promptTokens: metadata?.promptTokenCount || 0,
        candidatesTokens: metadata?.candidatesTokenCount || 0,
        totalTokens: metadata?.totalTokenCount || 0,
    };
};

/**
 * Handles API errors by providing more specific and user-friendly messages.
 * @param error The error object caught.
 * @param context A string describing the action that failed (e.g., "analyze resume").
 * @returns A new Error with a more descriptive message.
 */
const handleApiError = (error: unknown, context: string): Error => {
    console.error(`Error during ${context}:`, error);

    if (error instanceof Error) {
        const message = error.message; // Keep original case for display
        const lowerCaseMessage = message.toLowerCase();

        // Check for specific, high-priority errors first.
        if (lowerCaseMessage.includes('503') || lowerCaseMessage.includes('service unavailable')) {
            return new Error("The AI service is temporarily unavailable. This is usually a temporary issue. Please try again in a few moments.");
        }
        if (lowerCaseMessage.includes('api_key') || lowerCaseMessage.includes('api key not valid')) {
            return new Error("The API key is invalid. Please check your configuration.");
        }
        if (lowerCaseMessage.includes('resource_exhausted') || lowerCaseMessage.includes('quota')) {
            return new Error("You have exceeded your API quota. Please check your Google AI Studio account.");
        }
        if (lowerCaseMessage.includes('network') || lowerCaseMessage.includes('fetch failed')) {
            return new Error("A network error occurred. Please check your internet connection and try again.");
        }
        
        // For other errors, return the original message from the API.
        return new Error(`Failed to ${context}: ${message}`);
    }
    
    // Fallback for non-Error objects
    return new Error(`Failed to ${context}. An unknown error occurred.`);
};


export const analyzeResume = async (input: { resumeText?: string; linkedInUrl?: string }): Promise<{ analysis: ResumeAnalysis; usage: TokenUsage }> => {
  try {
    const ai = createAiClient();
    
    let contents: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let config: any; 

    if (input.resumeText) {
      contents = `Analyze the following resume text. Extract a professional summary, a list of key skills, the total years of experience, and 3-5 potential job titles that would be a good fit.
      Resume Text:
      ---
      ${input.resumeText}
      ---
      `;
      config = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A concise professional summary of the candidate. If a LinkedIn profile is inaccessible, state that here." },
            skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of key technical and soft skills." },
            experience: { type: Type.STRING, description: "Total years of professional experience, e.g., '5+ years'." },
            potentialJobTitles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 3-5 suitable job titles." }
          },
          required: ["summary", "skills", "experience", "potentialJobTitles"],
        },
      };
    } else if (input.linkedInUrl) {
      contents = `Analyze the public LinkedIn profile found at the following URL using Google Search.
      URL: "${input.linkedInUrl}"
      
      If the profile is inaccessible, state that clearly in the summary and leave other fields blank.
      
      Otherwise, format the output EXACTLY as follows. Do not include any other text, introductory sentences, or markdown formatting.
      
      Summary: [A concise professional summary of the candidate.]
      Skills: [A comma-separated list of key technical and soft skills.]
      Experience: [Total years of professional experience, e.g., '5+ years'.]
      Potential Job Titles: [A comma-separated list of 3-5 suitable job titles.]`;
      
      config = {
          tools: [{ googleSearch: {} }],
      };
    } else {
      throw new Error("Either resume text or a LinkedIn URL must be provided for analysis.");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: contents,
      config: config,
    });
    
    let analysis: ResumeAnalysis;
    if (input.linkedInUrl) {
      // Manual parsing is required when using tools like Google Search
      const textResponse = response.text;
      const summaryMatch = textResponse.match(/Summary:\s*([\s\S]*?)(?=\nSkills:|\nExperience:|\nPotential Job Titles:|$)/);
      const skillsMatch = textResponse.match(/Skills:\s*(.*)/);
      const experienceMatch = textResponse.match(/Experience:\s*(.*)/);
      const titlesMatch = textResponse.match(/Potential Job Titles:\s*(.*)/);

      analysis = {
          summary: summaryMatch?.[1]?.trim() || "Could not retrieve summary. The profile may be private or the URL invalid.",
          skills: skillsMatch?.[1]?.split(',').map(s => s.trim()).filter(s => s) || [],
          experience: experienceMatch?.[1]?.trim() || "N/A",
          potentialJobTitles: titlesMatch?.[1]?.split(',').map(s => s.trim()).filter(s => s) || [],
      };
      
      // If the model reports it can't access, clear the other fields to ensure clean output.
      if (analysis.summary.toLowerCase().includes("cannot access") || analysis.summary.toLowerCase().includes("private profile")) {
          analysis.skills = [];
          analysis.experience = "N/A";
          analysis.potentialJobTitles = [];
      }
    } else {
      // JSON parsing for the standard resume text case
      const jsonText = response.text.trim();
      analysis = JSON.parse(jsonText) as ResumeAnalysis;
    }
    
    const usage = getUsage(response);
    return { analysis, usage };
  } catch (error) {
    throw handleApiError(error, 'analyze resume or profile');
  }
};

export const searchJobs = async (query: string): Promise<{ jobs: Job[], sources: GroundingSource[], usage: TokenUsage }> => {
  try {
    const ai = createAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find at least 10 up-to-date job listings for the following query: "${query}".
For each job, format the output EXACTLY as follows, using "---" as a separator between jobs. Do not include any other text, introductory sentences, or markdown formatting.

Title: [Job Title]
Company: [Company Name]
Location: [Job Location]
Description: [A brief, 2-3 sentence description]
---
Title: [Job Title 2]
Company: [Company Name 2]
Location: [Job Location 2]
Description: [Description 2]
---`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter(c => c.web) as GroundingSource[] || [];
    const textResponse = response.text;
    const usage = getUsage(response);
    
    const jobs: Job[] = [];
    const jobBlocks = textResponse.split('---').filter(block => block.trim() !== '');
    const fallbackUrl = sources.find(s => s.web?.uri)?.web?.uri || '#';
    const uniqueJobIds = new Set<string>();

    jobBlocks.forEach((block) => {
      const titleMatch = block.match(/Title:\s*(.*)/);
      const companyMatch = block.match(/Company:\s*(.*)/);
      const locationMatch = block.match(/Location:\s*(.*)/);
      const descriptionMatch = block.match(/Description:\s*([\s\S]*)/);

      if (titleMatch?.[1] && companyMatch?.[1] && locationMatch?.[1] && descriptionMatch?.[1]) {
        const title = titleMatch[1].trim();
        const company = companyMatch[1].trim();
        
        if (title && company) {
           const id = `${title.trim().toLowerCase()}-${company.trim().toLowerCase()}`;
           if (!uniqueJobIds.has(id)) {
               uniqueJobIds.add(id);
               jobs.push({
                id,
                title,
                company,
                location: locationMatch[1].trim(),
                description: descriptionMatch[1].trim(),
                url: fallbackUrl,
              });
           }
        }
      }
    });

    return { jobs, sources, usage };
  } catch (error) {
    throw handleApiError(error, 'search for jobs');
  }
};

export const generateInterviewQuestions = async (jobTitle: string, jobDescription: string): Promise<{ questions: string[]; usage: TokenUsage }> => {
  try {
    const ai = createAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the job title "${jobTitle}" and the following description, generate a list of 5-7 insightful interview questions. Cover technical, behavioral, and situational aspects.
      Job Description:
      ---
      ${jobDescription}
      ---
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A list of interview questions.",
        },
      },
    });
    const jsonText = response.text.trim();
    const questions = JSON.parse(jsonText) as string[];
    const usage = getUsage(response);
    return { questions, usage };
  } catch (error) {
    throw handleApiError(error, 'generate interview questions');
  }
};

export const generateResumeSuggestion = async (resumeText: string, chatHistory: ChatMessage[]): Promise<{ suggestion: string; usage: TokenUsage }> => {
  try {
    const ai = createAiClient();

    const historyText = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');

    const contents = `You are an expert resume writing assistant. Your task is to help the user refine their resume based on their request.
When the user asks you to modify a part of their resume, you MUST rewrite the ENTIRE relevant section (e.g., the whole SUMMARY section, a complete job entry under EXPERIENCE, etc.).
Your suggestion should be a complete replacement for that section.
You MUST enclose this complete, rewritten section within triple backticks like this: \`\`\`txt\n[The entire rewritten section here, including the title like 'SUMMARY']\n\`\`\`.
Do not suggest partial sentences or just bullet points; provide the full, ready-to-use text for the section.
If you are just having a conversation and not providing a direct resume edit, do not use the triple backtick formatting.

---
Here is the user's current full resume:
${resumeText}
---
Here is the conversation so far:
${historyText}
---

Based on the latest user message, provide your response.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });

    const suggestion = response.text;
    const usage = getUsage(response);
    
    return { suggestion, usage };
  } catch (error) {
    throw handleApiError(error, 'generate resume suggestion');
  }
};

export const analyzeInterviewTranscript = async (jobId: string, transcript: TranscriptEntry[]): Promise<{ analysis: InterviewAnalysis; usage: TokenUsage }> => {
    try {
        const ai = createAiClient();
        const formattedTranscript = transcript.map(entry => `${entry.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${entry.text}`).join('\n');
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `You are an expert interview coach. Analyze the following transcript and provide a structured performance review. Provide scores from 0-100 for the specified metrics and concise, actionable feedback.
            
            Transcript:
            ---
            ${formattedTranscript}
            ---
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        overallScore: { type: Type.NUMBER, description: "An overall performance score from 0 to 100." },
                        communicationScore: { type: Type.NUMBER, description: "A score from 0 to 100 for communication skills, clarity, and articulation." },
                        confidenceScore: { type: Type.NUMBER, description: "A score from 0 to 100 for the candidate's confidence level." },
                        relevanceScore: { type: Type.NUMBER, description: "A score from 0 to 100 for how relevant the candidate's answers were to the questions." },
                        strengths: { type: Type.STRING, description: "A summary of the candidate's strengths, formatted as a simple string with newlines." },
                        areasForImprovement: { type: Type.STRING, description: "Actionable advice on areas for improvement, formatted as a simple string with newlines." }
                    },
                    required: ["overallScore", "communicationScore", "confidenceScore", "relevanceScore", "strengths", "areasForImprovement"],
                },
            },
        });

        const jsonText = response.text.trim();
        const partialAnalysis = JSON.parse(jsonText) as Omit<InterviewAnalysis, 'id' | 'timestamp' | 'transcript'>;

        const fullAnalysisData: Omit<InterviewAnalysis, 'id' | 'timestamp'> = {
            ...partialAnalysis,
            transcript: transcript,
        };
        
        const savedAnalysis = addAnalysisToJob(jobId, fullAnalysisData);
        const usage = getUsage(response);
        
        return { analysis: savedAnalysis, usage };

    } catch (error) {
        throw handleApiError(error, 'analyze transcript');
    }
};