"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llm = void 0;
const groq_1 = require("@langchain/groq");
// Initialize the Groq model
// model: "llama-3.3-70b-versatile" is Groq's most capable free model
// temperature: 0 = deterministic (same input → same output) — good for structured tasks
// temperature: 1 = creative (more varied responses) — good for descriptions and chat
exports.llm = new groq_1.ChatGroq({
    apiKey: process.env["GROQ_API_KEY"],
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
});
exports.default = exports.llm;
