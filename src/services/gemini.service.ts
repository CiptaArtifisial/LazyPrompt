
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

export interface PolishedPrompt {
  en: string;
  id: string;
}

const API_KEY_STORAGE = 'gemini_api_key';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI | undefined;
  public isInitialized = signal(false);

  constructor() {
    // Try to initialize from localStorage on startup
    const storedKey = localStorage.getItem(API_KEY_STORAGE);
    if (storedKey) {
      this.initialize(storedKey);
    }
  }

  initialize(apiKey: string) {
    if (!apiKey) {
        console.error("Attempted to initialize Gemini service with no API key.");
        this.isInitialized.set(false);
        return;
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey });
    localStorage.setItem(API_KEY_STORAGE, apiKey);
    this.isInitialized.set(true);
  }

  clearApiKey() {
    localStorage.removeItem(API_KEY_STORAGE);
    this.ai = undefined;
    this.isInitialized.set(false);
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

    } catch (error)
    {
      console.error("Gemini API Error (polishPrompt):", error);
      throw new Error("Failed to polish prompt with Gemini.");
    }
  }
}
