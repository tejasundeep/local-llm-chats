// /pages/api/generate.js
import { fileURLToPath } from "url";
import path from "path";
import { getLlama, LlamaChatSession } from "node-llama-cpp";

// Get directory path
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize llama and model variables
let llamaInstancePromise;
let model;

const SYSTEM_PROMPT = `You are a helpful AI assistant. Your responses should be:
1. Accurate and informative
2. Clear and well-structured
3. Friendly and conversational
4. Concise yet complete

Important Instructions:
- Always maintain context from the previous conversation
- If referring to something mentioned earlier, specify what you're referring to
- If you're unsure about something, admit it rather than making up information
- If asked to do something you cannot do, explain your limitations politely
- Always maintain a helpful and professional tone

Current conversation:
`;

const MAX_HISTORY_LENGTH = 12; // Increased history length for better context

async function loadModel(modelPath) {
    try {
        const llama = await getLlama();
        return await llama.loadModel({
            modelPath,
            contextSize: 2048,
            temperature: 0.7,
            topP: 0.9,
            repeatPenalty: 1.1
        });
    } catch (error) {
        console.error("Error loading model:", error);
        throw error;
    }
}

async function initializeModel() {
    if (!llamaInstancePromise) {
        const modelPath = path.join(process.cwd(), "models", "Llama-3.2-1B-Instruct-Q8_0.gguf");
        llamaInstancePromise = loadModel(modelPath).then((loadedModel) => {
            model = loadedModel;
        });
    }
    await llamaInstancePromise;
}

function formatConversationHistory(history) {
    // Take only the last MAX_HISTORY_LENGTH messages
    const recentHistory = history.slice(-MAX_HISTORY_LENGTH);
    
    // Add a marker for conversation start if there's more history
    const hasMoreHistory = history.length > MAX_HISTORY_LENGTH;
    let formattedHistory = recentHistory.map(msg => {
        const role = msg.sender === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.text}`;
    }).join('\n\n');

    if (hasMoreHistory) {
        formattedHistory = `[Earlier conversation history exists...]\n\n${formattedHistory}`;
    }

    return formattedHistory;
}

// Helper function to extract key information from the conversation
function analyzeConversationContext(history) {
    const context = {
        topics: new Set(),
        recentFocus: '',
        questionCount: 0
    };

    // Analyze last few messages for context
    history.slice(-5).forEach(msg => {
        // Count questions from user
        if (msg.sender === 'user' && msg.text.includes('?')) {
            context.questionCount++;
        }

        // Extract potential topics (simple implementation)
        const words = msg.text.toLowerCase().split(' ');
        words.forEach(word => {
            if (word.length > 4) { // Consider words longer than 4 chars as potential topics
                context.topics.add(word);
            }
        });

        // Set most recent focus (from last user message)
        if (msg.sender === 'user') {
            context.recentFocus = msg.text;
        }
    });

    return context;
}

// API Route handler
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { prompt, history } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "Invalid prompt provided" });
        }

        // Ensure model is initialized
        await initializeModel();

        // Create a new context with larger size
        const context = await model.createContext({ contextSize: 2048 });
        
        // Format conversation history
        const conversationHistory = formatConversationHistory(history);
        
        // Analyze conversation context
        const conversationContext = analyzeConversationContext(history);
        
        // Add context-aware instructions to the prompt
        const contextNote = conversationContext.questionCount > 0 
            ? "\nNote: The user has asked several questions. Make sure to address any unanswered points."
            : "";

        // Combine system prompt, context notes, history, and current prompt
        const fullPrompt = `${SYSTEM_PROMPT}${contextNote}
${conversationHistory}

User: ${prompt}`;

        // Send the full prompt to the model
        const session = new LlamaChatSession({
            contextSequence: context.getSequence(),
        });
        const response = await session.prompt(fullPrompt);

        res.status(200).json({ response });
    } catch (error) {
        console.error("Error generating response:", error);
        res.status(500).json({ error: "Error generating response" });
    }
}
