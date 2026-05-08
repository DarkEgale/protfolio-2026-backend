export const verificationEmailTemplate = ({ appName, name, code, expiresMinutes }) => {
  const safeName = name || "there";

  return {
    subject: `${appName} email verification code`,
    text: [
      `Hi ${safeName},`,
      "",
      `Your ${appName} verification code is: ${code}`,
      `This code expires in ${expiresMinutes} minutes.`,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${appName} verification</title>
  </head>
  <body style="margin:0;background:#070707;font-family:Arial,Helvetica,sans-serif;color:#f4f4f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#070707;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#101010;border:1px solid rgba(255,255,255,0.12);border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 10px;">
                <p style="margin:0 0 8px;color:#22c55e;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Email Verification</p>
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2;">Confirm your account</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;color:#a1a1aa;font-size:15px;line-height:1.7;">
                Hi ${safeName}, use this code to verify your ${appName} account.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px;">
                <div style="display:inline-block;background:#22c55e;color:#000000;border-radius:8px;padding:16px 28px;font-size:32px;font-weight:900;letter-spacing:8px;">
                  ${code}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;color:#a1a1aa;font-size:14px;line-height:1.7;">
                This code expires in ${expiresMinutes} minutes. If you did not create this account, you can safely ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
};
