/**
 * Twilio ConversationRelay Voice Assistant
 * 
 * A voice assistant powered by Twilio's ConversationRelay for voice handling,
 * ElevenLabs for high-quality text-to-speech and OpenAI for AI conversation.
 * Optionally integrates with Twilio's Conversational Intelligence for call analytics.
 */

import Fastify from "fastify";
import fastifyWs from "@fastify/websocket";
import fastifyFormBody from "@fastify/formbody";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// Server Configuration
const PORT = process.env.PORT;
const DOMAIN = process.env.DOMAIN;
const WS_URL = `wss://${DOMAIN}/ws`;

// ElevenLabs Voice Configuration
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL;
const ELEVENLABS_SPEED = process.env.ELEVENLABS_SPEED;
const ELEVENLABS_STABILITY = process.env.ELEVENLABS_STABILITY;
const ELEVENLABS_SIMILARITY = process.env.ELEVENLABS_SIMILARITY;
const ELEVENLABS_VOICE = `${ELEVENLABS_VOICE_ID}-${ELEVENLABS_MODEL}-${ELEVENLABS_SPEED}_${ELEVENLABS_STABILITY}_${ELEVENLABS_SIMILARITY}`; // Combine all voice parameters into the format expected by Twilio
const ELEVENLABS_TEXT_NORMALIZATION = process.env.ELEVENLABS_TEXT_NORMALIZATION;

// Conversational Intelligence Configuration (optional)
const CONVERSATIONAL_INTELLIGENCE_SID = process.env.CONVERSATIONAL_INTELLIGENCE_SID;

// AI Assistant Configuration
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const WELCOME_GREETING = "Hi! I'm your AI voice assistant powered by Twilio's ConversationRelay, ElevenLabs and OpenAI. How can I help you?";
const SYSTEM_PROMPT = "You are a helpful voice assistant. Speak naturally, avoid emojis and special characters.";
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const USE_STREAMING = process.env.USE_STREAMING !== "false"; // Defaults to true unless explicitly set to "false"

// Session Management - Stores conversation history for each call session
const sessions = new Map();

// Initialize Fastify server with required plugins
const fastify = Fastify();
fastify.register(fastifyFormBody); // For parsing form data
fastify.register(fastifyWs); // For WebSocket support

/**
 * /twiml Endpoint
 * 
 * This endpoint returns TwiML (Twilio Markup Language) that instructs
 * Twilio to connect the call to our ConversationRelay WebSocket.
 * 
 * The ConversationRelay handles:
 * - Converting speech to text (STT)
 * - Sending text to our WebSocket
 * - Converting our responses to speech (TTS) via ElevenLabs
 * - Playing the speech back to the caller
 */
fastify.all("/twiml", async (request, reply) => {
  // Conditionally add intelligenceService attribute if configured
  const intelligenceAttr = CONVERSATIONAL_INTELLIGENCE_SID ? ` intelligenceService="${CONVERSATIONAL_INTELLIGENCE_SID}"` : "";
  reply.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <ConversationRelay url="${WS_URL}"
          ttsProvider="ElevenLabs"
          voice="${ELEVENLABS_VOICE}"
          elevenlabsTextNormalization="${ELEVENLABS_TEXT_NORMALIZATION}"
          welcomeGreeting="${WELCOME_GREETING}"
          ${intelligenceAttr}
        />
      </Connect>
    </Response>`);
});

/**
 * WebSocket Handler
 * 
 * This handles the real-time communication between Twilio's ConversationRelay
 * and our AI assistant. The WebSocket receives messages from Twilio and sends
 * back AI-generated responses.
 * 
 * Message Types:
 * - "setup": Initialize a new call session
 * - "prompt": Process user's spoken input and generate AI response  
 * - "interrupt": Handle when user interrupts the AI while speaking
 */
fastify.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (ws) => {
    ws.on("message", async (data) => {
      const message = JSON.parse(data);

      // Initialize new call session
      if (message.type === "setup") {
        ws.callSid = message.callSid;
        // Create new conversation with system prompt
        sessions.set(message.callSid, [{ role: "system", content: SYSTEM_PROMPT }]);
        console.log("Call setup:", message.callSid);
      }

      // Process user's voice input and generate AI response
      if (message.type === "prompt") {
        const conversation = sessions.get(ws.callSid);
        conversation.push({ role: "user", content: message.voicePrompt });
        console.log("User response:", message.voicePrompt);
        
        // Generate and send AI response (streaming or non-streaming)
        const response = await generateAIResponse(conversation, ws);
        conversation.push({ role: "assistant", content: response });
        console.log("AI response:", response);
      }

      // Handle interruptions (when user speaks while AI is talking)
      if(message.type == 'interrupt'){
        console.log("Call interrupted:", ws.callSid);
        // Handle interruption logic if needed
      }
    });

    // Clean up session when WebSocket closes
    ws.on("close", () => {
      console.log("WebSocket connection closed");
      sessions.delete(ws.callSid);
    });
  });
});

/**
 * AI Response Generator
 * 
 * Generates responses from OpenAI and sends them to the WebSocket.
 * Supports both streaming and non-streaming modes.
 * 
 * Streaming mode (default) sends each token/word as it's generated by OpenAI.
 * It creates a more natural and real-time conversation flow.
 * 
 * Non-streaming mode waits for complete response before sending,
 * sends entire response at once and is more predictable but less natural timing.
 * 
 * @param {Array} conversation - Array of message objects (system, user, assistant)
 * @param {WebSocket} ws - WebSocket connection to send responses through
 * @returns {string} - The complete AI response text
 */
async function generateAIResponse(conversation, ws) {
  if (USE_STREAMING) {
    // Create streaming completion request to OpenAI
    const stream = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: conversation,
      stream: true,
    });

    const responseTokens = [];
    
    // Process each chunk from the stream
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        ws.send(JSON.stringify({
          type: "text",
          token: content,
          last: false,
        }));
        responseTokens.push(content);
      }
    }

    // Send completion signal to indicate response is finished
    ws.send(JSON.stringify({
      type: "text",
      token: "",
      last: true,
    }));

    return responseTokens.join("");
  } else {
    
    // Generate complete response before sending
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: conversation,
    });
    
    const response = completion.choices[0].message.content;
    
    // Send entire response at once
    ws.send(JSON.stringify({
      type: "text",
      token: response,
      last: true,
    }));
    
    return response;
  }
}
/**
 * Start the Server
 * 
 * Initialize and start the Fastify server with proper error handling.
 * The server will listen on the specified port and be ready to handle:
 * - HTTP requests to /twiml endpoint
 * - WebSocket connections to /ws endpoint
 */
try {
  fastify.listen({ port: PORT });
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: wss://${DOMAIN}/ws`);
  console.log(`TwiML endpoint: https://${DOMAIN}/twiml`);
  console.log(`Voice: ${ELEVENLABS_VOICE}`);
  console.log(`AI Model: ${OPENAI_MODEL}`);
  console.log(`Streaming: ${USE_STREAMING ? 'Enabled' : 'Disabled'}`);
} catch (err) {
  console.error('Error starting server:', err);
  fastify.log.error(err);
  process.exit(1);
}