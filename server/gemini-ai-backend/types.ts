export interface Voice {
  id: string;
  name: string;
  emoji: string;
}

export interface TranscriptEntry {
  speaker: 'user' | 'model';
  text: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  emoji: string;
  systemInstruction: string;
}
