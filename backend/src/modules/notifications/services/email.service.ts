import nodemailer, { Transporter } from 'nodemailer';
import { env } from '@config/env';
import { logger } from '@common/utils/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const mailer = getTransporter();
  if (!mailer) {
    logger.warn(`SMTP not configured — skipping email to ${input.to}: "${input.subject}"`);
    return;
  }

  try {
    await mailer.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  } catch (err) {
    logger.error('Failed to send email', { err, to: input.to, subject: input.subject });
  }
}
