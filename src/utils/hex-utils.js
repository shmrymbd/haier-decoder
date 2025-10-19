/**
 * Hex conversion utilities for protocol parsing
 */

class HexUtils {
  /**
   * Convert hex string to Buffer
   * @param {string} hexString - Space-separated hex string
   * @returns {Buffer} Buffer object
   */
  static hexToBuffer(hexString) {
    const cleanHex = hexString.replace(/\s+/g, '');
    return Buffer.from(cleanHex, 'hex');
  }

  /**
   * Convert Buffer to hex string with spaces
   * @param {Buffer} buffer - Buffer to convert
   * @param {number} bytesPerLine - Number of bytes per line (default: 16)
   * @returns {string} Formatted hex string
   */
  static bufferToHex(buffer, bytesPerLine = 16) {
    const hex = buffer.toString('hex').toUpperCase();
    const spaced = hex.match(/.{1,2}/g).join(' ');
    
    if (bytesPerLine === 0) {
      return spaced;
    }
    
    // Split into lines
    const lines = [];
    for (let i = 0; i < spaced.length; i += bytesPerLine * 3) {
      lines.push(spaced.substr(i, bytesPerLine * 3));
    }
    return lines.join('\n');
  }

  /**
   * Convert Buffer to hex string without spaces
   * @param {Buffer} buffer - Buffer to convert
   * @returns {string} Hex string
   */
  static bufferToHexCompact(buffer) {
    return buffer.toString('hex').toUpperCase();
  }

  /**
   * Extract ASCII string from hex data
   * @param {Buffer} buffer - Buffer containing ASCII data
   * @param {number} start - Start position
   * @param {number} length - Length to extract
   * @returns {string} ASCII string
   */
  static extractASCII(buffer, start = 0, length = null) {
    const end = length ? start + length : buffer.length;
    const asciiBuffer = buffer.slice(start, end);
    return asciiBuffer.toString('ascii').replace(/\0/g, '');
  }

  /**
   * Find ASCII strings in hex data
   * @param {Buffer} buffer - Buffer to search
   * @param {number} minLength - Minimum string length
   * @returns {Array} Array of {value, position, length}
   */
  static findASCIIStrings(buffer, minLength = 3) {
    const strings = [];
    let current = '';
    let start = -1;

    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      
      // Check if byte is printable ASCII
      if (byte >= 32 && byte <= 126) {
        if (current === '') {
          start = i;
        }
        current += String.fromCharCode(byte);
      } else {
        if (current.length >= minLength) {
          strings.push({
            value: current,
            position: start,
            length: current.length
          });
        }
        current = '';
        start = -1;
      }
    }

    // Check final string
    if (current.length >= minLength) {
      strings.push({
        value: current,
        position: start,
        length: current.length
      });
    }

    return strings;
  }

  /**
   * Format hex dump with addresses and ASCII
   * @param {Buffer} buffer - Buffer to format
   * @param {number} bytesPerLine - Bytes per line (default: 16)
   * @returns {string} Formatted hex dump
   */
  static hexDump(buffer, bytesPerLine = 16) {
    const lines = [];
    
    for (let i = 0; i < buffer.length; i += bytesPerLine) {
      const chunk = buffer.slice(i, i + bytesPerLine);
      const address = i.toString(16).padStart(8, '0');
      const hex = this.bufferToHex(chunk, 0);
      const ascii = chunk.toString('ascii').replace(/[\x00-\x1F\x7F-\xFF]/g, '.');
      
      lines.push(
        `${address}  ${hex.padEnd(bytesPerLine * 3)}  |${ascii.padEnd(bytesPerLine)}|`
      );
    }
    
    return lines.join('\n');
  }

  /**
   * Compare two buffers and highlight differences
   * @param {Buffer} buffer1 - First buffer
   * @param {Buffer} buffer2 - Second buffer
   * @returns {string} Comparison result
   */
  static compareBuffers(buffer1, buffer2) {
    const maxLength = Math.max(buffer1.length, buffer2.length);
    const lines = [];
    
    for (let i = 0; i < maxLength; i += 16) {
      const chunk1 = buffer1.slice(i, i + 16);
      const chunk2 = buffer2.slice(i, i + 16);
      const address = i.toString(16).padStart(8, '0');
      
      const hex1 = this.bufferToHex(chunk1, 0);
      const hex2 = this.bufferToHex(chunk2, 0);
      const ascii1 = chunk1.toString('ascii').replace(/[\x00-\x1F\x7F-\xFF]/g, '.');
      const ascii2 = chunk2.toString('ascii').replace(/[\x00-\x1F\x7F-\xFF]/g, '.');
      
      if (hex1 === hex2) {
        lines.push(`${address}  ${hex1.padEnd(48)}  |${ascii1.padEnd(16)}|`);
      } else {
        lines.push(`${address}  ${hex1.padEnd(48)}  |${ascii1.padEnd(16)}|`);
        lines.push(`${address}  ${hex2.padEnd(48)}  |${ascii2.padEnd(16)}|`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Parse hex string from captured data files
   * @param {string} line - Line from captured data file
   * @returns {Buffer|null} Parsed buffer or null if invalid
   */
  static parseCapturedLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '00') {
      return null;
    }
    
    try {
      return this.hexToBuffer(trimmed);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate hex string format
   * @param {string} hexString - Hex string to validate
   * @returns {boolean} True if valid
   */
  static isValidHex(hexString) {
    const cleanHex = hexString.replace(/\s+/g, '');
    return /^[0-9A-Fa-f]+$/.test(cleanHex) && cleanHex.length % 2 === 0;
  }
}

module.exports = HexUtils;
