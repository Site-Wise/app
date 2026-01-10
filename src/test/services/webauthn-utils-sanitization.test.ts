/**
 * WebAuthn Utils Device Name Sanitization Tests
 *
 * Tests for the allowlist-based sanitizeDeviceName logic in webauthn-utils.js
 * Since the PocketBase JS file can't be directly imported (uses $os, $security globals),
 * we test the same algorithm here to ensure correctness.
 */

import { describe, it, expect } from 'vitest';

/**
 * Sanitize device name for safe storage - mirrors webauthn-utils.js implementation
 * Uses allowlist-based character filtering for robust XSS prevention.
 */
function sanitizeDeviceName(deviceName: string | null | undefined): string {
  if (!deviceName || typeof deviceName !== 'string') {
    return 'Unknown Device';
  }

  // Trim and limit length
  const trimmed = deviceName.trim().substring(0, 100);

  // Allowlist-based sanitization: only permit safe characters
  let sanitized = '';
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const code = char.charCodeAt(0);

    // Allow: alphanumeric (a-z, A-Z, 0-9)
    if ((code >= 48 && code <= 57) ||   // 0-9
        (code >= 65 && code <= 90) ||   // A-Z
        (code >= 97 && code <= 122)) {  // a-z
      sanitized += char;
      continue;
    }

    // Allow: space, hyphen, underscore, parentheses, period, comma, apostrophe
    if (char === ' ' || char === '-' || char === '_' ||
        char === '(' || char === ')' || char === '.' ||
        char === ',' || char === "'") {
      sanitized += char;
      continue;
    }

    // Allow: Hindi/Devanagari unicode range (U+0900 to U+097F)
    if (code >= 0x0900 && code <= 0x097F) {
      sanitized += char;
      continue;
    }

    // Skip all other characters (including <, >, &, ", :, =, etc.)
  }

  return sanitized.trim() || 'Unknown Device';
}

describe('WebAuthn Utils - sanitizeDeviceName', () => {
  // =========================================================================
  // NULL/UNDEFINED HANDLING
  // =========================================================================
  describe('Null/Undefined Handling', () => {
    it('should return "Unknown Device" for null', () => {
      expect(sanitizeDeviceName(null)).toBe('Unknown Device');
    });

    it('should return "Unknown Device" for undefined', () => {
      expect(sanitizeDeviceName(undefined)).toBe('Unknown Device');
    });

    it('should return "Unknown Device" for empty string', () => {
      expect(sanitizeDeviceName('')).toBe('Unknown Device');
    });

    it('should return "Unknown Device" for whitespace-only string', () => {
      expect(sanitizeDeviceName('   ')).toBe('Unknown Device');
    });
  });

  // =========================================================================
  // VALID INPUTS - PRESERVED
  // =========================================================================
  describe('Valid Inputs - Should Be Preserved', () => {
    it('should preserve simple device names', () => {
      expect(sanitizeDeviceName('My iPhone')).toBe('My iPhone');
      expect(sanitizeDeviceName('Work Laptop')).toBe('Work Laptop');
      expect(sanitizeDeviceName('MacBook Pro')).toBe('MacBook Pro');
    });

    it('should preserve device names with numbers', () => {
      expect(sanitizeDeviceName('iPhone 14 Pro')).toBe('iPhone 14 Pro');
      expect(sanitizeDeviceName('Pixel 8')).toBe('Pixel 8');
      expect(sanitizeDeviceName('Galaxy S24')).toBe('Galaxy S24');
    });

    it('should preserve device names with hyphens', () => {
      expect(sanitizeDeviceName('Work-Laptop')).toBe('Work-Laptop');
      expect(sanitizeDeviceName('Home-PC-2024')).toBe('Home-PC-2024');
    });

    it('should preserve device names with underscores', () => {
      expect(sanitizeDeviceName('My_Device')).toBe('My_Device');
      expect(sanitizeDeviceName('Work_MacBook_Pro')).toBe('Work_MacBook_Pro');
    });

    it('should preserve device names with parentheses', () => {
      expect(sanitizeDeviceName('iPhone (Personal)')).toBe('iPhone (Personal)');
      expect(sanitizeDeviceName('Work (Company Laptop)')).toBe('Work (Company Laptop)');
    });

    it('should preserve device names with periods', () => {
      expect(sanitizeDeviceName('v1.0.0')).toBe('v1.0.0');
      expect(sanitizeDeviceName('Device.local')).toBe('Device.local');
    });

    it('should preserve device names with commas', () => {
      expect(sanitizeDeviceName('Main, backup')).toBe('Main, backup');
    });

    it('should preserve device names with apostrophes', () => {
      expect(sanitizeDeviceName("John's iPhone")).toBe("John's iPhone");
      expect(sanitizeDeviceName("Dad's Laptop")).toBe("Dad's Laptop");
    });

    it('should preserve Hindi characters (Devanagari script)', () => {
      expect(sanitizeDeviceName('मेरा फोन')).toBe('मेरा फोन');
      expect(sanitizeDeviceName('लैपटॉप')).toBe('लैपटॉप');
      expect(sanitizeDeviceName('कार्यालय कंप्यूटर')).toBe('कार्यालय कंप्यूटर');
    });

    it('should preserve mixed Hindi and English', () => {
      expect(sanitizeDeviceName('My फोन')).toBe('My फोन');
      expect(sanitizeDeviceName('Office लैपटॉप')).toBe('Office लैपटॉप');
    });
  });

  // =========================================================================
  // LENGTH HANDLING
  // =========================================================================
  describe('Length Handling', () => {
    it('should truncate names exceeding 100 characters', () => {
      const longName = 'a'.repeat(150);
      expect(sanitizeDeviceName(longName).length).toBe(100);
    });

    it('should preserve exactly 100 characters', () => {
      const exactlyMaxLength = 'x'.repeat(100);
      expect(sanitizeDeviceName(exactlyMaxLength)).toBe(exactlyMaxLength);
    });

    it('should trim whitespace before length check', () => {
      const nameWithPadding = '   ' + 'a'.repeat(100) + '   ';
      expect(sanitizeDeviceName(nameWithPadding)).toBe('a'.repeat(100));
    });
  });

  // =========================================================================
  // XSS PREVENTION - HTML INJECTION (CRITICAL)
  // =========================================================================
  describe('XSS Prevention - HTML Injection', () => {
    it('should strip HTML script tags completely', () => {
      expect(sanitizeDeviceName('<script>alert(1)</script>')).toBe('scriptalert(1)script');
    });

    it('should strip HTML div tags', () => {
      expect(sanitizeDeviceName('<div>test</div>')).toBe('divtestdiv');
    });

    it('should strip img tags with attributes', () => {
      expect(sanitizeDeviceName('<img src=x onerror=alert(1)>')).toBe('img srcx onerroralert(1)');
    });

    it('should strip self-closing tags', () => {
      expect(sanitizeDeviceName('<br/>')).toBe('br');
    });

    it('should strip iframe tags', () => {
      expect(sanitizeDeviceName('<iframe src="evil.com">')).toBe('iframe srcevil.com');
    });

    it('should strip style tags', () => {
      // Curly braces are stripped, no spaces added
      expect(sanitizeDeviceName('<style>body{display:none}</style>')).toBe('stylebodydisplaynonestyle');
    });

    it('should handle partial/malformed tags', () => {
      // Even partial tags get their dangerous chars stripped
      expect(sanitizeDeviceName('<script')).toBe('script');
      expect(sanitizeDeviceName('test<svg')).toBe('testsvg');
    });

    it('should handle angle brackets anywhere', () => {
      expect(sanitizeDeviceName('a<b>c')).toBe('abc');
      expect(sanitizeDeviceName('test<>test')).toBe('testtest');
    });
  });

  // =========================================================================
  // XSS PREVENTION - JAVASCRIPT INJECTION (CRITICAL)
  // =========================================================================
  describe('XSS Prevention - JavaScript Injection', () => {
    it('should strip javascript: protocol (colon removed)', () => {
      expect(sanitizeDeviceName('javascript:alert(1)')).toBe('javascriptalert(1)');
    });

    it('should strip javascript: with mixed case', () => {
      expect(sanitizeDeviceName('JAVASCRIPT:alert(1)')).toBe('JAVASCRIPTalert(1)');
      expect(sanitizeDeviceName('JaVaScRiPt:alert(1)')).toBe('JaVaScRiPtalert(1)');
    });

    it('should strip event handlers (equals sign removed)', () => {
      expect(sanitizeDeviceName('onload=alert(1)')).toBe('onloadalert(1)');
      expect(sanitizeDeviceName('onclick=evil()')).toBe('onclickevil()');
      expect(sanitizeDeviceName('onerror=hack()')).toBe('onerrorhack()');
    });

    it('should strip data: URI protocol (colon removed, comma preserved)', () => {
      // Colon and angle brackets stripped, but comma is in allowlist
      expect(sanitizeDeviceName('data:text/html,<script>')).toBe('datatexthtml,script');
    });

    it('should strip vbscript: protocol', () => {
      expect(sanitizeDeviceName('vbscript:msgbox(1)')).toBe('vbscriptmsgbox(1)');
    });
  });

  // =========================================================================
  // DANGEROUS CHARACTERS STRIPPED
  // =========================================================================
  describe('Dangerous Characters - Should Be Stripped', () => {
    it('should strip angle brackets', () => {
      expect(sanitizeDeviceName('Device<>Name')).toBe('DeviceName');
    });

    it('should strip ampersand', () => {
      expect(sanitizeDeviceName('Work & Home')).toBe('Work  Home');
    });

    it('should strip equals sign', () => {
      expect(sanitizeDeviceName('Device=1')).toBe('Device1');
    });

    it('should strip colon', () => {
      expect(sanitizeDeviceName('Device:1')).toBe('Device1');
    });

    it('should strip semicolon', () => {
      expect(sanitizeDeviceName('Device;1')).toBe('Device1');
    });

    it('should strip double quotes', () => {
      expect(sanitizeDeviceName('Device"Name"')).toBe('DeviceName');
    });

    it('should strip backticks', () => {
      expect(sanitizeDeviceName('Device`Name`')).toBe('DeviceName');
    });

    it('should strip at sign', () => {
      expect(sanitizeDeviceName('Device@Home')).toBe('DeviceHome');
    });

    it('should strip hash', () => {
      expect(sanitizeDeviceName('My#Device')).toBe('MyDevice');
    });

    it('should strip dollar sign', () => {
      expect(sanitizeDeviceName('Test$Device')).toBe('TestDevice');
    });

    it('should strip percent', () => {
      expect(sanitizeDeviceName('Device%Name')).toBe('DeviceName');
    });

    it('should strip asterisk', () => {
      expect(sanitizeDeviceName('Device*')).toBe('Device');
    });

    it('should strip plus sign', () => {
      expect(sanitizeDeviceName('Device+1')).toBe('Device1');
    });

    it('should strip square brackets', () => {
      expect(sanitizeDeviceName('Device[1]')).toBe('Device1');
    });

    it('should strip curly braces', () => {
      expect(sanitizeDeviceName('Device{1}')).toBe('Device1');
    });

    it('should strip pipe character', () => {
      expect(sanitizeDeviceName('Device|1')).toBe('Device1');
    });

    it('should strip backslash', () => {
      expect(sanitizeDeviceName('Device\\1')).toBe('Device1');
    });

    it('should strip question mark', () => {
      expect(sanitizeDeviceName('Device?')).toBe('Device');
    });

    it('should strip exclamation mark', () => {
      expect(sanitizeDeviceName('Device!')).toBe('Device');
    });

    it('should strip tilde', () => {
      expect(sanitizeDeviceName('Device~1')).toBe('Device1');
    });

    it('should strip caret', () => {
      expect(sanitizeDeviceName('Device^1')).toBe('Device1');
    });
  });

  // =========================================================================
  // UNICODE HANDLING
  // =========================================================================
  describe('Unicode Handling', () => {
    it('should strip emoji characters', () => {
      expect(sanitizeDeviceName('My iPhone 📱')).toBe('My iPhone');
      expect(sanitizeDeviceName('🔐 Secure Device')).toBe('Secure Device');
      expect(sanitizeDeviceName('💻')).toBe('Unknown Device');
    });

    it('should strip Chinese characters (not in allowed range)', () => {
      expect(sanitizeDeviceName('我的设备')).toBe('Unknown Device');
      expect(sanitizeDeviceName('Device 我的')).toBe('Device');
    });

    it('should strip Arabic characters (not in allowed range)', () => {
      expect(sanitizeDeviceName('جهازي')).toBe('Unknown Device');
    });

    it('should strip Japanese characters (not in allowed range)', () => {
      expect(sanitizeDeviceName('私のデバイス')).toBe('Unknown Device');
    });

    it('should preserve Hindi (Devanagari) characters', () => {
      expect(sanitizeDeviceName('मोबाइल')).toBe('मोबाइल');
      expect(sanitizeDeviceName('कंप्यूटर')).toBe('कंप्यूटर');
    });
  });

  // =========================================================================
  // COMMON ATTACK PATTERNS
  // =========================================================================
  describe('Common Attack Patterns', () => {
    it('should neutralize SVG XSS', () => {
      expect(sanitizeDeviceName('<svg/onload=alert(1)>')).toBe('svgonloadalert(1)');
    });

    it('should neutralize URL-encoded attacks', () => {
      expect(sanitizeDeviceName('%3Cscript%3Ealert(1)%3C/script%3E')).toBe('3Cscript3Ealert(1)3Cscript3E');
    });

    it('should neutralize base64 encoded payloads', () => {
      // base64 with = padding gets equals stripped
      expect(sanitizeDeviceName('PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg');
    });

    it('should neutralize expression() CSS hack', () => {
      expect(sanitizeDeviceName('expression(alert(1))')).toBe('expression(alert(1))');
    });

    it('should neutralize SQL injection attempts', () => {
      expect(sanitizeDeviceName("'; DROP TABLE users; --")).toBe("' DROP TABLE users --");
    });

    it('should handle null bytes', () => {
      expect(sanitizeDeviceName('Device\0Name')).toBe('DeviceName');
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================
  describe('Edge Cases', () => {
    it('should handle multiple spaces correctly', () => {
      expect(sanitizeDeviceName('My    Device')).toBe('My    Device');
    });

    it('should handle tab characters (stripped as not in allowlist)', () => {
      expect(sanitizeDeviceName('My\tDevice')).toBe('MyDevice');
    });

    it('should handle newline characters (stripped)', () => {
      expect(sanitizeDeviceName('My\nDevice')).toBe('MyDevice');
    });

    it('should handle carriage return (stripped)', () => {
      expect(sanitizeDeviceName('My\rDevice')).toBe('MyDevice');
    });

    it('should return "Unknown Device" if all characters stripped', () => {
      expect(sanitizeDeviceName('<<<>>>')).toBe('Unknown Device');
      expect(sanitizeDeviceName('@#$%^&*')).toBe('Unknown Device');
    });

    it('should handle very long attack strings', () => {
      const longAttack = '<script>'.repeat(100);
      const result = sanitizeDeviceName(longAttack);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  // =========================================================================
  // CONSISTENCY WITH VALIDATION
  // =========================================================================
  describe('Consistency with Frontend Validation', () => {
    // The frontend validateDeviceName uses pattern: /^[a-zA-Z0-9\s\-_().,'\u0900-\u097F]*$/
    // The backend sanitizeDeviceName should produce output that matches this pattern
    const frontendPattern = /^[a-zA-Z0-9\s\-_().,'\u0900-\u097F]*$/;

    it('should produce output matching frontend validation pattern', () => {
      const testInputs = [
        'My iPhone 14 Pro',
        "John's MacBook",
        'Work-Laptop_2024',
        'मेरा फोन',
        '<script>alert(1)</script>',
        'Device@Home#123',
        '   Trimmed   ',
      ];

      testInputs.forEach(input => {
        const result = sanitizeDeviceName(input);
        if (result !== 'Unknown Device') {
          expect(frontendPattern.test(result)).toBe(true);
        }
      });
    });
  });
});
