import { GoogleGenAI } from '@google/genai';

// Try multiple possible environment variable names
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 
                import.meta.env.GEMINI_API_KEY || 
                'AIzaSyDqh_EoX71YETpbx-NIP5b3lIjshSsMruE';

console.log('Gemini API Key available:', !!API_KEY);

export const ai = new GoogleGenAI({ apiKey: API_KEY });