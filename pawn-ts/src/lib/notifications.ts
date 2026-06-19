import { prisma } from './prisma.js';

type TemplateVars = Record<string, string | number>;

function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export async function queueFromTemplate(
  templateKey: string,
  vars: TemplateVars & { recipient: string },
  opts: {
    branchId?: number;
    customerId?: bigint;
    loanId?: bigint;
    language?: 'en' | 'ta';
    channel?: string;
  } = {}
) {
  const template = await prisma.notificationTemplate.findUnique({ where: { key: templateKey } });
  if (!template) return null;

  const lang = opts.language ?? 'en';
  const body = renderTemplate(lang === 'ta' ? template.bodyTa : template.bodyEn, vars);
  const subject =
    template.channel === 'email'
      ? renderTemplate(
          (lang === 'ta' ? template.subjectTa : template.subjectEn) ?? '',
          vars
        )
      : null;

  return prisma.notification.create({
    data: {
      branchId: opts.branchId,
      customerId: opts.customerId,
      loanId: opts.loanId,
      channel: opts.channel ?? template.channel,
      language: lang,
      recipient: vars.recipient,
      subject,
      body,
      templateKey,
      status: 'pending',
    },
  });
}

/** Simulated send — marks notification as sent (real SMS/email provider in production) */
export async function processPendingNotifications(limit = 50) {
  const pending = await prisma.notification.findMany({
    where: { status: 'pending' },
    take: limit,
    orderBy: { createdOn: 'asc' },
  });

  for (const n of pending) {
    await prisma.notification.update({
      where: { id: n.id },
      data: { status: 'sent', sentOn: new Date() },
    });
  }

  return { processed: pending.length };
}
