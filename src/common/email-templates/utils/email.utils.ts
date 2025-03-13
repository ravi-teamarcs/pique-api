import * as fs from 'fs';
import * as path from 'path';

export function loadEmailTemplate(
  templateName: string,
  replacements: Record<string, string>,
): string {
  const templatePath = path.resolve(
    process.cwd(),
    'src',
    'common',
    'email-templates',
    `${templateName}`,
  );

  console.log('templatePath of the template ', templatePath);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  let template = fs.readFileSync(templatePath, 'utf-8');

  // Replace placeholders {{key}} with actual values
  for (const key in replacements) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(regex, replacements[key]);
  }

  return template;
}
