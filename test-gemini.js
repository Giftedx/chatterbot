import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello, Gemini! Are you working?");
    console.log("Gemini API response:", result.response.text());
  } catch (err) {
    console.error("Gemini API error:", err);
  }
}

test(); 