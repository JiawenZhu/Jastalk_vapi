import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

const getUsage = (response) => {
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
const handleApiError = (error, context) => {
    console.error(`Error during ${context}:`, error);

    if (error instanceof Error) {
        const message = error.message;
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

export const analyzeResume = async (input) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        let prompt;
        let parts = [];
        
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
        
        let analysis;
        try {
            analysis = JSON.parse(text);
        } catch (parseError) {
            // Fallback parsing if JSON is malformed
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

// Helper function to convert file to base64
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove the data URL prefix (data:application/pdf;base64,)
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

export const searchJobs = async (query) => {
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
        
        let jobs;
        try {
            jobs = JSON.parse(text);
            // Ensure each job has an ID
            jobs = jobs.map((job, index) => ({
                ...job,
                id: `${job.title?.toLowerCase().replace(/\s+/g, '-')}-${job.company?.toLowerCase().replace(/\s+/g, '-')}-${index}`
            }));
        } catch (parseError) {
            jobs = [];
        }
        
        const usage = getUsage(response);
        const sources = []; // Mock sources for now
        
        return { jobs, sources, usage };
    } catch (error) {
        throw handleApiError(error, 'search for jobs');
    }
};

export const generateInterviewQuestions = async (jobTitle, jobDescription) => {
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
        
        let questions;
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

export const generateResumeSuggestion = async (resumeText, chatHistory) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const historyText = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');

        const prompt = `You are an expert resume writing assistant. Your task is to help the user refine their resume based on their request.
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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const suggestion = response.text();
        const usage = getUsage(response);
        
        return { suggestion, usage };
    } catch (error) {
        throw handleApiError(error, 'generate resume suggestion');
    }
};

export const analyzeInterviewTranscript = async (jobId, transcript) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const formattedTranscript = transcript.map(entry => `${entry.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${entry.text}`).join('\n');
        
        const prompt = `You are an expert interview coach. Analyze the following transcript and provide a structured performance review. Provide scores from 0-100 for the specified metrics and concise, actionable feedback.
        
        Transcript:
        ---
        ${formattedTranscript}
        ---
        
        Please respond in JSON format:
        {
            "overallScore": 85,
            "communicationScore": 90,
            "confidenceScore": 80,
            "relevanceScore": 88,
            "strengths": "Clear communication and good examples",
            "areasForImprovement": "Could provide more specific technical details"
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        let partialAnalysis;
        try {
            partialAnalysis = JSON.parse(text);
        } catch (parseError) {
            partialAnalysis = {
                overallScore: 75,
                communicationScore: 75,
                confidenceScore: 75,
                relevanceScore: 75,
                strengths: "Analysis could not be completed properly",
                areasForImprovement: "Please try the interview again"
            };
        }

        const fullAnalysisData = {
            ...partialAnalysis,
            transcript: transcript,
        };
        
        // Mock saving to job history
        const savedAnalysis = {
            id: `analysis-${Date.now()}`,
            timestamp: Date.now(),
            ...fullAnalysisData
        };
        
        const usage = getUsage(response);
        
        return { analysis: savedAnalysis, usage };

    } catch (error) {
        throw handleApiError(error, 'analyze transcript');
    }
};