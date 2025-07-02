import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import MarkdownIt from 'markdown-it';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

// Paths
const legalDir = join(__dirname, '../src/legal');
const outputDir = join(__dirname, '../src/assets/legal');

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

// Convert Terms and Conditions
try {
  const termsMarkdown = readFileSync(join(legalDir, 'terms-and-conditions.md'), 'utf8');
  const termsHtml = md.render(termsMarkdown);
  
  // Wrap in a styled container with better spacing and typography
  const styledTermsHtml = `
<div class="legal-document prose prose-sm dark:prose-invert max-w-none px-1">
  <style>
    .legal-document h1 { 
      font-size: 1.5rem; 
      font-weight: 700; 
      margin-bottom: 1rem; 
      color: #1f2937; 
      border-bottom: 2px solid #e5e7eb; 
      padding-bottom: 0.5rem; 
    }
    .dark .legal-document h1 { color: #f9fafb; border-color: #374151; }
    .legal-document h2 { 
      font-size: 1.25rem; 
      font-weight: 600; 
      margin-top: 2rem; 
      margin-bottom: 1rem; 
      color: #374151; 
    }
    .dark .legal-document h2 { color: #e5e7eb; }
    .legal-document h3 { 
      font-size: 1.125rem; 
      font-weight: 600; 
      margin-top: 1.5rem; 
      margin-bottom: 0.75rem; 
      color: #4b5563; 
    }
    .dark .legal-document h3 { color: #d1d5db; }
    .legal-document p { 
      margin-bottom: 1rem; 
      line-height: 1.6; 
      color: #374151; 
    }
    .dark .legal-document p { color: #d1d5db; }
    .legal-document ul, .legal-document ol { 
      margin-bottom: 1rem; 
      padding-left: 1.5rem; 
    }
    .legal-document li { 
      margin-bottom: 0.5rem; 
      line-height: 1.6; 
      color: #374151; 
    }
    .dark .legal-document li { color: #d1d5db; }
    .legal-document strong { 
      font-weight: 600; 
      color: #1f2937; 
    }
    .dark .legal-document strong { color: #f3f4f6; }
    .legal-document em { 
      font-style: italic; 
      color: #6b7280; 
    }
    .dark .legal-document em { color: #9ca3af; }
  </style>
  ${termsHtml}
</div>
  `.trim();
  
  // Export as JS module
  const termsJs = `export const termsAndConditionsHtml = \`${styledTermsHtml.replace(/`/g, '\\`')}\`;`;
  writeFileSync(join(outputDir, 'terms-and-conditions.js'), termsJs);
  
  console.log('✅ Terms and Conditions converted to HTML');
} catch (error) {
  console.error('❌ Error converting Terms and Conditions:', error.message);
}

// Convert Privacy Policy
try {
  const privacyMarkdown = readFileSync(join(legalDir, 'privacy-policy.md'), 'utf8');
  const privacyHtml = md.render(privacyMarkdown);
  
  // Wrap in a styled container with better spacing and typography
  const styledPrivacyHtml = `
<div class="legal-document prose prose-sm dark:prose-invert max-w-none px-1">
  <style>
    .legal-document h1 { 
      font-size: 1.5rem; 
      font-weight: 700; 
      margin-bottom: 1rem; 
      color: #1f2937; 
      border-bottom: 2px solid #e5e7eb; 
      padding-bottom: 0.5rem; 
    }
    .dark .legal-document h1 { color: #f9fafb; border-color: #374151; }
    .legal-document h2 { 
      font-size: 1.25rem; 
      font-weight: 600; 
      margin-top: 2rem; 
      margin-bottom: 1rem; 
      color: #374151; 
    }
    .dark .legal-document h2 { color: #e5e7eb; }
    .legal-document h3 { 
      font-size: 1.125rem; 
      font-weight: 600; 
      margin-top: 1.5rem; 
      margin-bottom: 0.75rem; 
      color: #4b5563; 
    }
    .dark .legal-document h3 { color: #d1d5db; }
    .legal-document p { 
      margin-bottom: 1rem; 
      line-height: 1.6; 
      color: #374151; 
    }
    .dark .legal-document p { color: #d1d5db; }
    .legal-document ul, .legal-document ol { 
      margin-bottom: 1rem; 
      padding-left: 1.5rem; 
    }
    .legal-document li { 
      margin-bottom: 0.5rem; 
      line-height: 1.6; 
      color: #374151; 
    }
    .dark .legal-document li { color: #d1d5db; }
    .legal-document strong { 
      font-weight: 600; 
      color: #1f2937; 
    }
    .dark .legal-document strong { color: #f3f4f6; }
    .legal-document em { 
      font-style: italic; 
      color: #6b7280; 
    }
    .dark .legal-document em { color: #9ca3af; }
  </style>
  ${privacyHtml}
</div>
  `.trim();
  
  // Export as JS module
  const privacyJs = `export const privacyPolicyHtml = \`${styledPrivacyHtml.replace(/`/g, '\\`')}\`;`;
  writeFileSync(join(outputDir, 'privacy-policy.js'), privacyJs);
  
  console.log('✅ Privacy Policy converted to HTML');
} catch (error) {
  console.error('❌ Error converting Privacy Policy:', error.message);
}

// Create index file that exports both
const indexJs = `
export { termsAndConditionsHtml } from './terms-and-conditions.js';
export { privacyPolicyHtml } from './privacy-policy.js';
`;

writeFileSync(join(outputDir, 'index.js'), indexJs);
console.log('✅ Legal documents index created');
console.log('🎉 Legal document conversion complete!');