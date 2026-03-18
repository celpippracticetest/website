import type { ReminderEmailConfigInput, ReminderEmailStageContent } from "@/lib/reminder-email/config";

type RenderParams = {
  firstName: string;
  style: ReminderEmailConfigInput["style"];
  stage: ReminderEmailStageContent;
};

export function renderReminderEmailHtml({ firstName, style, stage }: RenderParams): string {
  const safeName = firstName?.trim() || "there";
  const title = stage.title.replace("{{name}}", safeName);

  return `
    <div style="margin: 0; padding: 24px 12px; background: ${style.pageBackgroundColor}; font-family: Arial, sans-serif; line-height: 1.6; color: ${style.headingColor};">
      <div style="max-width: 640px; margin: 0 auto; background: ${style.cardBackgroundColor}; border: 1px solid ${style.cardBorderColor}; border-radius: 16px; overflow: hidden;">
        <div style="padding: 16px 24px 8px; text-align: center;">
          <img src="${style.logoUrl}" alt="${style.brandLabel}" style="max-width: 180px; width: 100%; height: auto;" />
        </div>
        <div style="background: linear-gradient(90deg, ${style.headerGradientFrom} 0%, ${style.headerGradientTo} 100%); padding: 18px 24px;">
          <p style="margin: 0; color: ${style.buttonTextColor}; font-size: 13px; letter-spacing: 0.2px; font-weight: 700;">${style.brandLabel}</p>
        </div>
        <div style="padding: 24px;">
          <h2 style="margin: 0 0 12px; color: ${style.headingColor}; font-size: 24px; line-height: 1.3;">${title}</h2>
          <div style="color: ${style.bodyTextColor};">
            ${stage.bodyHtml}
          </div>
          <p style="margin: 18px 0 0;">
            <a href="${stage.ctaHref}" style="display: inline-block; background: ${style.buttonBackgroundColor}; color: ${style.buttonTextColor}; text-decoration: none; padding: 11px 18px; border-radius: 9999px; font-weight: 700; font-size: 14px;">
              ${stage.ctaLabel}
            </a>
          </p>
        </div>
      </div>
    </div>
  `;
}

