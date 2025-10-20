#!/usr/bin/env node

/**
 * Haier Protocol Crypto Analysis Tool
 * 
 * This is the main entry point for the crypto analysis tool
 * that reverse engineers the Haier authentication algorithm.
 */

const CryptoTester = require('./crypto-tester');

async function main() {
  console.log('🔐 Haier Protocol Crypto Analysis Tool');
  console.log('=====================================\n');
  
  try {
    const tester = new CryptoTester();
    await tester.runAnalysis();
    
    // Export results
    tester.exportResults('crypto_analysis_results.json');
    
    console.log('\n✅ Analysis complete!');
    console.log('📁 Results saved to crypto_analysis_results.json');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
