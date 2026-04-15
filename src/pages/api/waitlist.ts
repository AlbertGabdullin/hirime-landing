import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const resend = new Resend(import.meta.env.RESEND_API_KEY);

  let email: string;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    email = body.email;
  } else {
    const form = await request.formData();
    email = form.get('email') as string;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Notify owner
    await resend.emails.send({
      from: `Hirime Waitlist <noreply@hirime.com>`,
      to: import.meta.env.NOTIFY_EMAIL,
      subject: 'New waitlist signup',
      html: `<p>New signup: <strong>${email}</strong></p>`,
    });

    // Welcome email to user
    await resend.emails.send({
      from: `Hirime <noreply@hirime.com>`,
      to: email,
      subject: "You're on the Hirime waitlist!",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h1 style="font-size:24px;font-weight:800;color:#111022;margin-bottom:16px;">
            You're on the list! 🎉
          </h1>
          <p style="color:#413B4D;line-height:1.65;margin-bottom:16px;">
            Thanks for joining the Hirime waitlist. We'll let you know as soon as we launch.
          </p>
          <p style="color:#9B8FAB;font-size:14px;">
            — The Hirime team
          </p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Resend error:', err);
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
