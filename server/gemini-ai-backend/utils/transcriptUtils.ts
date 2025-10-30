import type { TranscriptEntry } from '../types';

export const saveTranscriptToFile = (transcript: TranscriptEntry[]): void => {
  if (transcript.length === 0) return;

  const formattedTranscript = transcript
    .map(entry => `${entry.speaker.charAt(0).toUpperCase() + entry.speaker.slice(1)}: ${entry.text}`)
    .join('\n\n');
  
  const blob = new Blob([formattedTranscript], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  a.download = `gemini-live-transcript-${timestamp}.txt`;
  
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
