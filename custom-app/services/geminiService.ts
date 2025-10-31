import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ResumeAnalysis, Job, TokenUsage } from '../types';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

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
 */
const handleApiError = (error: unknown, context: string): Error => {
    console.error(`Error during ${context}:`, error);

    if (error instanceof Error) {
        const message = error.message;
        const lowerCaseMessage = message.toLowerCase();

        if (lowerCaseMessage.includes('503') || lowerCaseMessage.includes('service unavailable')) {
            return new Error("The AI service is temporarily unavailable. Please try again in a few moments.");
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
        
        return new Error(`Failed to ${context}: ${message}`);
    }
    
    return new Error(`Failed to ${context}. An unknown error occurred.`);
};

export const analyzeResume = async (input: { resumeText?: string; pdfFile?: File; linkedInUrl?: string }): Promise<{ analysis: ResumeAnalysis; usage: TokenUsage }> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        let prompt: string;
        let parts: any[] = [];
        
        if (input.resumeText) {
            prompt = `Analyze the following resume text. Extract a professional summary, a list of key skills, the total years of experience, and 3-5 potential job titles that would be a good fit.
            
            Resume Text:
            ---
            ${input.resumeText}
            ---
            
            Please respond in JSON format with the following structure:
            {
                "summary": "A concise professional summary of the candidate",
                "skills": ["skill1", "skill2", "skill3"],
                "experience": "X+ years",
                "potentialJobTitles": ["title1", "title2", "title3"]
            }`;
            parts = [prompt];
        } else if (input.pdfFile) {
            // Convert PDF file to base64 for AI analysis
            const base64Data = await fileToBase64(input.pdfFile);
            prompt = `Analyze the resume in this PDF document. Extract a professional summary, a list of key skills, the total years of experience, and 3-5 potential job titles that would be a good fit.
            
            Please respond in JSON format with the following structure:
            {
                "summary": "A concise professional summary of the candidate",
                "skills": ["skill1", "skill2", "skill3"],
                "experience": "X+ years",
                "potentialJobTitles": ["title1", "title2", "title3"]
            }`;
            parts = [
                prompt,
                {
                    inlineData: {
                        mimeType: "application/pdf",
                        data: base64Data
                    }
                }
            ];
        } else if (input.linkedInUrl) {
            prompt = `Analyze the public LinkedIn profile at the following URL: "${input.linkedInUrl}". Extract professional summary, skills, experience, and potential job titles. If the profile is inaccessible, state that clearly in the summary.
            
            Please respond in JSON format with the following structure:
            {
                "summary": "A concise professional summary of the candidate",
                "skills": ["skill1", "skill2", "skill3"],
                "experience": "X+ years",
                "potentialJobTitles": ["title1", "title2", "title3"]
            }`;
            parts = [prompt];
        } else {
            throw new Error("Either resume text, PDF file, or a LinkedIn URL must be provided for analysis.");
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();
        
        let analysis: ResumeAnalysis;
        try {
            analysis = JSON.parse(text);
        } catch (parseError) {
            analysis = {
                summary: "Could not parse resume analysis properly",
                skills: [],
                experience: "N/A",
                potentialJobTitles: []
            };
        }
        
        const usage = getUsage(response);
        return { analysis, usage };
    } catch (error) {
        throw handleApiError(error, 'analyze resume or profile');
    }
};

export const searchJobs = async (query: string): Promise<{ jobs: Job[], usage: TokenUsage }> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const prompt = `Find at least 10 current job listings for the following query: "${query}".
        
        For each job, provide the information in the following JSON array format:
        [
            {
                "title": "Job Title",
                "company": "Company Name",
                "location": "Job Location",
                "description": "A brief, 2-3 sentence description",
                "url": "#"
            }
        ]
        
        Please provide only the JSON array, no additional text.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        let jobs: Job[];
        try {
            jobs = JSON.parse(text);
            jobs = jobs.map((job, index) => ({
                ...job,
                id: `${job.title?.toLowerCase().replace(/\s+/g, '-')}-${job.company?.toLowerCase().replace(/\s+/g, '-')}-${index}`
            }));
        } catch (parseError) {
            jobs = [];
        }
        
        const usage = getUsage(response);
        
        return { jobs, usage };
    } catch (error) {
        throw handleApiError(error, 'search for jobs');
    }
};

export const generateInterviewQuestions = async (jobTitle: string, jobDescription: string): Promise<{ questions: string[]; usage: TokenUsage }> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const prompt = `Based on the job title "${jobTitle}" and the following description, generate a list of 5-7 insightful interview questions. Cover technical, behavioral, and situational aspects.
        
        Job Description:
        ---
        ${jobDescription}
        ---
        
        Please respond with a JSON array of questions:
        ["Question 1", "Question 2", "Question 3"]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        let questions: string[];
        try {
            questions = JSON.parse(text);
        } catch (parseError) {
            questions = [
                "Tell me about yourself and your relevant experience.",
                "What interests you about this position?",
                "Describe a challenging project you've worked on.",
                "How do you handle working under pressure?",
                "Where do you see yourself in 5 years?"
            ];
        }
        
        const usage = getUsage(response);
        return { questions, usage };
    } catch (error) {
        throw handleApiError(error, 'generate interview questions');
    }
};

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};