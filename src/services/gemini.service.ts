
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

export interface PolishedPrompt {
  en: string;
  id: string;
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is injected via environment variables.
    // Do not hardcode or expose it in the frontend.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY environment variable not set.");
      // In a real app, you might want to handle this more gracefully.
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey! });
  }

  async enrichIdea(subject: string): Promise<string> {
    if (!this.ai) {
      return Promise.reject("Gemini AI client not initialized.");
    }
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: subject,
        config: {
            systemInstruction: "You are an AI assistant for artists. Expand the user's idea into a rich, visual scene description suitable for an image generation prompt. Keep it concise, under 60 words."
        }
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error (enrichIdea):", error);
      throw new Error("Failed to enrich idea with Gemini.");
    }
  }

  async polishPrompt(rawPrompt: string): Promise<PolishedPrompt> {
    if (!this.ai) {
      return Promise.reject("Gemini AI client not initialized.");
    }
    
    const systemInstruction = `You are a world-class prompt engineer for text-to-image AI like Midjourney. Your task is to take a user's raw prompt and elevate it.
    1.  First, create an optimized, artistic, and detailed version of the prompt in English. Add keywords related to composition, style, and quality.
    2.  Second, translate that final, optimized English prompt into fluent, natural-sounding Indonesian.
    3.  Return ONLY a single, valid JSON object with the keys "en" and "id".`;
    
    try {
        const response = await this.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: rawPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        en: { type: Type.STRING },
                        id: { type: Type.STRING }
                    }
                }
            }
        });

      const jsonString = response.text;
      const result = JSON.parse(jsonString);
      return result as PolishedPrompt;

    } catch (error) {
      console.error("Gemini API Error (polishPrompt):", error);
      throw new Error("Failed to polish prompt with Gemini.");
    }
  }
}
