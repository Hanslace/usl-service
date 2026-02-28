import { sendEmail } from "./mailer";

export async function sendSms(_to: string, _message: string): Promise<void> {
  await sendEmail({
    to: 'sms_not_implemented@example.com', // this will be the user's email for now
    subject: "This should have been an SMS",
    text: _message,
  });
}