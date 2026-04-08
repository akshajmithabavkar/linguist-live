import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TranscriptionResult {
  language: string;
  transcription: string;
  translation: string;
}

export async function transcribeAndTranslate(audioBase64: string, mimeType: string): Promise<TranscriptionResult> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a real-time voice transcription and translation assistant.

Your job is to:
1. Accurately transcribe spoken input into text without missing any words.
2. Automatically detect the language of the spoken input.
3. Translate the transcription into clear and natural English.

Instructions:
- Prioritize accuracy over assumptions. Do not skip or summarize words.
- Capture every word, including fillers if spoken (like "um", "uh"), unless they distort meaning.
- Detect the language correctly even if the speaker mixes languages (code-switching).
- If multiple languages are used, mention all detected languages.
- Ensure the English translation is grammatically correct and natural.
- Do not add extra explanations or comments.
- Keep the response fast, clean, and structured.
- Avoid glitches, repetition, or lag in output.

Output format:
Language Detected: <language name>
Transcription: <exact spoken text>
English Translation: <translated text>

If audio is unclear:
- Indicate unclear portions with [unclear].
- Still provide best possible transcription and translation.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: "Please transcribe and translate the provided audio according to your instructions.",
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      temperature: 0.1, // Low temperature for accuracy
    },
  });

  const text = response.text || "";
  return parseResponse(text);
}

function parseResponse(text: string): TranscriptionResult {
  const languageMatch = text.match(/Language Detected:\s*(.*)/i);
  const transcriptionMatch = text.match(/Transcription:\s*([\s\S]*?)(?=English Translation:|$)/i);
  const translationMatch = text.match(/English Translation:\s*([\s\S]*)/i);

  return {
    language: languageMatch ? languageMatch[1].trim() : "Unknown",
    transcription: transcriptionMatch ? transcriptionMatch[1].trim() : "No transcription available",
    translation: translationMatch ? translationMatch[1].trim() : "No translation available",
  };
}
