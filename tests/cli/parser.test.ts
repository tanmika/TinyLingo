import { describe, it, expect } from 'vitest';
import { parseArgs, type ParsedCommand } from '../../src/cli/parser.js';

describe('cli/parser', () => {
  describe('parseArgs', () => {
    it('should parse "record" command with arguments', () => {
      const result = parseArgs(['record', '提交', 'git commit only']);
      expect(result).toEqual({
        command: 'record',
        args: ['提交', 'git commit only'],
        help: false,
      });
    });

    it('should parse "remove" command with argument', () => {
      const result = parseArgs(['remove', '提交']);
      expect(result).toEqual({
        command: 'remove',
        args: ['提交'],
        help: false,
      });
    });

    it('should parse "list" command with no arguments', () => {
      const result = parseArgs(['list']);
      expect(result).toEqual({
        command: 'list',
        args: [],
        help: false,
      });
    });

    it('should parse "config" command with no arguments', () => {
      const result = parseArgs(['config']);
      expect(result).toEqual({
        command: 'config',
        args: [],
        help: false,
      });
    });

    it('should parse "config" command with dot path and value', () => {
      const result = parseArgs(['config', 'smart.enabled', 'true']);
      expect(result).toEqual({
        command: 'config',
        args: ['smart.enabled', 'true'],
        help: false,
      });
    });

    it('should parse "match" command with message argument', () => {
      const result = parseArgs(['match', '帮我提交代码']);
      expect(result).toEqual({
        command: 'match',
        args: ['帮我提交代码'],
        help: false,
      });
    });

    it('should parse "install" command', () => {
      const result = parseArgs(['install']);
      expect(result).toEqual({
        command: 'install',
        args: [],
        help: false,
      });
    });

    it('should parse "uninstall" command', () => {
      const result = parseArgs(['uninstall']);
      expect(result).toEqual({
        command: 'uninstall',
        args: [],
        help: false,
      });
    });

    it('should detect --help flag and set help to true', () => {
      const result = parseArgs(['record', '--help']);
      expect(result.help).toBe(true);
      expect(result.command).toBe('record');
    });

    it('should detect --help flag regardless of position', () => {
      const result = parseArgs(['--help', 'list']);
      expect(result.help).toBe(true);
    });

    it('should exclude --help from args array', () => {
      const result = parseArgs(['record', '--help', '提交']);
      expect(result.help).toBe(true);
      expect(result.args).not.toContain('--help');
    });

    it('should throw on unknown command', () => {
      expect(() => parseArgs(['unknown'])).toThrow();
    });

    it('should throw on empty argv', () => {
      expect(() => parseArgs([])).toThrow();
    });

    it('should parse install with platform argument', () => {
      const result = parseArgs(['install', 'claude']);
      expect(result).toEqual({
        command: 'install',
        args: ['claude'],
        help: false,
      });
    });
  });
});
