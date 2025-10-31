import { ai } from './geminiService';
import { Type } from '@google/genai';

const getUsage = (response) => {
  const m = response?.usageMetadata;
  return {
    promptTokens: m?.promptTokenCount || 0,
    candidatesTokens: m?.candidatesTokenCount || 0,
    totalTokens: m?.totalTokenCount || 0,
  };
};

const handleApiError = (error, context) => {
  console.error(`Error during ${context}:`, error);
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('503') || msg.includes('service unavailable')) return new Error('The AI service is temporarily unavailable. Please try again shortly.');
    if (msg.includes('api_key') || msg.includes('api key not valid')) return new Error('The API key is invalid. Please check your configuration.');
    if (msg.includes('resource_exhausted') || msg.includes('quota')) return new Error('You have exceeded your API quota.');
    if (msg.includes('network') || msg.includes('fetch failed')) return new Error('A network error occurred. Please check your connection.');
    return new Error(`Failed to ${context}: ${error.message}`);
  }
  return new Error(`Failed to ${context}. An unknown error occurred.`);
};

export const analyzeResume = async (input) => {
  try {
    let contents;
    const schema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        experience: { type: Type.STRING },
        potentialJobTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['summary', 'skills', 'experience', 'potentialJobTitles'],
    };

    if (input.resumeText) {
      contents = `Analyze the following resume text. Extract a professional summary, a list of key skills, the total years of experience, and 3-5 potential job titles that would be a good fit.\n\nResume Text:\n---\n${input.resumeText}\n---`;
    } else if (input.pdfFile) {
      const base64 = await fileToBase64(input.pdfFile);
      contents = [{ role: 'user', parts: [
        { text: 'Analyze the attached resume PDF and return JSON with summary, skills, experience years and 3-5 potential job titles.' },
        { inlineData: { mimeType: 'application/pdf', data: base64 } },
      ]}];
    } else if (input.linkedInUrl) {
      contents = `Analyze the public LinkedIn profile at: ${input.linkedInUrl}. If inaccessible, state that in the summary. Extract summary, skills, experience, and 3-5 potential job titles.`;
    } else {
      throw new Error('Either resume text, PDF file, or a LinkedIn URL must be provided for analysis.');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents,
      config: { responseMimeType: 'application/json', responseSchema: schema },
    });

    let analysis;
    try { analysis = JSON.parse((response.text || '').trim()); }
    catch { analysis = tryBestEffortParse(response.text); }
    const usage = getUsage(response);
    return { analysis, usage };
  } catch (error) {
    throw handleApiError(error, 'analyze resume or profile');
  }
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.readAsDataURL(file);
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = reject;
});

export const searchJobs = async (query) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find at least 10 up-to-date job listings for the following query: "${query}".
For each job, format the output EXACTLY as follows, using "---" as a separator between jobs. Do not include any other text, introductory sentences, or markdown formatting.

Title: [Job Title]
Company: [Company Name]
Location: [Job Location]
Description: [A brief, 2-3 sentence description]
URL: [Direct link to the job posting]
---
Title: [Job Title 2]
Company: [Company Name 2]
Location: [Job Location 2]
Description: [Description 2]
URL: [Direct link]
---`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c) => c.web) || [];
    const text = response.text || '';
    const usage = getUsage(response);

    const jobs = [];
    const seen = new Set();
    const usedUrls = new Set();
    const sourceUris = sources.map(s => s.web?.uri).filter(Boolean);
    text.split('---').filter((b) => b.trim()).forEach((block) => {
      const titleMatch = block.match(/Title:\s*(.*)/);
      const companyMatch = block.match(/Company:\s*(.*)/);
      const locationMatch = block.match(/Location:\s*(.*)/);
      const descriptionMatch = block.match(/Description:\s*([\s\S]*?)(?:\nURL:|$)/);
      const urlMatch = block.match(/URL:\s*(https?:[^\s]+)\s*$/m);
      if (titleMatch?.[1] && companyMatch?.[1] && locationMatch?.[1] && descriptionMatch?.[1]) {
        const title = titleMatch[1].trim();
        const company = companyMatch[1].trim();
        const id = `${title.toLowerCase()}-${company.toLowerCase()}-${jobs.length}`;
        if (!seen.has(id)) {
          seen.add(id);
          let url = (urlMatch?.[1] || '').trim();
          const q = `${title} ${company} ${locationMatch[1].trim()} job`;
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
          // Validate and de-duplicate URL; prefer direct link, otherwise grounded source for same index; finally a unique search link
          if (!/^https?:\/\//i.test(url)) {
            url = sourceUris[jobs.length] || '';
          }
          if (!/^https?:\/\//i.test(url) || usedUrls.has(url)) {
            url = searchUrl;
          }
          usedUrls.add(url);
          jobs.push({ id, title, company, location: locationMatch[1].trim(), description: (descriptionMatch[1] || '').trim(), url });
        }
      }
    });

    return { jobs, sources, usage };
  } catch (error) {
    throw handleApiError(error, 'search for jobs');
  }
};

export const generateInterviewQuestions = async (jobTitle, jobDescription) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the job title "${jobTitle}" and the following description, generate 5-7 insightful interview questions. Cover technical, behavioral, and situational aspects.

Job Description:
---
${jobDescription}
---

Respond with a JSON array of strings, no extra text.`,
    });
    let questions; try { questions = JSON.parse(response.text || '[]'); } catch { questions = []; }
    const usage = getUsage(response);
    if (!Array.isArray(questions) || !questions.length) {
      questions = [
        'Tell me about yourself and your relevant experience.',
        'What interests you about this position?',
        "Describe a challenging project you've worked on.",
        'How do you handle working under pressure?',
        'Where do you see yourself in 5 years?'
      ];
    }
    return { questions, usage };
  } catch (error) {
    throw handleApiError(error, 'generate interview questions');
  }
};

export const generateResumeSuggestion = async (resumeText, chatHistory) => {
  try {
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
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const suggestion = response.text;
    const usage = getUsage(response);
    return { suggestion, usage };
  } catch (error) {
    throw handleApiError(error, 'generate resume suggestion');
  }
};

export const analyzeInterviewTranscript = async (jobId, transcript) => {
  try {
    const formattedTranscript = transcript.map(e => `${e.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${e.text}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `You are an expert interview coach. Analyze the following transcript and provide a structured performance review. Provide scores from 0-100 and concise feedback.\n\nTranscript:\n---\n${formattedTranscript}\n---`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            communicationScore: { type: Type.NUMBER },
            confidenceScore: { type: Type.NUMBER },
            relevanceScore: { type: Type.NUMBER },
            strengths: { type: Type.STRING },
            areasForImprovement: { type: Type.STRING },
          },
          required: ['overallScore','communicationScore','confidenceScore','relevanceScore','strengths','areasForImprovement'],
        }
      }
    });
    let partial; try { partial = JSON.parse((response.text || '').trim()); } catch { partial = tryBestEffortParse(response.text); }
    const full = { ...partial, transcript };
    const usage = getUsage(response);
    return { analysis: { id: `analysis-${Date.now()}`, timestamp: Date.now(), ...full }, usage };
  } catch (error) {
    throw handleApiError(error, 'analyze transcript');
  }
};

function tryBestEffortParse(text) {
  if (!text) return { summary: 'Could not parse resume analysis properly', skills: [], experience: 'N/A', potentialJobTitles: [] };
  let cleaned = String(text).trim();
  cleaned = cleaned.replace(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/m, '$1');
  const fb = cleaned.indexOf('{');
  const lb = cleaned.indexOf('[');
  let start = -1; if (fb !== -1 && (lb === -1 || fb < lb)) start = fb; else start = lb;
  if (start !== -1) cleaned = cleaned.slice(start);
  const eb = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (eb !== -1) cleaned = cleaned.slice(0, eb + 1);
  try { return JSON.parse(cleaned); } catch {
    if (cleaned.includes('overallScore')) {
      return { overallScore: 75, communicationScore: 75, confidenceScore: 75, relevanceScore: 75, strengths: 'Analysis could not be completed properly', areasForImprovement: 'Please try the interview again' };
    }
    return { summary: 'Could not parse resume analysis properly', skills: [], experience: 'N/A', potentialJobTitles: [] };
  }
}
