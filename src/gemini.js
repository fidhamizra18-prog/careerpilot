import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const generateCareerRoadmap = async (userData) => {
  if (!genAI) {
    throw new Error("Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are an elite career navigation AI. Based on the user profile below, suggest the top 3 most suitable career paths.
    Your goal is to provide actionable clarity and a professional learning roadmap.

    User Profile:
    - Education: ${userData.education}
    - Current Skills: ${userData.skills}
    - Interests: ${userData.interests}
    - Work Style: ${userData.workStyle}
    - Long-term Goal: ${userData.goal || 'Not specified'}

    For each suggested career, you MUST provide:
    1. A match score (0-100) based on how well their interests and skills align.
    2. A professional reasoning for the suggestion.
    3. A Skill Gap Analysis:
       - requiredSkills: All skills needed for this career.
       - matchingSkills: Skills the user already has (from their profile).
       - missingSkills: Skills the user needs to acquire.
    4. A 6-month learning roadmap divided into 3-4 clear phases/steps.
       - Each step must have a title and a detailed focus area.

    Return the response strictly as a JSON object with this structure:
    {
      "careers": [
        {
          "id": "unique-id",
          "title": "Career Title",
          "matchScore": 95,
          "reason": "Professional explanation of why this fits...",
          "analysis": {
            "required": ["Skill A", "Skill B", "Skill C"],
            "matching": ["Skill A"],
            "missing": ["Skill B", "Skill C"]
          },
          "roadmap": [
            { "title": "Month 1-2: Fundamentals", "focus": "Detailed description of what to learn and resources to look for..." },
            { "title": "Month 3-4: Intermediate Projects", "focus": "Practical application and portfolio building..." },
            { "title": "Month 5-6: Advanced & Certification", "focus": "Complex topics and preparing for interviews..." }
          ]
        }
      ]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response. The response was: " + text);

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
