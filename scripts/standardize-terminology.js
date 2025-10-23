#!/usr/bin/env node

/**
 * Standardize AI Agent terminology across all specification documents
 * Converts "ai agent" to "AI Agent" for consistency
 */

const fs = require('fs').promises;
const path = require('path');

const SPEC_DIR = path.join(__dirname, '..', 'specs', '001-ai-agent-cli');

async function standardizeFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Replace "ai agent" with "AI Agent" (case-insensitive)
    const standardized = content.replace(/\bai agent\b/gi, 'AI Agent');
    
    if (content !== standardized) {
      await fs.writeFile(filePath, standardized, 'utf8');
      console.log(`✅ Standardized: ${path.relative(process.cwd(), filePath)}`);
      return true;
    } else {
      console.log(`⚪ No changes needed: ${path.relative(process.cwd(), filePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Standardizing AI Agent terminology...\n');
  
  const files = [
    'spec.md',
    'plan.md', 
    'tasks.md',
    'data-model.md',
    'quickstart.md',
    'research.md',
    'contracts/ai-agent-api.yaml',
    'checklists/requirements.md'
  ];
  
  let changedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(SPEC_DIR, file);
    const changed = await standardizeFile(filePath);
    if (changed) changedCount++;
  }
  
  console.log(`\n✨ Standardization complete: ${changedCount} files updated`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { standardizeFile };