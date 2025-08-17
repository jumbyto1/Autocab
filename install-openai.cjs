const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔄 Installing OpenAI package...');

try {
  // Clean conflicting modules
  if (fs.existsSync('node_modules/drizzle-kit')) {
    console.log('🧹 Cleaning drizzle-kit...');
    fs.rmSync('node_modules/drizzle-kit', { recursive: true, force: true });
  }
  
  // Install OpenAI
  console.log('📦 Installing openai@4.70.0...');
  execSync('npm install openai@4.70.0 --no-audit --no-fund', { stdio: 'inherit' });
  
  console.log('✅ OpenAI package installed successfully!');
  
  // Verify installation
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.dependencies && packageJson.dependencies.openai) {
    console.log('✅ OpenAI verified in package.json');
  }
  
} catch (error) {
  console.error('❌ Error installing OpenAI:', error.message);
  process.exit(1);
}