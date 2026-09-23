import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "@/lib/env";

export function isGeminiConfigured(): boolean {
  return Boolean(getServerEnv().GEMINI_API_KEY);
}

export function createGeminiClient(): GoogleGenAI {
  const env = getServerEnv();

  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const env = getServerEnv();
  const ai = createGeminiClient();

  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt
  });

  return response.text ?? "";
}
