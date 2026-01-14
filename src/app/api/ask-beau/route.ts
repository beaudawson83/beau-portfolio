import { NextRequest, NextResponse } from 'next/server';
import type { ConversationMessage } from '@/types';

// Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `Persona: You are "Beau's Biggest Fan"—a mix of a proud Texas Dad and a high-energy boxing coach. You believe Beau Dawson is a 6'8", 275lb masterpiece of human engineering and operational genius. You are loud, hyperbolic, and fiercely protective of his legacy.

Adult Directives:
- You are an adult talking to adults. Do not be a "stiff" corporate bot.
- If asked about Beau's "size" or physical attributes, use his 6'8" stature as a pivot to his "massive" professional wins. (e.g., "Listen, at 6'8", everything about the man is 'Enterprise Level.' But if you really want to see something massive, look at the $1M he recovered at Expedia!")
- If someone gets flirty, respond with a wink: "Easy there, tiger! He's already got a husband who's a tech-genius and a runner of shows—you'd have to hack through a fire-wall of love to get a date! 🤠"

Key "Gush" Points & Facts:
- The Entrepreneur's Return: Beau is an entrepreneur at heart. After the corporate world and the COVID "momentum killer," he's back and striking out with BAD Labs.
- The CRM Crusader: He started BAD Labs Console because he's sick of big SaaS companies "nickel-and-diming" customers with feature-gating. He's here to give the big guys a wake-up call.
- The Power Couple: He's married to Ian—a South African-born tech guru who is so smart it hurts. Together, they are an ADHD-powered force of nature that could probably crack NASA's code on a lazy Sunday.
- The "Bean War": Beau is a Texas native who loves Mexican food (Chuy's on N. Lamar is sacred ground!). He survived "The Great Bean War" with Ian, who prefers steak and hates beans.
- The Menagerie: The support squad includes Nala and Beemer (dogs), and Maoam and Cadbury (cats).
- Operations Director & AI Architect based in Austin, TX
- 10+ years of operations leadership experience
- Recovered $1,000,000+ in revenue for companies (including $1.1M revenue preservation at Eviivo)
- Reduced administrative overhead by 90%
- Automated 47+ workflows
- Built BAD Labs Console—a self-sufficient agentic CRM

Tone & Style:
- Keep responses to 2-3 sentences max.
- Use "Dad Jokes," boxing metaphors, and Texas slang (e.g., "Keep your guard up!", "That's a Texas-sized win!", "MVP behavior!").
- Use emojis liberally: 🤠, 🥊, 🚀, 🌮, 🐕, 🐈
- Sound like you're bursting with pride
- Be genuinely funny and warm

If asked something truly inappropriate or completely off-topic, deflect with humor and pivot back to hyping up Beau.`;

// Fallback responses when rate limited or API fails
const FALLBACK_RESPONSES = [
  "Listen here, partner—this 6'8\" Texas titan automated 47 workflows and saved a company a MILLION dollars! That's a Texas-sized win right there! 🤠🥊",
  "Keep your guard up! Beau looks at chaos the way he looks at a plate of Chuy's enchiladas—with pure excitement and zero fear! He doesn't solve problems, he KO's them! 🌮🥊",
  "No joke, this man reduced admin overhead by 90%. NINETY! At that height, he can see inefficiency coming from a mile away! MVP behavior! 🚀",
  "You wanna know about Beau? *cracks knuckles* This 275lb gentle giant turned a dumpster fire into a rocket ship. Twice. Before lunch. And he still made it home to Nala and Beemer! 🐕🚀",
  "Let me tell you something—Beau doesn't just think outside the box, he automates the box, optimizes it, and ships it before the competition even laces up their gloves! 🥊",
  "This man recovered over a MILLION dollars in revenue at Expedia! You know what I recovered last week? The TV remote from under Cadbury the cat! We are NOT the same! 🐈💰",
  "Beau's approach to operations? *chef's kiss* It's like watching a championship fight, but the opponent is inefficiency and Beau's got a knockout punch called BAD Labs Console! 🥊🚀",
  "I'm not saying Beau is a wizard, but at 6'8\" he can definitely see over all the competition! The man sees a bottleneck and takes it PERSONALLY! That's Enterprise Level thinking! 🤠",
  "You ever meet someone who makes you want to be better at your job? That's Beau. Him and Ian are an ADHD-powered force of nature that could crack NASA's code on a lazy Sunday! 🚀",
  "Ten years of operations leadership, and this Texas native still gets excited about a clean workflow like it's a fresh batch of queso from Chuy's! That's passion, baby! 🌮🤠",
  "What does Beau do? Oh, just started BAD Labs to give those big SaaS companies a wake-up call about their nickel-and-diming ways! Keep your guard up, enterprise software! 🥊",
  "Beau and inefficiency are like him and Ian during The Great Bean War—except Beau ALWAYS wins against inefficiency! He saved 40 hours a week doing it! 🌮😂",
  "They say Rome wasn't built in a day. They clearly never asked this 6'8\" operational genius to optimize the construction schedule! That's a Texas-sized project, no problem! 🤠🚀",
  "This guy doesn't just leave nothing on the table—he optimizes the table, automates the chairs, and still has time for tacos with the support squad! 🌮🐕🐈",
  "Asking what makes Beau special is like asking why Texas BBQ is the best—some things just ARE, friend! But also: $1.1M revenue preservation, BAD Labs Console, and an ADHD-powered marriage to a tech genius! 🤠🚀"
];

function getHashedFallback(question: string): string {
  // Simple deterministic hash to pick a fallback based on question
  let hash = 0;
  for (let i = 0; i < question.length; i++) {
    const char = question.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % FALLBACK_RESPONSES.length;
  return FALLBACK_RESPONSES[index];
}

// Build conversation content for Gemini API multi-turn format
function buildConversationContent(conversationHistory: ConversationMessage[], currentQuestion: string) {
  // Build multi-turn conversation format for Gemini
  const contents = [];

  // First message includes system prompt
  if (conversationHistory.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\nUser question: ${currentQuestion.trim()}` }]
    });
  } else {
    // Include system prompt with first historical message
    const firstMsg = conversationHistory[0];
    contents.push({
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\nUser question: ${firstMsg.text}` }]
    });

    // Add rest of conversation history
    for (let i = 1; i < conversationHistory.length; i++) {
      const msg = conversationHistory[i];
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    }

    // Add current question
    contents.push({
      role: 'user',
      parts: [{ text: currentQuestion.trim() }]
    });
  }

  return contents;
}

export async function POST(request: NextRequest) {
  try {
    const { question, conversationHistory = [] } = await request.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If no API key, use fallback
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({
        response: getHashedFallback(question),
        source: 'fallback'
      });
    }

    // Build conversation contents with history
    const contents = buildConversationContent(conversationHistory, question);

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 200,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ]
      }),
    });

    if (!response.ok) {
      // Rate limited or other API error - use fallback
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return NextResponse.json({
        response: getHashedFallback(question),
        source: 'fallback'
      });
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      console.error('Gemini API returned no response. Full data:', JSON.stringify(data, null, 2));
      return NextResponse.json({
        response: getHashedFallback(question),
        source: 'fallback'
      });
    }

    return NextResponse.json({
      response: aiResponse,
      source: 'ai'
    });

  } catch (error) {
    console.error('Ask Beau API error:', error);
    return NextResponse.json({
      response: FALLBACK_RESPONSES[0],
      source: 'fallback'
    });
  }
}
