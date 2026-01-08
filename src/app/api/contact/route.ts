import { NextRequest, NextResponse } from 'next/server';
import { ContactFormData, OBJECTIVE_LABELS } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { name, objective, message }: ContactFormData = await request.json();

    // Validate required fields
    if (!name || !objective || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const objectiveLabel = OBJECTIVE_LABELS[objective] || objective;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Portfolio Contact <onboarding@resend.dev>',
        to: ['beau.dawson83@gmail.com'],
        subject: `Portfolio Contact: ${objectiveLabel}`,
        html: `
          <div style="font-family: monospace; padding: 20px; background: #0a0a0a; color: #fff;">
            <h2 style="color: #7C3AED; margin-bottom: 20px;">> NEW_TRANSMISSION_RECEIVED</h2>
            <p><strong style="color: #94A3B8;">> FROM:</strong> ${name}</p>
            <p><strong style="color: #94A3B8;">> OBJECTIVE:</strong> ${objectiveLabel}</p>
            <p><strong style="color: #94A3B8;">> MESSAGE:</strong></p>
            <div style="background: #1F1F1F; padding: 16px; margin-top: 8px; white-space: pre-wrap;">${message}</div>
          </div>
        `,
        text: `New Portfolio Contact\n\nFrom: ${name}\nObjective: ${objectiveLabel}\n\nMessage:\n${message}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
