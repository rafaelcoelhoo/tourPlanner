import { env } from "./env";
import type { Lang } from "./i18n";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

const send = async (mail: Mail, log: { info: (m: string) => void; error: (m: string) => void }): Promise<void> => {
  if (env.MAIL_TRANSPORT === "console") {
    console.log(`\n[email -> ${mail.to}] ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text }),
  });
  if (!res.ok) log.error(`Falha ao enviar email (${res.status}): ${await res.text().catch(() => "")}`);
};

const COPY: Record<Lang, (name: string, link: string) => Omit<Mail, "to">> = {
  pt: (name, link) => ({
    subject: "Redefinir a palavra-passe",
    text: `Olá, ${name}.\n\nPediu para redefinir a palavra-passe. Abra o link (válido 1 hora) para escolher uma nova:\n${link}\n\nSe não foi você, ignore este email.`,
  }),
  en: (name, link) => ({
    subject: "Reset your password",
    text: `Hello, ${name}.\n\nYou asked to reset your password. Open this link (valid for 1 hour) to choose a new one:\n${link}\n\nIf this wasn't you, ignore this email.`,
  }),
  es: (name, link) => ({
    subject: "Restablecer la contraseña",
    text: `Hola, ${name}.\n\nHas pedido restablecer tu contraseña. Abre este enlace (válido 1 hora) para elegir una nueva:\n${link}\n\nSi no has sido tú, ignora este correo.`,
  }),
};

export const sendPasswordReset = (to: string, name: string, link: string, lang: Lang, log: Parameters<typeof send>[1]): Promise<void> =>
  send({ to, ...COPY[lang](name, link) }, log);
