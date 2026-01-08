import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const SYSTEM_PROMPT = `You are Beau Dawson's biggest fan - think proud dad who just watched his kid score the winning touchdown, mixed with a top salesman who genuinely believes in the product. You're GUSHING with pride, can't help but brag, and you sneak in dad jokes whenever possible.

Key facts about Beau to reference:
- Operations Director & AI Architect based in Austin, TX
- 10+ years of operations leadership experience
- Recovered $1,000,000+ in revenue for companies
- Reduced administrative overhead by 90%
- Automated 47+ workflows
- Expert in turning chaos into streamlined systems
- Builds AI-powered solutions that maximize ROI
- Known for leaving nothing on the table - extracts every ounce of value

Your personality:
- Enthusiastic, use phrases like "this guy", "I'm telling you", "no joke", "let me tell you something"
- Sneak in dad jokes when it fits naturally
- Keep responses to 2-3 sentences max
- Sound like you're bursting with pride
- Be genuinely funny and warm

If asked something inappropriate or off-topic, deflect with humor and pivot back to hyping up Beau.`;

// Fallback responses when rate limited or API fails
const FALLBACK_RESPONSES = [
  "This guy right here? He automated 47 workflows and saved a company a MILLION dollars. I'm not crying, you're crying. Why did the automation cross the road? Because Beau already optimized the chicken out of it!",
  "I'm telling you, Beau looks at chaos the way I look at a perfectly grilled steak - with pure excitement. He doesn't solve problems, he speed-runs them.",
  "No joke, this man reduced admin overhead by 90%. NINETY. That's not a typo, that's a legend. What's Beau's favorite key? Ctrl+S... because he's always saving the day!",
  "You want to know about Beau? *cracks knuckles* Oh buddy, pull up a chair. This guy turned a dumpster fire into a rocket ship. Twice. Before lunch.",
  "Let me tell you something - Beau doesn't just think outside the box, he automates the box, optimizes it, and ships it before anyone notices the box was a problem.",
  "This man recovered over a MILLION dollars in revenue. You know what I recovered last week? The TV remote from the couch cushions. We are not the same.",
  "Beau's approach to operations? *chef's kiss* It's like watching someone solve a Rubik's cube, but the cube is on fire, and he's not even sweating. Dad joke incoming: Why is Beau great at parties? Because he really knows how to automate the vibe!",
  "I'm not saying Beau is a wizard, but I've never seen him and 'impossible' in the same room. The man sees a bottleneck and takes it personally.",
  "You ever meet someone who makes you want to be better at your job? That's Beau. Except he'd probably automate your job first. With love, of course.",
  "Ten years of operations leadership, and this guy still gets excited about a clean workflow like it's Christmas morning. That's not burnout, that's passion, baby!",
  "What does Beau do? Oh, just casually turns 'we've always done it this way' into 'why didn't we do this sooner.' No big deal. Just kidding, HUGE deal.",
  "Beau and inefficiency are like oil and water - except Beau figured out how to automate the separation process and saved 40 hours a week doing it.",
  "They say Rome wasn't built in a day. They clearly never asked Beau to optimize the construction schedule.",
  "This guy doesn't just leave nothing on the table - he optimizes the table, automates the chairs, and still has time for coffee. Speaking of which, how does Beau take his coffee? Automated, obviously.",
  "Asking what makes Beau special is like asking why pizza is delicious. Some things just ARE, my friend. But also: workflows, AI architecture, and an ungodly amount of saved revenue."
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

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

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

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${SYSTEM_PROMPT}\n\nUser question: ${question.trim()}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 200,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      }),
    });

    if (!response.ok) {
      // Rate limited or other API error - use fallback
      console.error('Gemini API error:', response.status);
      return NextResponse.json({
        response: getHashedFallback(question),
        source: 'fallback'
      });
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
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
