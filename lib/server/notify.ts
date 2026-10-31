import "server-only";

// Outbound SMS and email. Providers are chosen by env (SMS_PROVIDER, EMAIL_PROVIDER). Only "console" exists
// today: it prints the message to the server log so sign-in can be developed without a gateway, and it
// refuses to run in production. Add a real gateway (Bangladesh SMS, Resend/SES) as another case below.

export type Message = { channel: "sms" | "email"; to: string; subject?: string; text: string };

const g = globalThis as unknown as { __miskOutbox?: Message[] };
/** Development only: the last messages "sent", so tests can read an OTP or reset link. */
export const devOutbox: Message[] = (g.__miskOutbox ??= []);

async function deliver(m: Message) {
  const provider = process.env[m.channel === "sms" ? "SMS_PROVIDER" : "EMAIL_PROVIDER"];
  if (provider === "console") {
    if (process.env.NODE_ENV === "production") throw new Error(`The console ${m.channel} provider cannot be used in production`);
    console.log(`[${m.channel}] to ${m.to}${m.subject ? ` — ${m.subject}` : ""}\n${m.text}`);
    devOutbox.push(m);
    if (devOutbox.length > 50) devOutbox.shift();
    return;
  }
  throw new Error(`No ${m.channel} provider configured${provider ? ` (unknown "${provider}")` : ""}`);
}

export const sendSms = (to: string, text: string) => deliver({ channel: "sms", to, text });
export const sendEmail = (to: string, subject: string, text: string) => deliver({ channel: "email", to, subject, text });
