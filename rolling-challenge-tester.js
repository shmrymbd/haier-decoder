#!/usr/bin/env node

/**
 * Haier Rolling Challenge Sequence Tester
 * Complete implementation of the rolling challenge authentication sequence
 */

const fs = require('fs');
const path = require('path');

class RollingChallengeTester {
    constructor() {
        this.challenges = [];
        this.responses = [];
        this.loadCapturedData();
    }

    loadCapturedData() {
        console.log('🔍 Loading captured rolling challenge data...');
        
        // Load challenges from startupModem.txt
        const modemData = fs.readFileSync('startupModem.txt', 'utf8');
        const machineData = fs.readFileSync('startupMachine.txt', 'utf8');
        
        // Extract challenges (from modem)
        const challengeLines = modemData.split('\n').filter(line => 
            line.includes('10 02 00 01') && line.startsWith('ff ff 25 40')
        );
        
        // Extract responses (from machine)
        const responseLines = machineData.split('\n').filter(line => 
            line.includes('10 02 00 01') && line.startsWith('ff ff 25 40')
        );
        
        console.log(`📊 Found ${challengeLines.length} challenges and ${responseLines.length} responses`);
        
        // Parse challenges
        challengeLines.forEach((line, index) => {
            const challenge = this.parseChallenge(line);
            if (challenge) {
                this.challenges.push(challenge);
                console.log(`✅ Challenge ${index + 1}: ${challenge.ascii}`);
            }
        });
        
        // Parse responses
        responseLines.forEach((line, index) => {
            const response = this.parseResponse(line);
            if (response) {
                this.responses.push(response);
                console.log(`✅ Response ${index + 1}: ${response.ascii}`);
            }
        });
    }

    parseChallenge(line) {
        const parts = line.split(' ');
        if (parts.length < 37) return null;
        
        // Extract challenge bytes (positions 12-19)
        const challengeBytes = parts.slice(12, 20);
        const ascii = this.bytesToAscii(challengeBytes);
        
        return {
            raw: line,
            challengeBytes: challengeBytes,
            ascii: ascii,
            encryptedPayload: parts.slice(20, 37)
        };
    }

    parseResponse(line) {
        const parts = line.split(' ');
        if (parts.length < 37) return null;
        
        // Extract response bytes (positions 12-19)
        const responseBytes = parts.slice(12, 20);
        const ascii = this.bytesToAscii(responseBytes);
        
        return {
            raw: line,
            responseBytes: responseBytes,
            ascii: ascii,
            encryptedPayload: parts.slice(20, 37)
        };
    }

    bytesToAscii(bytes) {
        return bytes.map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
    }

    analyzePatterns() {
        console.log('\n🔍 Analyzing Rolling Challenge Patterns...');
        
        console.log('\n📋 Challenge Analysis:');
        this.challenges.forEach((challenge, index) => {
            console.log(`  ${index + 1}. ${challenge.ascii} (${challenge.challengeBytes.join(' ')})`);
        });
        
        console.log('\n📋 Response Analysis:');
        this.responses.forEach((response, index) => {
            console.log(`  ${index + 1}. ${response.ascii} (${response.responseBytes.join(' ')})`);
        });
        
        // Check for patterns
        console.log('\n🔍 Pattern Analysis:');
        console.log(`  Challenge Length: ${this.challenges[0]?.challengeBytes.length || 0} bytes`);
        console.log(`  Response Length: ${this.responses[0]?.responseBytes.length || 0} bytes`);
        console.log(`  Encrypted Payload Length: ${this.challenges[0]?.encryptedPayload.length || 0} bytes`);
        
        // Check for duplicates
        const uniqueChallenges = [...new Set(this.challenges.map(c => c.ascii))];
        const uniqueResponses = [...new Set(this.responses.map(r => r.ascii))];
        
        console.log(`  Unique Challenges: ${uniqueChallenges.length}`);
        console.log(`  Unique Responses: ${uniqueResponses.length}`);
        
        if (uniqueChallenges.length !== this.challenges.length) {
            console.log('  ⚠️  Duplicate challenges detected');
        }
        
        if (uniqueResponses.length !== this.responses.length) {
            console.log('  ⚠️  Duplicate responses detected');
        }
    }

    generateTestSequence() {
        console.log('\n🚀 Generating Complete Test Sequence...');
        
        const sequence = [
            'ff ff 0a 00 00 00 00 00 00 61 00 07 72',  // Session start
            'ff ff 08 40 00 00 00 00 00 70 b8 86 41',  // Controller ready
            'ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4',  // Handshake init
            'ff ff 08 40 00 00 00 00 00 73 bb 87 01',  // Handshake ACK
            'ff ff 19 40 00 00 00 00 00 11 00 f0 38 36 32 38 31 37 30 36 38 33 36 37 39 34 39',  // Device ID
            'ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1',  // Status query
        ];
        
        // Add authentication challenges
        this.challenges.forEach((challenge, index) => {
            sequence.push(challenge.raw);
            console.log(`  Added Challenge ${index + 1}: ${challenge.ascii}`);
        });
        
        return sequence;
    }

    createInteractiveCommands() {
        console.log('\n🎮 Interactive Commands for Testing:');
        
        const commands = [
            '// Session Initialization',
            'send ff ff 0a 00 00 00 00 00 00 61 00 07 72',
            'send ff ff 08 40 00 00 00 00 00 70 b8 86 41',
            'send ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4',
            '',
            '// Wait for handshake ACK',
            '',
            '// Device Identification',
            'send ff ff 19 40 00 00 00 00 00 11 00 f0 38 36 32 38 31 37 30 36 38 33 36 37 39 34 39',
            '',
            '// Status Query',
            'send ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1',
            '',
            '// Authentication Challenges',
        ];
        
        this.challenges.forEach((challenge, index) => {
            commands.push(`send ${challenge.raw}`);
            commands.push(`// Challenge ${index + 1}: ${challenge.ascii}`);
        });
        
        return commands;
    }

    run() {
        console.log('🔐 Haier Rolling Challenge Sequence Tester');
        console.log('==========================================\n');
        
        this.analyzePatterns();
        
        console.log('\n📝 Complete Test Sequence:');
        const sequence = this.generateTestSequence();
        sequence.forEach((cmd, index) => {
            console.log(`  ${index + 1}. ${cmd}`);
        });
        
        console.log('\n🎮 Interactive Commands:');
        const commands = this.createInteractiveCommands();
        commands.forEach(cmd => console.log(`  ${cmd}`));
        
        // Save test sequence to file
        const testFile = 'rolling-challenge-test-sequence.txt';
        fs.writeFileSync(testFile, sequence.join('\n'));
        console.log(`\n💾 Test sequence saved to: ${testFile}`);
        
        // Save interactive commands
        const interactiveFile = 'rolling-challenge-interactive.txt';
        fs.writeFileSync(interactiveFile, commands.join('\n'));
        console.log(`💾 Interactive commands saved to: ${interactiveFile}`);
        
        console.log('\n✅ Rolling Challenge Analysis Complete!');
        console.log('\n📋 Summary:');
        console.log(`  - ${this.challenges.length} challenges identified`);
        console.log(`  - ${this.responses.length} responses identified`);
        console.log(`  - Complete test sequence generated`);
        console.log(`  - Interactive commands ready`);
    }
}

// Run the tester
const tester = new RollingChallengeTester();
tester.run();
