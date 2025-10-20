const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SessionManager {
  constructor() {
    this.history = [];
    this.sessionStart = new Date();
    this.sessionId = this.sessionStart.getTime();
    this.logFile = `logs/chat-session-${this.sessionId}.log`;
    this.jsonFile = `logs/chat-session-${this.sessionId}.json`;
    this.deviceInfo = null;
    
    // Ensure logs directory exists
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  logCommand(command, args, result) {
    const entry = {
      timestamp: new Date().toISOString(),
      command,
      args: args || [],
      result,
      duration: Date.now() - this.sessionStart.getTime()
    };

    this.history.push(entry);
    
    // Write to log file
    this.writeToLogFile(entry);
    
    // Write to JSON file
    this.writeToJsonFile();
  }

  writeToLogFile(entry) {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const argsStr = entry.args.length > 0 ? ` ${entry.args.join(' ')}` : '';
    const resultStr = entry.result.error ? 
      `ERROR: ${entry.result.error}` : 
      (entry.result.message || 'Success');
    
    const logLine = `[${timestamp}] ${entry.command}${argsStr} → ${resultStr}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error(chalk.red('❌ Failed to write to log file:'), error.message);
    }
  }

  writeToJsonFile() {
    const sessionData = {
      sessionStart: this.sessionStart.toISOString(),
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
      commands: this.history,
      totalCommands: this.history.length,
      duration: Date.now() - this.sessionStart.getTime()
    };

    try {
      fs.writeFileSync(this.jsonFile, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      console.error(chalk.red('❌ Failed to write to JSON file:'), error.message);
    }
  }

  getHistory(count = 10) {
    return this.history.slice(-count);
  }

  clearHistory() {
    this.history = [];
    console.log(chalk.yellow('🗑️ Command history cleared'));
  }

  saveSession(filename) {
    if (!filename) {
      filename = `logs/chat-session-${this.sessionId}.json`;
    }

    try {
      const sessionData = {
        sessionStart: this.sessionStart.toISOString(),
        sessionId: this.sessionId,
        deviceInfo: this.deviceInfo,
        commands: this.history,
        totalCommands: this.history.length,
        duration: Date.now() - this.sessionStart.getTime()
      };

      fs.writeFileSync(filename, JSON.stringify(sessionData, null, 2));
      console.log(chalk.green(`💾 Session saved to ${filename}`));
      return filename;
    } catch (error) {
      console.error(chalk.red('❌ Failed to save session:'), error.message);
      return null;
    }
  }

  loadSession(filename) {
    try {
      if (!fs.existsSync(filename)) {
        console.error(chalk.red('❌ Session file not found:'), filename);
        return false;
      }

      const sessionData = JSON.parse(fs.readFileSync(filename, 'utf8'));
      
      // Load session data
      this.history = sessionData.commands || [];
      this.deviceInfo = sessionData.deviceInfo;
      
      console.log(chalk.green(`📂 Session loaded from ${filename}`));
      console.log(chalk.gray(`   Commands: ${this.history.length}`));
      console.log(chalk.gray(`   Duration: ${sessionData.duration}ms`));
      
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Failed to load session:'), error.message);
      return false;
    }
  }

  setDeviceInfo(deviceInfo) {
    this.deviceInfo = deviceInfo;
  }

  getSessionStats() {
    const totalCommands = this.history.length;
    const successfulCommands = this.history.filter(entry => !entry.result.error).length;
    const failedCommands = totalCommands - successfulCommands;
    const duration = Date.now() - this.sessionStart.getTime();

    return {
      totalCommands,
      successfulCommands,
      failedCommands,
      duration,
      successRate: totalCommands > 0 ? (successfulCommands / totalCommands * 100).toFixed(1) : 0
    };
  }

  displaySessionStats() {
    const stats = this.getSessionStats();
    
    console.log(chalk.blue.bold('\n📊 Session Statistics'));
    console.log(chalk.gray('=================='));
    console.log(chalk.cyan(`Total Commands: ${stats.totalCommands}`));
    console.log(chalk.green(`Successful: ${stats.successfulCommands}`));
    console.log(chalk.red(`Failed: ${stats.failedCommands}`));
    console.log(chalk.yellow(`Success Rate: ${stats.successRate}%`));
    console.log(chalk.gray(`Duration: ${Math.round(stats.duration / 1000)}s`));
  }

  exportSession(format = 'json') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `logs/chat-export-${timestamp}.${format}`;
    
    try {
      if (format === 'json') {
        const sessionData = {
          sessionStart: this.sessionStart.toISOString(),
          sessionId: this.sessionId,
          deviceInfo: this.deviceInfo,
          commands: this.history,
          totalCommands: this.history.length,
          duration: Date.now() - this.sessionStart.getTime()
        };
        
        fs.writeFileSync(filename, JSON.stringify(sessionData, null, 2));
      } else if (format === 'csv') {
        const csvData = this.generateCsvData();
        fs.writeFileSync(filename, csvData);
      } else {
        throw new Error('Unsupported format. Use "json" or "csv"');
      }
      
      console.log(chalk.green(`📤 Session exported to ${filename}`));
      return filename;
    } catch (error) {
      console.error(chalk.red('❌ Failed to export session:'), error.message);
      return null;
    }
  }

  generateCsvData() {
    const headers = ['Timestamp', 'Command', 'Args', 'Success', 'Message', 'Duration'];
    const rows = this.history.map(entry => [
      entry.timestamp,
      entry.command,
      entry.args.join(' '),
      entry.result.error ? 'FALSE' : 'TRUE',
      entry.result.error || entry.result.message || 'Success',
      entry.duration
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  searchHistory(query) {
    const results = this.history.filter(entry => {
      const searchText = `${entry.command} ${entry.args.join(' ')} ${entry.result.message || ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
    
    return results;
  }

  getCommandFrequency() {
    const frequency = {};
    this.history.forEach(entry => {
      frequency[entry.command] = (frequency[entry.command] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .map(([command, count]) => ({ command, count }));
  }

  displayCommandFrequency() {
    const frequency = this.getCommandFrequency();
    
    console.log(chalk.blue.bold('\n📈 Command Frequency'));
    console.log(chalk.gray('==================='));
    frequency.forEach(({ command, count }) => {
      console.log(chalk.cyan(`${command.padEnd(15)} ${count}`));
    });
  }

  getErrorSummary() {
    const errors = this.history
      .filter(entry => entry.result.error)
      .map(entry => entry.result.error);
    
    const errorCounts = {};
    errors.forEach(error => {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([error, count]) => ({ error, count }));
  }

  displayErrorSummary() {
    const errors = this.getErrorSummary();
    
    if (errors.length === 0) {
      console.log(chalk.green('✅ No errors in this session'));
      return;
    }
    
    console.log(chalk.red.bold('\n❌ Error Summary'));
    console.log(chalk.gray('================'));
    errors.forEach(({ error, count }) => {
      console.log(chalk.red(`${error} (${count} times)`));
    });
  }

  getSessionSummary() {
    const stats = this.getSessionStats();
    const frequency = this.getCommandFrequency();
    const errors = this.getErrorSummary();
    
    return {
      stats,
      frequency,
      errors,
      deviceInfo: this.deviceInfo,
      sessionStart: this.sessionStart,
      sessionId: this.sessionId
    };
  }

  displaySessionSummary() {
    this.displaySessionStats();
    this.displayCommandFrequency();
    this.displayErrorSummary();
  }
}

module.exports = SessionManager;
