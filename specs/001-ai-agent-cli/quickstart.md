# Quickstart Guide: AI Agent CLI Integration

**Feature**: AI Agent CLI Integration  
**Date**: 2024-12-23  
**Phase**: 1 - Design & Contracts

## Overview

The AI Agent CLI Integration adds intelligent assistance to the Haier Protocol Decoder CLI, enabling natural language queries about protocol analysis, automated data processing, and contextual command suggestions.

## Prerequisites

- Node.js 14+ installed
- Haier Protocol Decoder CLI installed
- OpenAI API key (optional, for full AI functionality)
- Existing protocol knowledge base

## Installation

1. **Install dependencies**:
   ```bash
   npm install openai
   ```

2. **Set up environment variables**:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   export HAIER_AI_MODE="enabled"
   ```

3. **Verify installation**:
   ```bash
   node src/index.js --help
   ```

## Basic Usage

### 1. Interactive AI Mode

Start the CLI with AI Agent enabled:

```bash
node src/index.js chat --ai
```

**Example interaction**:
```
> What does command 0x60 do?
AI: Command 0x60 is the wash program command. It starts specific wash programs:
   - 0x60 0x01: Program 1 (Standard wash)
   - 0x60 0x02: Program 2 (Quick wash)
   - 0x60 0x03: Program 3 (Heavy duty)
   - 0x60 0x04: Program 4 (Delicate)

> Why is this packet failing CRC validation?
AI: Let me analyze the packet. The CRC validation failure could be due to:
   1. Corrupted data transmission
   2. Incorrect CRC algorithm
   3. Missing or extra bytes
   4. Timing issues in serial communication
   
   Suggested commands to troubleshoot:
   - `analyze packet` - Detailed packet analysis
   - `test-crc` - Test CRC algorithms
   - `monitor --verbose` - Enable detailed logging
```

### 2. Automated Analysis Mode

Analyze captured protocol data automatically:

```bash
node src/index.js analyze --ai startupMachine.txt
```

**Example output**:
```
AI Analysis Report:
==================

Pattern Analysis:
- Detected 15 authentication sessions
- Found 3 unique challenge patterns
- Identified 2 potential security anomalies

Command Analysis:
- Most frequent command: 0x60 (wash programs)
- Average response time: 2.3 seconds
- CRC validation success rate: 98.5%

Recommendations:
- Investigate the 2 security anomalies
- Consider implementing retry logic for failed CRC
- Monitor authentication session patterns
```

### 3. Command Suggestions

Get intelligent command suggestions:

```bash
node src/index.js --ai-suggest
```

**Example suggestions**:
```
Based on your current context, I suggest:

1. `monitor /dev/ttyUSB0 --verbose`
   - Start real-time monitoring with detailed output
   - Good for understanding live protocol behavior

2. `analyze rolling.txt --pattern`
   - Analyze rolling code patterns in captured data
   - Helps identify authentication algorithms

3. `replay /dev/ttyUSB0 startupMachine.txt`
   - Replay captured sequence to test device response
   - Useful for validating protocol understanding
```

## Advanced Features

### 1. Batch Analysis

Process multiple files with AI assistance:

```bash
node src/index.js analyze --ai --batch *.txt
```

### 2. Custom AI Prompts

Use custom prompts for specific analysis:

```bash
node src/index.js analyze --ai --prompt "Find authentication patterns" data.txt
```

### 3. Session Management

Manage AI conversation sessions:

```bash
# Start new session
node src/index.js chat --ai --new-session

# Resume existing session
node src/index.js chat --ai --session-id abc123

# List active sessions
node src/index.js chat --ai --list-sessions
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: OpenAI API key for AI functionality
- `HAIER_AI_MODE`: Enable/disable AI features (enabled/disabled)
- `HAIER_AI_MODEL`: AI model to use (gpt-3.5-turbo, gpt-4)
- `HAIER_AI_TIMEOUT`: AI response timeout in seconds (default: 30)

### Configuration File

Create `~/.haier-ai/config.json`:

```json
{
  "ai": {
    "enabled": true,
    "model": "gpt-3.5-turbo",
    "timeout": 30,
    "maxHistory": 1000
  },
  "security": {
    "sanitizeData": true,
    "logLevel": "info"
  }
}
```

## Troubleshooting

### Common Issues

1. **AI not responding**:
   - Check API key configuration
   - Verify internet connection
   - Check timeout settings

2. **Inaccurate responses**:
   - Ensure protocol knowledge base is up to date
   - Check context data quality
   - Verify query clarity

3. **Performance issues**:
   - Reduce conversation history size
   - Use faster AI model
   - Enable caching

### Debug Mode

Enable debug logging:

```bash
node src/index.js chat --ai --debug
```

### Offline Mode

Use AI features without internet:

```bash
node src/index.js chat --ai --offline
```

## Security Considerations

- Sensitive protocol data is sanitized before AI processing
- API keys are stored securely
- Conversation history is encrypted at rest
- No sensitive data in logs

## Next Steps

1. **Explore protocol analysis**: Use AI to understand complex protocol behaviors
2. **Automate analysis**: Set up batch processing for large datasets
3. **Customize knowledge base**: Add domain-specific protocol knowledge
4. **Integrate with workflows**: Use AI suggestions in your analysis pipeline

## Support

- **Documentation**: See `README.md` for detailed documentation
- **Issues**: Report bugs and feature requests on GitHub
- **Community**: Join the Haier Protocol Decoder community discussions