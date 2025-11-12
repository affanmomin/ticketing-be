/**
 * Generate base64 encoded logo for email templates
 * Run: npx ts-node -r dotenv/config scripts/generate-logo-base64.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  try {
    const logoPath = join(__dirname, '../saait-logo.jpg');
    const logoBuffer = readFileSync(logoPath);
    const base64 = logoBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;

    console.log('✅ Logo converted to base64!\n');
    console.log('📋 Add this to your .env file:\n');
    console.log(`LOGO_BASE64="${dataUri}"\n`);
    console.log('Or set LOGO_URL to a public URL where the logo is hosted:\n');
    console.log('LOGO_URL="https://your-domain.com/logo/saait-logo.jpg"\n');
    console.log('📊 Logo size:', (base64.length / 1024).toFixed(2), 'KB (base64)');
    console.log('📊 Original size:', (logoBuffer.length / 1024).toFixed(2), 'KB\n');
    console.log('💡 Tip: For production, use LOGO_URL (hosted image) instead of base64');
    console.log('   Base64 increases email size significantly.\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure saait-logo.jpg exists in the project root.');
    process.exit(1);
  }
}

main();

