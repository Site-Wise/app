import { describe, it, expect } from 'vitest';
import { translations } from '../../locales';

/**
 * Helper function to extract all keys from a nested object
 */
function extractKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recursively extract keys from nested objects
        keys.push(...extractKeys(obj[key], fullKey));
      } else {
        // Add leaf keys
        keys.push(fullKey);
      }
    }
  }
  
  return keys.sort();
}

/**
 * Helper function to get missing keys between two sets
 */
function getMissingKeys(referenceKeys: string[], targetKeys: string[]): string[] {
  return referenceKeys.filter(key => !targetKeys.includes(key));
}

/**
 * Helper function to get extra keys in target that are not in reference
 */
function getExtraKeys(referenceKeys: string[], targetKeys: string[]): string[] {
  return targetKeys.filter(key => !referenceKeys.includes(key));
}

describe('Translation Consistency', () => {
  it('should have all supported languages defined', () => {
    expect(translations).toBeDefined();
    expect(translations.en).toBeDefined();
    expect(translations.hi).toBeDefined();
  });

  it('should have matching keys across all language files', () => {
    const languages = Object.keys(translations);
    const referenceLanguage = 'en';
    const referenceKeys = extractKeys(translations[referenceLanguage]);

    // Test each language against the reference language (English)
    for (const lang of languages) {
      if (lang === referenceLanguage) continue;

      const targetKeys = extractKeys(translations[lang as keyof typeof translations]);
      const missingKeys = getMissingKeys(referenceKeys, targetKeys);
      const extraKeys = getExtraKeys(referenceKeys, targetKeys);

      // Create detailed error messages
      let errorMessage = '';
      
      if (missingKeys.length > 0) {
        errorMessage += `\n\nMissing keys in ${lang} translation:\n`;
        errorMessage += missingKeys.map(key => `  - ${key}`).join('\n');
      }
      
      if (extraKeys.length > 0) {
        errorMessage += `\n\nExtra keys in ${lang} translation (not in ${referenceLanguage}):\n`;
        errorMessage += extraKeys.map(key => `  - ${key}`).join('\n');
      }

      if (errorMessage) {
        errorMessage = `Translation keys mismatch between ${referenceLanguage} and ${lang}:${errorMessage}`;
        errorMessage += `\n\nSummary:`;
        errorMessage += `\n  ${referenceLanguage} has ${referenceKeys.length} keys`;
        errorMessage += `\n  ${lang} has ${targetKeys.length} keys`;
        errorMessage += `\n  Missing in ${lang}: ${missingKeys.length}`;
        errorMessage += `\n  Extra in ${lang}: ${extraKeys.length}`;
      }

      expect(missingKeys.length).toBe(0);
      expect(extraKeys.length).toBe(0);

      if (errorMessage) {
        throw new Error(errorMessage);
      }
    }
  });

  it('should not have empty translation values', () => {
    const languages = Object.keys(translations);

    for (const lang of languages) {
      const keys = extractKeys(translations[lang as keyof typeof translations]);
      const emptyKeys: string[] = [];

      for (const key of keys) {
        const keyParts = key.split('.');
        let value: any = translations[lang as keyof typeof translations];
        
        for (const part of keyParts) {
          value = value[part];
        }

        if (typeof value === 'string' && value.trim() === '') {
          emptyKeys.push(key);
        }
      }

      if (emptyKeys.length > 0) {
        const errorMessage = `Empty translation values found in ${lang}:\n${emptyKeys.map(key => `  - ${key}`).join('\n')}`;
        throw new Error(errorMessage);
      }

      expect(emptyKeys.length).toBe(0);
    }
  });

  it('should have valid interpolation placeholders', () => {
    const languages = Object.keys(translations);
    
    for (const lang of languages) {
      const keys = extractKeys(translations[lang as keyof typeof translations]);
      const invalidPlaceholders: string[] = [];

      for (const key of keys) {
        const keyParts = key.split('.');
        let value: any = translations[lang as keyof typeof translations];
        
        for (const part of keyParts) {
          value = value[part];
        }

        if (typeof value === 'string') {
          // Check for valid placeholder format {variable}
          const placeholders = value.match(/\{[^}]*\}/g) || [];
          
          for (const placeholder of placeholders) {
            // Check if placeholder contains only valid characters (letters, numbers, underscore)
            if (!/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(placeholder)) {
              invalidPlaceholders.push(`${key}: "${placeholder}" in "${value}"`);
            }
          }
        }
      }

      if (invalidPlaceholders.length > 0) {
        const errorMessage = `Invalid interpolation placeholders found in ${lang}:\n${invalidPlaceholders.map(item => `  - ${item}`).join('\n')}`;
        throw new Error(errorMessage);
      }

      expect(invalidPlaceholders.length).toBe(0);
    }
  });

  it('should have consistent interpolation placeholders across languages', () => {
    const referenceLanguage = 'en';
    const languages = Object.keys(translations);
    const referenceKeys = extractKeys(translations[referenceLanguage]);

    for (const lang of languages) {
      if (lang === referenceLanguage) continue;

      const inconsistentPlaceholders: string[] = [];

      for (const key of referenceKeys) {
        const keyParts = key.split('.');
        
        // Get reference value
        let referenceValue: any = translations[referenceLanguage];
        let targetValue: any = translations[lang as keyof typeof translations];
        
        let keyExists = true;
        for (const part of keyParts) {
          if (referenceValue && typeof referenceValue === 'object' && part in referenceValue) {
            referenceValue = referenceValue[part];
          } else {
            break;
          }
          
          if (targetValue && typeof targetValue === 'object' && part in targetValue) {
            targetValue = targetValue[part];
          } else {
            keyExists = false;
            break;
          }
        }

        if (keyExists && typeof referenceValue === 'string' && typeof targetValue === 'string') {
          const referencePlaceholders = (referenceValue.match(/\{[^}]*\}/g) || []).sort();
          const targetPlaceholders = (targetValue.match(/\{[^}]*\}/g) || []).sort();

          if (JSON.stringify(referencePlaceholders) !== JSON.stringify(targetPlaceholders)) {
            inconsistentPlaceholders.push(
              `${key}: ${referenceLanguage}="${referenceValue}" vs ${lang}="${targetValue}"`
            );
          }
        }
      }

      if (inconsistentPlaceholders.length > 0) {
        const errorMessage = `Inconsistent interpolation placeholders between ${referenceLanguage} and ${lang}:\n${inconsistentPlaceholders.map(item => `  - ${item}`).join('\n')}`;
        throw new Error(errorMessage);
      }

      expect(inconsistentPlaceholders.length).toBe(0);
    }
  });

  it('should have valid JSON structure', () => {
    const languages = Object.keys(translations);

    for (const lang of languages) {
      const translationData = translations[lang as keyof typeof translations];
      
      expect(translationData).toBeDefined();
      expect(typeof translationData).toBe('object');
      expect(translationData).not.toBeNull();
      expect(Array.isArray(translationData)).toBe(false);
    }
  });

  it('should provide helpful error information when keys are missing', () => {
    // This test documents the expected behavior and provides a reference for developers
    const languages = Object.keys(translations);
    const referenceLanguage = 'en';
    const referenceKeys = extractKeys(translations[referenceLanguage]);

    console.log(`\n📊 Translation Statistics:`);
    console.log(`  Reference language: ${referenceLanguage}`);
    console.log(`  Total keys in ${referenceLanguage}: ${referenceKeys.length}`);
    
    for (const lang of languages) {
      if (lang === referenceLanguage) continue;
      
      const targetKeys = extractKeys(translations[lang as keyof typeof translations]);
      const missingCount = getMissingKeys(referenceKeys, targetKeys).length;
      const extraCount = getExtraKeys(referenceKeys, targetKeys).length;
      const completeness = ((targetKeys.length - extraCount) / referenceKeys.length * 100).toFixed(1);
      
      console.log(`  ${lang}: ${targetKeys.length} keys (${completeness}% complete, ${missingCount} missing, ${extraCount} extra)`);
    }

    // This test verifies translation statistics are meaningful
    expect(languages.length).toBeGreaterThan(1);
    expect(referenceKeys.length).toBeGreaterThan(0);
    
    // Verify each language has meaningful translation data
    for (const lang of languages) {
      if (lang === referenceLanguage) continue;
      
      const targetKeys = extractKeys(translations[lang as keyof typeof translations]);
      expect(targetKeys.length).toBeGreaterThan(0);
      
      // Ensure translations are at least 50% complete to be useful
      const completeness = (targetKeys.length / referenceKeys.length) * 100;
      expect(completeness).toBeGreaterThan(50);
    }
  });
});