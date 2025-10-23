/**
 * Unit tests for Protocol Knowledge Base
 */

const fs = require('fs').promises;
const path = require('path');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

const ProtocolKnowledge = require('../../src/ai/protocol-knowledge');

describe('ProtocolKnowledge', () => {
  let protocolKnowledge;
  let mockKnowledgeData;
  let mockTestVectorsData;

  beforeEach(() => {
    protocolKnowledge = new ProtocolKnowledge();
    
    mockKnowledgeData = {
      commands: [
        {
          commandId: 'wash-program-01',
          commandHex: '60 01',
          commandName: 'Wash Program 1',
          description: 'Standard wash program',
          parameters: ['program_type'],
          examples: ['ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad'],
          relatedCommands: ['wash-program-02'],
          category: 'wash_programs'
        },
        {
          commandId: 'wash-program-02',
          commandHex: '60 02',
          commandName: 'Wash Program 2',
          description: 'Quick wash program',
          parameters: ['program_type'],
          examples: ['ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad'],
          relatedCommands: ['wash-program-01'],
          category: 'wash_programs'
        },
        {
          commandId: 'reset-standby',
          commandHex: '01 5d 1f 00 01',
          commandName: 'Reset to Standby',
          description: 'Return device to standby state',
          parameters: [],
          examples: ['ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 ca bb 9b'],
          relatedCommands: ['init-command'],
          category: 'control'
        },
        {
          commandId: 'init-command',
          commandHex: '01 4d 01',
          commandName: 'Initialization Command',
          description: 'Session initialization',
          parameters: [],
          examples: ['ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4'],
          relatedCommands: ['reset-standby'],
          category: 'control'
        }
      ],
      statusResponses: [
        {
          statusId: 'ready-standby',
          statusHex: '6d 01 01 30 30',
          statusName: 'Ready/Standby',
          description: 'Device is ready and in standby mode',
          examples: ['ff ff 43 40 00 00 00 00 00 6d 01 01 30 30 [additional_data] [crc]'],
          category: 'status'
        }
      ],
      packetStructure: {
        preamble: 'ff ff',
        lengthByte: 'variable',
        frameType: '40',
        sequenceLength: 4,
        crcLength: 3,
        description: 'Standard Haier protocol packet structure'
      },
      crcAlgorithms: [
        {
          name: 'Standard CRC',
          description: '3-byte CRC validation for protocol packets',
          testVectors: [
            {
              data: 'ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00',
              expectedCrc: 'b0 34 ad'
            }
          ]
        }
      ]
    };

    mockTestVectorsData = {
      testVectors: [
        {
          name: 'Wash Program 1 Command',
          description: 'Test vector for wash program 1 command',
          input: {
            command: '60 01',
            sequence: '00 00 00 00',
            data: '01 00 00 00'
          },
          expectedPacket: 'ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad',
          expectedCrc: 'b0 34 ad'
        }
      ],
      statusTestVectors: [
        {
          name: 'Ready Status',
          description: 'Test vector for ready/standby status response',
          input: {
            status: '01 30 30',
            sequence: '00 00 00 00'
          },
          expectedPacket: 'ff ff 43 40 00 00 00 00 00 6d 01 01 30 30 [additional_data] [crc]',
          expectedCrc: 'variable'
        }
      ],
      aiTestScenarios: [
        {
          name: 'Protocol Query - Command Explanation',
          query: 'What does command 0x60 do?',
          expectedResponse: {
            type: 'explanation',
            contains: ['wash program', '0x60', 'command'],
            confidence: 0.9
          }
        }
      ]
    };

    // Setup fs mocks
    fs.readFile.mockImplementation((filePath) => {
      if (filePath.includes('protocol-knowledge.json')) {
        return Promise.resolve(JSON.stringify(mockKnowledgeData));
      } else if (filePath.includes('protocol-test-vectors.json')) {
        return Promise.resolve(JSON.stringify(mockTestVectorsData));
      }
      return Promise.reject(new Error('File not found'));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('load', () => {
    test('should load knowledge base successfully', async () => {
      await protocolKnowledge.load();
      
      expect(protocolKnowledge.isLoaded).toBe(true);
      expect(protocolKnowledge.knowledge).toEqual(mockKnowledgeData);
      expect(protocolKnowledge.testVectors).toEqual(mockTestVectorsData);
    });

    test('should handle missing test vectors file', async () => {
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('protocol-knowledge.json')) {
          return Promise.resolve(JSON.stringify(mockKnowledgeData));
        }
        return Promise.reject(new Error('File not found'));
      });

      await protocolKnowledge.load();
      
      expect(protocolKnowledge.isLoaded).toBe(true);
      expect(protocolKnowledge.testVectors).toEqual({
        testVectors: [],
        statusTestVectors: [],
        aiTestScenarios: []
      });
    });

    test('should throw error for invalid knowledge data', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      
      await expect(protocolKnowledge.load()).rejects.toThrow('Failed to load protocol knowledge');
    });

    test('should throw error for missing required sections', async () => {
      const invalidData = { commands: [] }; // Missing statusResponses and packetStructure
      fs.readFile.mockResolvedValue(JSON.stringify(invalidData));
      
      await expect(protocolKnowledge.load()).rejects.toThrow('Missing required section');
    });
  });

  describe('getCommandByHex', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should find command by exact hex match', () => {
      const command = protocolKnowledge.getCommandByHex('60 01');
      
      expect(command).toBeDefined();
      expect(command.commandId).toBe('wash-program-01');
      expect(command.commandName).toBe('Wash Program 1');
    });

    test('should find command with normalized hex', () => {
      const command = protocolKnowledge.getCommandByHex('60  01'); // Extra spaces
      
      expect(command).toBeDefined();
      expect(command.commandId).toBe('wash-program-01');
    });

    test('should return undefined for non-existent command', () => {
      const command = protocolKnowledge.getCommandByHex('99 99');
      
      expect(command).toBeUndefined();
    });

    test('should throw error if knowledge not loaded', () => {
      protocolKnowledge.isLoaded = false;
      
      expect(() => protocolKnowledge.getCommandByHex('60 01')).toThrow('Knowledge base not loaded');
    });
  });

  describe('getCommandById', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should find command by ID', () => {
      const command = protocolKnowledge.getCommandById('wash-program-01');
      
      expect(command).toBeDefined();
      expect(command.commandHex).toBe('60 01');
      expect(command.commandName).toBe('Wash Program 1');
    });

    test('should return undefined for non-existent ID', () => {
      const command = protocolKnowledge.getCommandById('non-existent');
      
      expect(command).toBeUndefined();
    });
  });

  describe('getCommandsByCategory', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should find commands by category', () => {
      const commands = protocolKnowledge.getCommandsByCategory('wash_programs');
      
      expect(commands).toHaveLength(2);
      expect(commands[0].commandId).toBe('wash-program-01');
    });

    test('should return empty array for non-existent category', () => {
      const commands = protocolKnowledge.getCommandsByCategory('non-existent');
      
      expect(commands).toHaveLength(0);
    });
  });

  describe('searchCommands', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should search commands by name', () => {
      const commands = protocolKnowledge.searchCommands('wash');
      
      expect(commands).toHaveLength(2);
      expect(commands[0].commandId).toBe('wash-program-01');
    });

    test('should search commands by description', () => {
      const commands = protocolKnowledge.searchCommands('standby');
      
      expect(commands).toHaveLength(1);
      expect(commands[0].commandId).toBe('reset-standby');
    });

    test('should search commands by hex code', () => {
      const commands = protocolKnowledge.searchCommands('60');
      
      expect(commands).toHaveLength(2);
      expect(commands[0].commandId).toBe('wash-program-01');
    });

    test('should return empty array for no matches', () => {
      const commands = protocolKnowledge.searchCommands('non-existent');
      
      expect(commands).toHaveLength(0);
    });
  });

  describe('getStatusByHex', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should find status by hex code', () => {
      const status = protocolKnowledge.getStatusByHex('6d 01 01 30 30');
      
      expect(status).toBeDefined();
      expect(status.statusId).toBe('ready-standby');
      expect(status.statusName).toBe('Ready/Standby');
    });

    test('should return undefined for non-existent status', () => {
      const status = protocolKnowledge.getStatusByHex('99 99 99 99');
      
      expect(status).toBeUndefined();
    });
  });

  describe('getPacketStructure', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should return packet structure', () => {
      const structure = protocolKnowledge.getPacketStructure();
      
      expect(structure).toBeDefined();
      expect(structure.preamble).toBe('ff ff');
      expect(structure.frameType).toBe('40');
    });
  });

  describe('getCRCAlgorithms', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should return CRC algorithms', () => {
      const algorithms = protocolKnowledge.getCRCAlgorithms();
      
      expect(Array.isArray(algorithms)).toBe(true);
      expect(algorithms).toHaveLength(1);
      expect(algorithms[0].name).toBe('Standard CRC');
    });
  });

  describe('getTestVectors', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should return test vectors', () => {
      const testVectors = protocolKnowledge.getTestVectors();
      
      expect(testVectors).toBeDefined();
      expect(testVectors.testVectors).toHaveLength(1);
      expect(testVectors.statusTestVectors).toHaveLength(1);
      expect(testVectors.aiTestScenarios).toHaveLength(1);
    });
  });

  describe('getAITestScenarios', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should return AI test scenarios', () => {
      const scenarios = protocolKnowledge.getAITestScenarios();
      
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Protocol Query - Command Explanation');
    });
  });

  describe('generateContext', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should generate AI context', () => {
      const query = 'What does command 0x60 do?';
      const context = protocolKnowledge.generateContext(query, { test: 'value' });
      
      expect(context.query).toBe(query);
      expect(context.protocolKnowledge).toBeDefined();
      expect(context.protocolKnowledge.commands).toHaveLength(4);
      expect(context.protocolKnowledge.statusResponses).toHaveLength(1);
      expect(context.test).toBe('value');
      expect(context.timestamp).toBeDefined();
    });
  });

  describe('getRelatedCommands', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should return related commands', () => {
      const related = protocolKnowledge.getRelatedCommands('wash-program-01');
      
      expect(Array.isArray(related)).toBe(true);
      expect(related).toHaveLength(1);
      expect(related[0].commandId).toBe('wash-program-02');
    });

    test('should return empty array for command without related commands', () => {
      const related = protocolKnowledge.getRelatedCommands('reset-standby');
      
      expect(Array.isArray(related)).toBe(true);
      expect(related).toHaveLength(1);
    });
  });

  describe('getCommandExamples', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should return command examples', () => {
      const examples = protocolKnowledge.getCommandExamples('wash-program-01');
      
      expect(Array.isArray(examples)).toBe(true);
      expect(examples).toHaveLength(1);
      expect(examples[0]).toContain('ff ff 0e 40');
    });

    test('should return empty array for non-existent command', () => {
      const examples = protocolKnowledge.getCommandExamples('non-existent');
      
      expect(Array.isArray(examples)).toBe(true);
      expect(examples).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await protocolKnowledge.load();
    });

    test('should return knowledge base statistics', () => {
      const stats = protocolKnowledge.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.commands).toBe(4);
      expect(stats.statusResponses).toBe(1);
      expect(stats.testVectors).toBe(1);
      expect(stats.aiTestScenarios).toBe(1);
      expect(stats.categories).toBe(2);
    });

    test('should return null if not loaded', () => {
      protocolKnowledge.isLoaded = false;
      
      const stats = protocolKnowledge.getStats();
      
      expect(stats).toBeNull();
    });
  });
});