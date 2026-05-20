/** Shared HTML shell for nurture emails (readable on mobile, single CTA style). */
export function nurtureEmailHtml(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.55;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px 24px;">
        <tr><td>${inner}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#71717a;text-align:center;">CELPIP Practice Test · You received this because you have a free account.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function nurtureCta(href: string, label: string): string {
  return `<p style="margin:24px 0 8px;"><a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;">${label}</a></p>`;
}
