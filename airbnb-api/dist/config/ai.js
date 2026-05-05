"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deterministicModel = exports.model = void 0;
const groq_1 = require("@langchain/groq");
const apiKey = process.env["GROQ_API_KEY"] ?? "";
exports.model = new groq_1.ChatGroq({
    model: "llama3-8b-8192",
    temperature: 0.7,
    apiKey
});
exports.deterministicModel = new groq_1.ChatGroq({
    model: "llama3-8b-8192",
    temperature: 0,
    apiKey
});
