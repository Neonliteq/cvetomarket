import { Resend } from "resend";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error("X-Replit-Token not found for repl/depl");

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings?.settings?.api_key) throw new Error("Resend not connected");
  return {
    apiKey: connectionSettings.settings.api_key as string,
    fromEmail: connectionSettings.settings.from_email as string,
  };
}

// WARNING: Never cache this client. Tokens expire.
async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return { client: new Resend(apiKey), fromEmail };
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const from = fromEmail || "noreply@cveto.ru";
    await client.emails.send({
      from,
      to: toEmail,
      subject: "Сброс пароля — ЦветоМаркет",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #16a34a;">🌸 ЦветоМаркет</h2>
          <h3>Восстановление пароля</h3>
          <p>Вы запросили сброс пароля для вашего аккаунта. Нажмите кнопку ниже, чтобы установить новый пароль.</p>
          <p>Ссылка действительна <strong>1 час</strong>.</p>
          <p style="margin: 32px 0;">
            <a href="${resetLink}"
               style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 15px;">
              Сбросить пароль
            </a>
          </p>
          <p style="color: #6b7280; font-size: 13px;">
            Если вы не запрашивали сброс пароля — проигнорируйте это письмо. Ваш пароль останется прежним.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">ЦветоМаркет — маркетплейс цветочных магазинов</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("Resend email error:", err);
    return false;
  }
}
