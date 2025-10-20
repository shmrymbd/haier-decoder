# Test Vectors Documentation

## Authentication Sessions

This directory contains test vectors for the Haier rolling code algorithm.

### Files

- `authentication-sessions.json` - Original 3 authentication sessions
- `binding-auth-sessions.json` - Binding data authentication sessions
- `combined-analysis-results.json` - Combined analysis results
- `key-derivation-results.json` - Key derivation test results
- `crc-analysis-results.json` - CRC analysis results
- `transformation-analysis-results.json` - Transformation analysis results
- `algorithm-test-results.json` - Algorithm test results

### Usage

```javascript
const fs = require('fs');
const sessions = JSON.parse(fs.readFileSync('authentication-sessions.json', 'utf8'));
```

### Validation

Run the algorithm test:
```bash
node src/crypto/rolling-code-implementation.js
```
