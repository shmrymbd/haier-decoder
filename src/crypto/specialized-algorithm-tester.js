#!/usr/bin/env node

/**
 * Specialized Algorithm Tester
 * 
 * Based on the advanced cryptographic analysis results, this module focuses on
 * the most promising approaches for cracking the Haier authentication algorithm.
 * 
 * Key insights from analysis:
 * - Challenge entropy: 19.58 (very high, near maximum)
 * - Response entropy: 14.67 (lower, indicating some structure)
 * - Linear correlation: 0.0432 (very weak, suggesting complex transformation)
 * - 29 unique XOR patterns (no simple XOR)
 */

const crypto = require('crypto');
const fs = require('fs');

class SpecializedAlgorithmTester {
    constructor() {
        this.sessions = [];
        this.deviceData = {
            imei: "862817068367949",
            serial: "0021800078EHD5108DUZ00000002",
            model: "CEAB9UQ00",
            firmware: "E++2.17"
        };
        this.results = {
            successfulMethods: [],
            promisingMethods: [],
            failedMethods: []
        };
    }

    /**
     * Load authentication sessions
     */
    loadSessions() {
        try {
            const data = JSON.parse(fs.readFileSync('test-vectors/enhanced-authentication-sessions.json', 'utf8'));
            this.sessions = data.sessions || [];
            console.log(`📊 Loaded ${this.sessions.length} authentication sessions for specialized testing`);
            return this.sessions.length;
        } catch (error) {
            console.error(`❌ Error loading sessions: ${error.message}`);
            return 0;
        }
    }

    /**
     * Test entropy-based key derivation
     * Since challenges have very high entropy (19.58), they might be used as entropy source
     */
    testEntropyBasedDerivation() {
        console.log('\n🎲 Testing Entropy-Based Key Derivation...');
        
        for (const session of this.sessions.slice(0, 10)) {
            try {
                const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                
                // Use challenge as entropy source for key derivation
                const entropy = crypto.createHash('sha256').update(challenge).digest();
                
                // Test various entropy-based derivations
                const methods = [
                    // Method 1: Challenge as seed for deterministic random generation
                    () => {
                        const seed = challenge.slice(0, 4).readUInt32BE(0);
                        const random = this.generateDeterministicRandom(seed, 8);
                        return random;
                    },
                    
                    // Method 2: Challenge entropy + device data
                    () => {
                        const combined = Buffer.concat([challenge, Buffer.from(this.deviceData.imei)]);
                        return crypto.createHash('sha256').update(combined).digest().slice(0, 8);
                    },
                    
                    // Method 3: Challenge as key for device data encryption
                    () => {
                        const cipher = crypto.createCipher('aes-128-ecb', challenge.slice(0, 16));
                        let encrypted = cipher.update(Buffer.from(this.deviceData.serial), null, null);
                        encrypted = Buffer.concat([encrypted, cipher.final()]);
                        return encrypted.slice(0, 8);
                    }
                ];
                
                for (let i = 0; i < methods.length; i++) {
                    const derivedKey = methods[i]();
                    const match = derivedKey.equals(expectedResponse.slice(0, 8));
                    
                    if (match) {
                        this.results.successfulMethods.push({
                            method: `Entropy-Based-${i + 1}`,
                            sessionId: session.id,
                            source: session.source,
                            match: true
                        });
                        console.log(`   ✅ Match found with Entropy-Based-${i + 1} for session ${session.id}`);
                    }
                }
            } catch (error) {
                // Continue with next session
            }
        }
    }

    /**
     * Test response entropy reduction patterns
     * Since response entropy (14.67) is lower than challenge entropy (19.58),
     * there might be a compression or reduction algorithm
     */
    testEntropyReductionPatterns() {
        console.log('\n📉 Testing Entropy Reduction Patterns...');
        
        for (const session of this.sessions.slice(0, 10)) {
            try {
                const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                
                // Test various entropy reduction methods
                const methods = [
                    // Method 1: Bit reduction (take every 2nd bit)
                    () => {
                        const reduced = Buffer.alloc(8);
                        for (let i = 0; i < 8; i++) {
                            reduced[i] = challenge[i] & 0x55; // Keep odd bits
                        }
                        return reduced;
                    },
                    
                    // Method 2: Modulo reduction
                    () => {
                        const reduced = Buffer.alloc(8);
                        for (let i = 0; i < 8; i++) {
                            reduced[i] = challenge[i] % 128; // Reduce to 7 bits
                        }
                        return reduced;
                    },
                    
                    // Method 3: Hash-based reduction
                    () => {
                        const hash = crypto.createHash('md5').update(challenge).digest();
                        return hash.slice(0, 8);
                    },
                    
                    // Method 4: XOR with device data then reduce
                    () => {
                        const deviceBytes = Buffer.from(this.deviceData.imei);
                        const xored = Buffer.alloc(8);
                        for (let i = 0; i < 8; i++) {
                            xored[i] = challenge[i] ^ deviceBytes[i % deviceBytes.length];
                        }
                        return crypto.createHash('sha256').update(xored).digest().slice(0, 8);
                    }
                ];
                
                for (let i = 0; i < methods.length; i++) {
                    const derivedKey = methods[i]();
                    const match = derivedKey.equals(expectedResponse.slice(0, 8));
                    
                    if (match) {
                        this.results.successfulMethods.push({
                            method: `Entropy-Reduction-${i + 1}`,
                            sessionId: session.id,
                            source: session.source,
                            match: true
                        });
                        console.log(`   ✅ Match found with Entropy-Reduction-${i + 1} for session ${session.id}`);
                    }
                }
            } catch (error) {
                // Continue with next session
            }
        }
    }

    /**
     * Test weak correlation exploitation
     * Linear correlation of 0.0432 suggests there might be a weak but exploitable pattern
     */
    testWeakCorrelationExploitation() {
        console.log('\n🔗 Testing Weak Correlation Exploitation...');
        
        // Analyze all sessions to find weak correlations
        const challenges = this.sessions.map(s => Buffer.from(s.challenge.replace(/\s+/g, ''), 'hex'));
        const responses = this.sessions.map(s => Buffer.from(s.response.replace(/\s+/g, ''), 'hex'));
        
        // Find position-wise correlations
        for (let pos = 0; pos < 8; pos++) {
            const challengeBytes = challenges.map(c => c[pos]);
            const responseBytes = responses.map(r => r[pos]);
            
            const correlation = this.calculateCorrelation(challengeBytes, responseBytes);
            
            if (Math.abs(correlation) > 0.1) { // Weak but potentially exploitable
                console.log(`   📊 Position ${pos} correlation: ${correlation.toFixed(4)}`);
                
                // Test linear transformation at this position
                this.testLinearTransformation(pos, challengeBytes, responseBytes);
            }
        }
    }

    /**
     * Test linear transformation at specific position
     */
    testLinearTransformation(position, challengeBytes, responseBytes) {
        // Try to find linear relationship: response = a * challenge + b
        const n = challengeBytes.length;
        const sumX = challengeBytes.reduce((a, b) => a + b, 0);
        const sumY = responseBytes.reduce((a, b) => a + b, 0);
        const sumXY = challengeBytes.reduce((sum, xi, i) => sum + xi * responseBytes[i], 0);
        const sumXX = challengeBytes.reduce((sum, xi) => sum + xi * xi, 0);
        
        const a = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const b = (sumY - a * sumX) / n;
        
        // Test if this linear relationship works for other sessions
        let matches = 0;
        for (let i = 0; i < challengeBytes.length; i++) {
            const predicted = Math.round(a * challengeBytes[i] + b) % 256;
            if (predicted === responseBytes[i]) {
                matches++;
            }
        }
        
        const accuracy = matches / challengeBytes.length;
        if (accuracy > 0.8) {
            this.results.promisingMethods.push({
                method: `Linear-Transform-Pos-${position}`,
                position,
                coefficient: a,
                intercept: b,
                accuracy,
                matches
            });
            console.log(`   ✅ Linear transformation at position ${position}: accuracy ${(accuracy * 100).toFixed(1)}%`);
        }
    }

    /**
     * Test complex XOR patterns
     * Since we have 29 unique XOR patterns, test more complex XOR operations
     */
    testComplexXORPatterns() {
        console.log('\n🔀 Testing Complex XOR Patterns...');
        
        for (const session of this.sessions.slice(0, 10)) {
            try {
                const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                
                // Test various complex XOR operations
                const methods = [
                    // Method 1: XOR with rotated challenge
                    () => {
                        const rotated = Buffer.from(challenge);
                        rotated[0] = challenge[7];
                        for (let i = 1; i < 8; i++) {
                            rotated[i] = challenge[i - 1];
                        }
                        return this.xorBuffers(challenge, rotated);
                    },
                    
                    // Method 2: XOR with challenge hash
                    () => {
                        const hash = crypto.createHash('sha256').update(challenge).digest();
                        return this.xorBuffers(challenge, hash.slice(0, 8));
                    },
                    
                    // Method 3: XOR with device data + challenge
                    () => {
                        const deviceData = Buffer.from(this.deviceData.imei + this.deviceData.serial);
                        const combined = Buffer.concat([challenge, deviceData]);
                        const hash = crypto.createHash('sha256').update(combined).digest();
                        return this.xorBuffers(challenge, hash.slice(0, 8));
                    },
                    
                    // Method 4: Multi-step XOR with intermediate transformations
                    () => {
                        let result = Buffer.from(challenge);
                        
                        // Step 1: XOR with device IMEI
                        const imei = Buffer.from(this.deviceData.imei);
                        for (let i = 0; i < 8; i++) {
                            result[i] ^= imei[i % imei.length];
                        }
                        
                        // Step 2: Rotate left by 3
                        const rotated = Buffer.from(result);
                        for (let i = 0; i < 8; i++) {
                            rotated[i] = result[(i + 3) % 8];
                        }
                        
                        // Step 3: XOR with original challenge
                        return this.xorBuffers(rotated, challenge);
                    }
                ];
                
                for (let i = 0; i < methods.length; i++) {
                    const derivedKey = methods[i]();
                    const match = derivedKey.equals(expectedResponse.slice(0, 8));
                    
                    if (match) {
                        this.results.successfulMethods.push({
                            method: `Complex-XOR-${i + 1}`,
                            sessionId: session.id,
                            source: session.source,
                            match: true
                        });
                        console.log(`   ✅ Match found with Complex-XOR-${i + 1} for session ${session.id}`);
                    }
                }
            } catch (error) {
                // Continue with next session
            }
        }
    }

    /**
     * Test session-specific key derivation
     * Since each session is unique, test if there's a session-specific component
     */
    testSessionSpecificDerivation() {
        console.log('\n🎯 Testing Session-Specific Key Derivation...');
        
        for (const session of this.sessions.slice(0, 10)) {
            try {
                const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                
                // Test various session-specific derivations
                const methods = [
                    // Method 1: Session ID as salt
                    () => {
                        const salt = Buffer.alloc(4);
                        salt.writeUInt32BE(session.id, 0);
                        return crypto.pbkdf2Sync(challenge, salt, 1000, 8, 'sha256');
                    },
                    
                    // Method 2: Timestamp-based derivation
                    () => {
                        const timestamp = Buffer.alloc(4);
                        timestamp.writeUInt32BE(parseInt(session.timestamp), 0);
                        const combined = Buffer.concat([challenge, timestamp]);
                        return crypto.createHash('sha256').update(combined).digest().slice(0, 8);
                    },
                    
                    // Method 3: Source-based derivation
                    () => {
                        const sourceHash = crypto.createHash('sha256').update(session.source).digest();
                        const combined = Buffer.concat([challenge, sourceHash.slice(0, 8)]);
                        return crypto.createHash('sha256').update(combined).digest().slice(0, 8);
                    },
                    
                    // Method 4: Line number-based derivation
                    () => {
                        const lineNumber = Buffer.alloc(4);
                        lineNumber.writeUInt32BE(session.lineNumber, 0);
                        const combined = Buffer.concat([challenge, lineNumber]);
                        return crypto.createHash('sha256').update(combined).digest().slice(0, 8);
                    }
                ];
                
                for (let i = 0; i < methods.length; i++) {
                    const derivedKey = methods[i]();
                    const match = derivedKey.equals(expectedResponse.slice(0, 8));
                    
                    if (match) {
                        this.results.successfulMethods.push({
                            method: `Session-Specific-${i + 1}`,
                            sessionId: session.id,
                            source: session.source,
                            match: true
                        });
                        console.log(`   ✅ Match found with Session-Specific-${i + 1} for session ${session.id}`);
                    }
                }
            } catch (error) {
                // Continue with next session
            }
        }
    }

    /**
     * Test advanced cryptographic primitives
     */
    testAdvancedCryptographicPrimitives() {
        console.log('\n🔐 Testing Advanced Cryptographic Primitives...');
        
        for (const session of this.sessions.slice(0, 5)) { // Test fewer sessions due to complexity
            try {
                const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                
                // Test various advanced primitives
                const methods = [
                    // Method 1: AES encryption with challenge as key
                    () => {
                        const key = challenge.slice(0, 16);
                        const plaintext = Buffer.from(this.deviceData.imei);
                        const cipher = crypto.createCipher('aes-128-ecb', key);
                        let encrypted = cipher.update(plaintext, null, null);
                        encrypted = Buffer.concat([encrypted, cipher.final()]);
                        return encrypted.slice(0, 8);
                    },
                    
                    // Method 2: ChaCha20 stream cipher
                    () => {
                        const key = challenge.slice(0, 32);
                        const nonce = Buffer.from(this.deviceData.serial).slice(0, 12);
                        const cipher = crypto.createCipher('chacha20', key, nonce);
                        let encrypted = cipher.update(Buffer.alloc(8), null, null);
                        encrypted = Buffer.concat([encrypted, cipher.final()]);
                        return encrypted.slice(0, 8);
                    },
                    
                    // Method 3: HMAC-based derivation
                    () => {
                        const key = challenge.slice(0, 16);
                        const data = Buffer.from(this.deviceData.imei + this.deviceData.serial);
                        return crypto.createHmac('sha256', key).update(data).digest().slice(0, 8);
                    }
                ];
                
                for (let i = 0; i < methods.length; i++) {
                    try {
                        const derivedKey = methods[i]();
                        const match = derivedKey.equals(expectedResponse.slice(0, 8));
                        
                        if (match) {
                            this.results.successfulMethods.push({
                                method: `Advanced-Crypto-${i + 1}`,
                                sessionId: session.id,
                                source: session.source,
                                match: true
                            });
                            console.log(`   ✅ Match found with Advanced-Crypto-${i + 1} for session ${session.id}`);
                        }
                    } catch (error) {
                        // Continue with next method
                    }
                }
            } catch (error) {
                // Continue with next session
            }
        }
    }

    /**
     * Utility methods
     */
    generateDeterministicRandom(seed, length) {
        const result = Buffer.alloc(length);
        let current = seed;
        
        for (let i = 0; i < length; i++) {
            // Simple linear congruential generator
            current = (current * 1664525 + 1013904223) % 4294967296;
            result[i] = current & 0xFF;
        }
        
        return result;
    }

    xorBuffers(a, b) {
        const result = Buffer.alloc(Math.min(a.length, b.length));
        for (let i = 0; i < result.length; i++) {
            result[i] = a[i] ^ b[i];
        }
        return result;
    }

    calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Run all specialized tests
     */
    async runSpecializedTests() {
        console.log('🎯 Specialized Algorithm Testing Starting...\n');
        
        const sessionCount = this.loadSessions();
        if (sessionCount === 0) {
            console.log('❌ No sessions loaded. Exiting.');
            return;
        }
        
        this.testEntropyBasedDerivation();
        this.testEntropyReductionPatterns();
        this.testWeakCorrelationExploitation();
        this.testComplexXORPatterns();
        this.testSessionSpecificDerivation();
        this.testAdvancedCryptographicPrimitives();
        
        // Save results
        this.saveResults();
        
        console.log('\n✅ Specialized algorithm testing complete!');
        this.printSummary();
    }

    /**
     * Save test results
     */
    saveResults() {
        const results = {
            testDate: new Date().toISOString(),
            sessionCount: this.sessions.length,
            deviceData: this.deviceData,
            results: this.results
        };
        
        fs.writeFileSync('specialized-algorithm-test-results.json', JSON.stringify(results, null, 2));
        console.log('\n💾 Results saved to specialized-algorithm-test-results.json');
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n📊 SPECIALIZED TESTING SUMMARY');
        console.log('==============================');
        
        console.log(`Sessions Tested: ${this.sessions.length}`);
        console.log(`Successful Methods: ${this.results.successfulMethods.length}`);
        console.log(`Promising Methods: ${this.results.promisingMethods.length}`);
        console.log(`Failed Methods: ${this.results.failedMethods.length}`);
        
        if (this.results.successfulMethods.length > 0) {
            console.log('\n🎯 SUCCESSFUL METHODS:');
            this.results.successfulMethods.forEach(method => {
                console.log(`   ✅ ${method.method} - Session ${method.sessionId} (${method.source})`);
            });
        }
        
        if (this.results.promisingMethods.length > 0) {
            console.log('\n🔍 PROMISING METHODS:');
            this.results.promisingMethods.forEach(method => {
                console.log(`   📊 ${method.method} - Accuracy: ${(method.accuracy * 100).toFixed(1)}%`);
            });
        }
        
        if (this.results.successfulMethods.length === 0 && this.results.promisingMethods.length === 0) {
            console.log('\n⚠️  No successful or promising methods found.');
            console.log('   The algorithm appears to be highly sophisticated and resistant to common attacks.');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new SpecializedAlgorithmTester();
    tester.runSpecializedTests().catch(console.error);
}

module.exports = SpecializedAlgorithmTester;
