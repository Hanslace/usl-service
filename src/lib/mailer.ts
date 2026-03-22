import nodemailer from 'nodemailer';
import { ENV } from '@/config';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  const port = ENV.MAIL_PORT;
    const secure = port === 465;


    const options: SMTPTransport.Options = {
    host: ENV.MAIL_HOST,
    port: port,
    secure: secure,
    auth: {
      user: ENV.MAIL_USER,
      pass: ENV.MAIL_PASS,
    },
  };
  transporter = nodemailer.createTransport(options);

  return transporter;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, text } = params;

  const tx = getTransporter();

  await tx.sendMail({
    from: ENV.MAIL_FROM,
    to,
    subject,
    text,
  });
}
