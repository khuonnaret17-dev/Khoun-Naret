
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

// Fix: Implement quiz question generation using the modern Gemini 3 SDK.
// Upgraded model to 'gemini-3-pro-preview' as generating professional state exam questions in Khmer is a complex reasoning task.
export const generateQuizQuestions = async (subject: string, count: number = 5): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate ${count} professional quiz questions about "${subject}" in Khmer. 
      Ensure questions are suitable for government state exam preparation.
      Output must be a JSON array of quiz objects.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              question: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["mcq", "short"] },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array of exactly 4 choices for MCQ"
              },
              correct: { type: Type.INTEGER, description: "Zero-based index of correct option" },
              answer: { type: Type.STRING, description: "Correct text for short answer questions" }
            },
            required: ["subject", "question", "type"],
            propertyOrdering: ["subject", "question", "type", "options", "correct", "answer"]
          }
        }
      }
    });

    // Directly access the .text property of GenerateContentResponse
    const result = response.text.trim();
    return JSON.parse(result) as Question[];
  } catch (error) {
    console.error("AI Question Generation Failed:", error);
    return [];
  }
};
