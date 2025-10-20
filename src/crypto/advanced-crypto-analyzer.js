#!/usr/bin/env node

/**
 * Advanced Cryptographic Analyzer
 * 
 * This module performs sophisticated cryptographic analysis on the 35 authentication sessions
 * using advanced techniques including:
 * - Statistical analysis
 * - Frequency analysis
 * - Correlation analysis
 * - Advanced key derivation testing
 * - Machine learning approaches
 * - Cryptographic pattern recognition
 */

const crypto = require('crypto');
const fs = require('fs');
const HexUtils = require('../utils/hex-utils');

class AdvancedCryptoAnalyzer {
    constructor() {
        this.sessions = [];
        this.deviceData = {
            imei: "862817068367949",
            serial: "0021800078EHD5108DUZ00000002",
            model: "CEAB9UQ00",
            firmware: "E++2.17"
        };
        this.analysisResults = {
            statisticalAnalysis: {},
            frequencyAnalysis: {},
            correlationAnalysis: {},
            keyDerivationTests: {},
            patternRecognition: {},
            machineLearningInsights: {}
        };
    }

    /**
     * Load authentication sessions from enhanced test vectors
     */
    loadSessions() {
        try {
            const data = JSON.parse(fs.readFileSync('test-vectors/enhanced-authentication-sessions.json', 'utf8'));
            this.sessions = data.sessions || [];
            console.log(`📊 Loaded ${this.sessions.length} authentication sessions for analysis`);
            return this.sessions.length;
        } catch (error) {
            console.error(`❌ Error loading sessions: ${error.message}`);
            return 0;
        }
    }

    /**
     * Perform comprehensive statistical analysis
     */
    performStatisticalAnalysis() {
        console.log('\n📈 Performing Statistical Analysis...');
        
        const challenges = this.sessions.map(s => this.hexToBytes(s.challenge));
        const responses = this.sessions.map(s => this.hexToBytes(s.response));
        
        // Byte frequency analysis
        const challengeFreq = this.calculateByteFrequency(challenges);
        const responseFreq = this.calculateByteFrequency(responses);
        
        // Entropy analysis
        const challengeEntropy = this.calculateEntropy(challenges);
        const responseEntropy = this.calculateEntropy(responses);
        
        // Statistical measures
        const challengeStats = this.calculateStatistics(challenges);
        const responseStats = this.calculateStatistics(responses);
        
        this.analysisResults.statisticalAnalysis = {
            challengeFrequency: challengeFreq,
            responseFrequency: responseFreq,
            challengeEntropy: challengeEntropy,
            responseEntropy: responseEntropy,
            challengeStatistics: challengeStats,
            responseStatistics: responseStats,
            sessionCount: this.sessions.length
        };
        
        console.log(`   ✅ Challenge entropy: ${challengeEntropy.toFixed(4)}`);
        console.log(`   ✅ Response entropy: ${responseEntropy.toFixed(4)}`);
        console.log(`   ✅ Challenge mean: ${challengeStats.mean.toFixed(2)}`);
        console.log(`   ✅ Response mean: ${responseStats.mean.toFixed(2)}`);
    }

    /**
     * Perform frequency analysis on byte patterns
     */
    performFrequencyAnalysis() {
        console.log('\n🔍 Performing Frequency Analysis...');
        
        const challenges = this.sessions.map(s => this.hexToBytes(s.challenge));
        const responses = this.sessions.map(s => this.hexToBytes(s.response));
        
        // N-gram analysis (2-grams, 3-grams, 4-grams)
        const challenge2grams = this.calculateNGrams(challenges, 2);
        const challenge3grams = this.calculateNGrams(challenges, 3);
        const response2grams = this.calculateNGrams(responses, 2);
        const response3grams = this.calculateNGrams(responses, 3);
        
        // Position-based analysis
        const positionAnalysis = this.analyzeBytePositions(challenges, responses);
        
        // Pattern detection
        const patterns = this.detectPatterns(challenges, responses);
        
        this.analysisResults.frequencyAnalysis = {
            challenge2grams: challenge2grams,
            challenge3grams: challenge3grams,
            response2grams: response2grams,
            response3grams: response3grams,
            positionAnalysis: positionAnalysis,
            patterns: patterns
        };
        
        console.log(`   ✅ Found ${Object.keys(challenge2grams).length} unique 2-grams in challenges`);
        console.log(`   ✅ Found ${Object.keys(response2grams).length} unique 2-grams in responses`);
        console.log(`   ✅ Detected ${patterns.length} potential patterns`);
    }

    /**
     * Perform correlation analysis between challenges and responses
     */
    performCorrelationAnalysis() {
        console.log('\n🔗 Performing Correlation Analysis...');
        
        const challenges = this.sessions.map(s => this.hexToBytes(s.challenge));
        const responses = this.sessions.map(s => this.hexToBytes(s.response));
        
        // Cross-correlation analysis
        const crossCorrelation = this.calculateCrossCorrelation(challenges, responses);
        
        // Position-wise correlation
        const positionCorrelation = this.calculatePositionCorrelation(challenges, responses);
        
        // XOR pattern analysis
        const xorPatterns = this.analyzeXORPatterns(challenges, responses);
        
        // Linear correlation
        const linearCorrelation = this.calculateLinearCorrelation(challenges, responses);
        
        this.analysisResults.correlationAnalysis = {
            crossCorrelation: crossCorrelation,
            positionCorrelation: positionCorrelation,
            xorPatterns: xorPatterns,
            linearCorrelation: linearCorrelation
        };
        
        console.log(`   ✅ Cross-correlation coefficient: ${crossCorrelation.coefficient.toFixed(4)}`);
        console.log(`   ✅ Linear correlation: ${linearCorrelation.coefficient.toFixed(4)}`);
        console.log(`   ✅ Unique XOR patterns: ${Object.keys(xorPatterns).length}`);
    }

    /**
     * Test advanced key derivation methods
     */
    performAdvancedKeyDerivationTests() {
        console.log('\n🔑 Performing Advanced Key Derivation Tests...');
        
        const results = {
            pbkdf2Tests: this.testPBKDF2Variations(),
            hkdfTests: this.testHKDFVariations(),
            scryptTests: this.testScryptVariations(),
            customDerivationTests: this.testCustomDerivationMethods(),
            multiFactorTests: this.testMultiFactorDerivation()
        };
        
        this.analysisResults.keyDerivationTests = results;
        
        console.log(`   ✅ PBKDF2 variations tested: ${results.pbkdf2Tests.length}`);
        console.log(`   ✅ HKDF variations tested: ${results.hkdfTests.length}`);
        console.log(`   ✅ Custom methods tested: ${results.customDerivationTests.length}`);
    }

    /**
     * Perform pattern recognition analysis
     */
    performPatternRecognition() {
        console.log('\n🎯 Performing Pattern Recognition Analysis...');
        
        const challenges = this.sessions.map(s => this.hexToBytes(s.challenge));
        const responses = this.sessions.map(s => this.hexToBytes(s.response));
        
        // Clustering analysis
        const clusters = this.performClustering(challenges, responses);
        
        // Sequence analysis
        const sequences = this.analyzeSequences(challenges, responses);
        
        // Transformation detection
        const transformations = this.detectTransformations(challenges, responses);
        
        // Machine learning insights
        const mlInsights = this.performMachineLearningAnalysis(challenges, responses);
        
        this.analysisResults.patternRecognition = {
            clusters: clusters,
            sequences: sequences,
            transformations: transformations,
            machineLearningInsights: mlInsights
        };
        
        console.log(`   ✅ Identified ${clusters.length} clusters`);
        console.log(`   ✅ Found ${sequences.length} sequence patterns`);
        console.log(`   ✅ Detected ${transformations.length} transformation candidates`);
    }

    /**
     * Test PBKDF2 variations with different parameters
     */
    testPBKDF2Variations() {
        const results = [];
        const iterations = [1000, 10000, 100000, 1000000];
        const keyLengths = [8, 16, 32, 64];
        const salts = [
            this.deviceData.imei,
            this.deviceData.serial,
            this.deviceData.model,
            this.deviceData.firmware,
            Buffer.concat([Buffer.from(this.deviceData.imei), Buffer.from(this.deviceData.serial)])
        ];
        
        for (const iteration of iterations) {
            for (const keyLength of keyLengths) {
                for (const salt of salts) {
                    const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt);
                    
                    for (const session of this.sessions.slice(0, 5)) { // Test on first 5 sessions
                        try {
                            const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                            const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                            
                            const derivedKey = crypto.pbkdf2Sync(challenge, saltBuffer, iteration, keyLength, 'sha256');
                            const responseSlice = expectedResponse.slice(0, Math.min(keyLength, 8));
                            
                            const match = derivedKey.slice(0, responseSlice.length).equals(responseSlice);
                            
                            if (match) {
                                results.push({
                                    method: 'PBKDF2',
                                    iterations,
                                    keyLength,
                                    salt: saltBuffer.toString('hex'),
                                    sessionId: session.id,
                                    match: true
                                });
                            }
                        } catch (error) {
                            // Continue with next variation
                        }
                    }
                }
            }
        }
        
        return results;
    }

    /**
     * Test HKDF variations
     */
    testHKDFVariations() {
        const results = [];
        const keyLengths = [8, 16, 32];
        const infos = [
            'haier-auth',
            'rolling-code',
            'challenge-response',
            this.deviceData.imei,
            this.deviceData.serial
        ];
        
        for (const keyLength of keyLengths) {
            for (const info of infos) {
                for (const session of this.sessions.slice(0, 5)) {
                    try {
                        const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                        const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                        
                        // Use challenge as input key material
                        const derivedKey = crypto.hkdfSync('sha256', challenge, Buffer.from(this.deviceData.imei), Buffer.from(info), keyLength);
                        const responseSlice = expectedResponse.slice(0, Math.min(keyLength, 8));
                        
                        const match = derivedKey.slice(0, responseSlice.length).equals(responseSlice);
                        
                        if (match) {
                            results.push({
                                method: 'HKDF',
                                keyLength,
                                info,
                                sessionId: session.id,
                                match: true
                            });
                        }
                    } catch (error) {
                        // Continue with next variation
                    }
                }
            }
        }
        
        return results;
    }

    /**
     * Test Scrypt variations
     */
    testScryptVariations() {
        const results = [];
        const params = [
            { N: 16384, r: 8, p: 1 },
            { N: 32768, r: 8, p: 1 },
            { N: 65536, r: 8, p: 1 }
        ];
        
        for (const param of params) {
            for (const session of this.sessions.slice(0, 3)) { // Test on first 3 sessions (scrypt is slow)
                try {
                    const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                    const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                    const salt = Buffer.from(this.deviceData.imei);
                    
                    const derivedKey = crypto.scryptSync(challenge, salt, 8, param);
                    const responseSlice = expectedResponse.slice(0, 8);
                    
                    const match = derivedKey.equals(responseSlice);
                    
                    if (match) {
                        results.push({
                            method: 'Scrypt',
                            params: param,
                            sessionId: session.id,
                            match: true
                        });
                    }
                } catch (error) {
                    // Continue with next variation
                }
            }
        }
        
        return results;
    }

    /**
     * Test custom derivation methods
     */
    testCustomDerivationMethods() {
        const results = [];
        
        // Test various combinations of device data
        const combinations = [
            this.deviceData.imei + this.deviceData.serial,
            this.deviceData.model + this.deviceData.firmware,
            this.deviceData.imei + this.deviceData.model,
            this.deviceData.serial + this.deviceData.firmware
        ];
        
        for (const combination of combinations) {
            for (const session of this.sessions.slice(0, 5)) {
                try {
                    const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                    const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                    
                    // Test simple hash-based derivation
                    const hash = crypto.createHash('sha256');
                    hash.update(challenge);
                    hash.update(Buffer.from(combination));
                    const derivedKey = hash.digest().slice(0, 8);
                    
                    const match = derivedKey.equals(expectedResponse.slice(0, 8));
                    
                    if (match) {
                        results.push({
                            method: 'Custom-Hash',
                            combination,
                            sessionId: session.id,
                            match: true
                        });
                    }
                } catch (error) {
                    // Continue with next variation
                }
            }
        }
        
        return results;
    }

    /**
     * Test multi-factor derivation methods
     */
    testMultiFactorDerivation() {
        const results = [];
        
        for (const session of this.sessions.slice(0, 3)) {
            try {
                const challenge = Buffer.from(session.challenge.replace(/\s+/g, ''), 'hex');
                const expectedResponse = Buffer.from(session.response.replace(/\s+/g, ''), 'hex');
                
                // Test timestamp-based derivation
                const timestamp = parseInt(session.timestamp);
                const timestampBuffer = Buffer.alloc(4);
                timestampBuffer.writeUInt32BE(timestamp, 0);
                
                const hash = crypto.createHash('sha256');
                hash.update(challenge);
                hash.update(Buffer.from(this.deviceData.imei));
                hash.update(timestampBuffer);
                const derivedKey = hash.digest().slice(0, 8);
                
                const match = derivedKey.equals(expectedResponse.slice(0, 8));
                
                if (match) {
                    results.push({
                        method: 'Multi-Factor-Timestamp',
                        sessionId: session.id,
                        timestamp,
                        match: true
                    });
                }
            } catch (error) {
                // Continue with next variation
            }
        }
        
        return results;
    }

    /**
     * Calculate byte frequency across all sessions
     */
    calculateByteFrequency(data) {
        const frequency = {};
        
        for (const buffer of data) {
            for (const byte of buffer) {
                frequency[byte] = (frequency[byte] || 0) + 1;
            }
        }
        
        return frequency;
    }

    /**
     * Calculate entropy of byte data
     */
    calculateEntropy(data) {
        const frequency = this.calculateByteFrequency(data);
        const total = data.length * data[0].length;
        let entropy = 0;
        
        for (const count of Object.values(frequency)) {
            const probability = count / total;
            entropy -= probability * Math.log2(probability);
        }
        
        return entropy;
    }

    /**
     * Calculate basic statistics
     */
    calculateStatistics(data) {
        const allBytes = [];
        for (const buffer of data) {
            allBytes.push(...buffer);
        }
        
        const sum = allBytes.reduce((a, b) => a + b, 0);
        const mean = sum / allBytes.length;
        const variance = allBytes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allBytes.length;
        const stdDev = Math.sqrt(variance);
        
        return { mean, variance, stdDev, min: Math.min(...allBytes), max: Math.max(...allBytes) };
    }

    /**
     * Calculate N-grams
     */
    calculateNGrams(data, n) {
        const ngrams = {};
        
        for (const buffer of data) {
            for (let i = 0; i <= buffer.length - n; i++) {
                const ngram = buffer.slice(i, i + n);
                const key = ngram.toString('hex');
                ngrams[key] = (ngrams[key] || 0) + 1;
            }
        }
        
        return ngrams;
    }

    /**
     * Analyze byte positions
     */
    analyzeBytePositions(challenges, responses) {
        const positionAnalysis = {};
        
        for (let pos = 0; pos < 8; pos++) {
            const challengeBytes = challenges.map(c => c[pos]);
            const responseBytes = responses.map(r => r[pos]);
            
            positionAnalysis[pos] = {
                challengeFreq: this.calculateByteFrequency([Buffer.from(challengeBytes)]),
                responseFreq: this.calculateByteFrequency([Buffer.from(responseBytes)]),
                correlation: this.calculateCorrelation(challengeBytes, responseBytes)
            };
        }
        
        return positionAnalysis;
    }

    /**
     * Detect patterns in data
     */
    detectPatterns(challenges, responses) {
        const patterns = [];
        
        // Look for repeating patterns
        for (let i = 0; i < challenges.length; i++) {
            for (let j = i + 1; j < challenges.length; j++) {
                const similarity = this.calculateSimilarity(challenges[i], challenges[j]);
                if (similarity > 0.7) {
                    patterns.push({
                        type: 'challenge-similarity',
                        sessions: [i, j],
                        similarity
                    });
                }
            }
        }
        
        return patterns;
    }

    /**
     * Calculate cross-correlation
     */
    calculateCrossCorrelation(challenges, responses) {
        let correlationSum = 0;
        let count = 0;
        
        for (let i = 0; i < challenges.length; i++) {
            for (let j = 0; j < responses.length; j++) {
                if (i === j) continue; // Skip same session
                
                const correlation = this.calculateCorrelation(
                    Array.from(challenges[i]),
                    Array.from(responses[j])
                );
                correlationSum += correlation;
                count++;
            }
        }
        
        return {
            coefficient: correlationSum / count,
            totalComparisons: count
        };
    }

    /**
     * Calculate position-wise correlation
     */
    calculatePositionCorrelation(challenges, responses) {
        const positionCorrelations = [];
        
        for (let pos = 0; pos < 8; pos++) {
            const challengeBytes = challenges.map(c => c[pos]);
            const responseBytes = responses.map(r => r[pos]);
            
            const correlation = this.calculateCorrelation(challengeBytes, responseBytes);
            positionCorrelations.push({
                position: pos,
                correlation
            });
        }
        
        return positionCorrelations;
    }

    /**
     * Analyze XOR patterns
     */
    analyzeXORPatterns(challenges, responses) {
        const xorPatterns = {};
        
        for (let i = 0; i < challenges.length; i++) {
            const challenge = challenges[i];
            const response = responses[i];
            
            const xor = Buffer.alloc(8);
            for (let j = 0; j < 8; j++) {
                xor[j] = challenge[j] ^ response[j];
            }
            
            const pattern = xor.toString('hex');
            if (!xorPatterns[pattern]) {
                xorPatterns[pattern] = [];
            }
            xorPatterns[pattern].push(i);
        }
        
        return xorPatterns;
    }

    /**
     * Calculate linear correlation
     */
    calculateLinearCorrelation(challenges, responses) {
        const challengeBytes = challenges.flatMap(c => Array.from(c));
        const responseBytes = responses.flatMap(r => Array.from(r));
        
        const correlation = this.calculateCorrelation(challengeBytes, responseBytes);
        
        return {
            coefficient: correlation,
            sampleSize: challengeBytes.length
        };
    }

    /**
     * Perform clustering analysis
     */
    performClustering(challenges, responses) {
        // Simple k-means clustering based on byte values
        const clusters = [];
        const k = Math.min(5, Math.floor(challenges.length / 3));
        
        // Initialize centroids
        const centroids = [];
        for (let i = 0; i < k; i++) {
            const randomIndex = Math.floor(Math.random() * challenges.length);
            centroids.push({
                challenge: Array.from(challenges[randomIndex]),
                response: Array.from(responses[randomIndex])
            });
        }
        
        // Simple clustering assignment
        for (let i = 0; i < challenges.length; i++) {
            let minDistance = Infinity;
            let clusterIndex = 0;
            
            for (let j = 0; j < centroids.length; j++) {
                const distance = this.calculateDistance(
                    Array.from(challenges[i]),
                    centroids[j].challenge
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    clusterIndex = j;
                }
            }
            
            clusters.push({
                sessionIndex: i,
                cluster: clusterIndex,
                distance: minDistance
            });
        }
        
        return clusters;
    }

    /**
     * Analyze sequences
     */
    analyzeSequences(challenges, responses) {
        const sequences = [];
        
        // Look for sequential patterns
        for (let i = 1; i < challenges.length; i++) {
            const prevChallenge = challenges[i - 1];
            const currChallenge = challenges[i];
            const prevResponse = responses[i - 1];
            const currResponse = responses[i];
            
            const challengeDiff = this.calculateDifference(prevChallenge, currChallenge);
            const responseDiff = this.calculateDifference(prevResponse, currResponse);
            
            sequences.push({
                sessionIndex: i,
                challengeDifference: challengeDiff,
                responseDifference: responseDiff,
                correlation: this.calculateCorrelation(challengeDiff, responseDiff)
            });
        }
        
        return sequences;
    }

    /**
     * Detect transformations
     */
    detectTransformations(challenges, responses) {
        const transformations = [];
        
        for (let i = 0; i < challenges.length; i++) {
            const challenge = Array.from(challenges[i]);
            const response = Array.from(responses[i]);
            
            // Test various transformations
            const xor = challenge.map((c, j) => c ^ response[j]);
            const add = challenge.map((c, j) => (c + response[j]) % 256);
            const sub = challenge.map((c, j) => (c - response[j] + 256) % 256);
            
            transformations.push({
                sessionIndex: i,
                xor: xor,
                add: add,
                sub: sub,
                xorPattern: xor.toString('hex'),
                addPattern: add.toString('hex'),
                subPattern: sub.toString('hex')
            });
        }
        
        return transformations;
    }

    /**
     * Perform machine learning analysis
     */
    performMachineLearningAnalysis(challenges, responses) {
        // Simple feature extraction and analysis
        const features = [];
        
        for (let i = 0; i < challenges.length; i++) {
            const challenge = Array.from(challenges[i]);
            const response = Array.from(responses[i]);
            
            const feature = {
                sessionIndex: i,
                challengeMean: challenge.reduce((a, b) => a + b, 0) / challenge.length,
                responseMean: response.reduce((a, b) => a + b, 0) / response.length,
                challengeStd: this.calculateStdDev(challenge),
                responseStd: this.calculateStdDev(response),
                xorMean: challenge.map((c, j) => c ^ response[j]).reduce((a, b) => a + b, 0) / 8,
                correlation: this.calculateCorrelation(challenge, response)
            };
            
            features.push(feature);
        }
        
        return {
            features: features,
            insights: this.generateMLInsights(features)
        };
    }

    /**
     * Generate machine learning insights
     */
    generateMLInsights(features) {
        const insights = [];
        
        // Analyze feature correlations
        const challengeMeans = features.map(f => f.challengeMean);
        const responseMeans = features.map(f => f.responseMean);
        const correlations = features.map(f => f.correlation);
        
        const meanCorrelation = this.calculateCorrelation(challengeMeans, responseMeans);
        
        insights.push({
            type: 'mean-correlation',
            value: meanCorrelation,
            interpretation: meanCorrelation > 0.5 ? 'Strong positive correlation' : 'Weak correlation'
        });
        
        // Analyze variance patterns
        const challengeVariance = this.calculateVariance(challengeMeans);
        const responseVariance = this.calculateVariance(responseMeans);
        
        insights.push({
            type: 'variance-analysis',
            challengeVariance,
            responseVariance,
            interpretation: challengeVariance > responseVariance ? 'Challenges more variable' : 'Responses more variable'
        });
        
        return insights;
    }

    /**
     * Utility methods
     */
    hexToBytes(hex) {
        return Buffer.from(hex.replace(/\s+/g, ''), 'hex');
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

    calculateSimilarity(a, b) {
        let matches = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] === b[i]) matches++;
        }
        return matches / Math.min(a.length, b.length);
    }

    calculateDistance(a, b) {
        let distance = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            distance += Math.abs(a[i] - b[i]);
        }
        return distance;
    }

    calculateDifference(a, b) {
        const diff = [];
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            diff.push((a[i] - b[i] + 256) % 256);
        }
        return diff;
    }

    calculateStdDev(data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        return Math.sqrt(variance);
    }

    calculateVariance(data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    }

    /**
     * Run complete analysis
     */
    async runCompleteAnalysis() {
        console.log('🔬 Advanced Cryptographic Analysis Starting...\n');
        
        const sessionCount = this.loadSessions();
        if (sessionCount === 0) {
            console.log('❌ No sessions loaded. Exiting.');
            return;
        }
        
        this.performStatisticalAnalysis();
        this.performFrequencyAnalysis();
        this.performCorrelationAnalysis();
        this.performAdvancedKeyDerivationTests();
        this.performPatternRecognition();
        
        // Save results
        this.saveResults();
        
        console.log('\n✅ Advanced cryptographic analysis complete!');
        this.printSummary();
    }

    /**
     * Save analysis results
     */
    saveResults() {
        const results = {
            analysisDate: new Date().toISOString(),
            sessionCount: this.sessions.length,
            deviceData: this.deviceData,
            results: this.analysisResults
        };
        
        fs.writeFileSync('advanced-crypto-analysis-results.json', JSON.stringify(results, null, 2));
        console.log('\n💾 Results saved to advanced-crypto-analysis-results.json');
    }

    /**
     * Print analysis summary
     */
    printSummary() {
        console.log('\n📊 ANALYSIS SUMMARY');
        console.log('==================');
        
        const stats = this.analysisResults.statisticalAnalysis;
        console.log(`Sessions Analyzed: ${stats.sessionCount}`);
        console.log(`Challenge Entropy: ${stats.challengeEntropy.toFixed(4)}`);
        console.log(`Response Entropy: ${stats.responseEntropy.toFixed(4)}`);
        
        const keyTests = this.analysisResults.keyDerivationTests;
        const totalMatches = Object.values(keyTests).reduce((sum, tests) => sum + tests.length, 0);
        console.log(`Key Derivation Matches: ${totalMatches}`);
        
        const patterns = this.analysisResults.patternRecognition;
        console.log(`Clusters Identified: ${patterns.clusters.length}`);
        console.log(`Sequence Patterns: ${patterns.sequences.length}`);
        console.log(`Transformation Candidates: ${patterns.transformations.length}`);
        
        if (totalMatches > 0) {
            console.log('\n🎯 POTENTIAL BREAKTHROUGHS:');
            Object.entries(keyTests).forEach(([method, tests]) => {
                if (tests.length > 0) {
                    console.log(`   ${method}: ${tests.length} matches found!`);
                }
            });
        }
    }
}

// Run analysis if called directly
if (require.main === module) {
    const analyzer = new AdvancedCryptoAnalyzer();
    analyzer.runCompleteAnalysis().catch(console.error);
}

module.exports = AdvancedCryptoAnalyzer;
