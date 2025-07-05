import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

describe('View Translation Coverage', () => {
  const enTranslations = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../locales/en.json'), 'utf-8')
  )
  
  const hiTranslations = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../locales/hi.json'), 'utf-8')
  )

  // Helper function to get all translation keys from an object with nested structure
  function getAllTranslationKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = []
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys.push(...getAllTranslationKeys(obj[key], fullKey))
      } else {
        keys.push(fullKey)
      }
    }
    return keys
  }

  // Helper function to extract translation keys from Vue file content
  function extractTranslationKeys(content: string): string[] {
    // More precise regex that looks for t( at word boundaries and excludes function calls like checkCreateLimit
    const regex = /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    const keys: string[] = []
    let match
    while ((match = regex.exec(content)) !== null) {
      const key = match[1]
      // Skip dynamic template literals and invalid keys
      if (
        !key.includes('${') && // Skip template literals
        key.length > 1 && // Skip single character keys
        !key.includes('/') && // Skip import paths
        !key.includes('\\n') && // Skip strings with newlines
        !key.includes('.relative') && // Skip CSS classes
        key !== ' ' && // Skip space
        key !== 'T' && // Skip single letters
        key !== 'a' &&
        key !== '2d'
      ) {
        keys.push(key)
      }
    }
    return [...new Set(keys)] // Remove duplicates
  }

  // Helper function to check if a translation key exists in the translations object
  function hasTranslationKey(translations: any, key: string): boolean {
    const parts = key.split('.')
    let current = translations
    for (const part of parts) {
      if (typeof current !== 'object' || current === null || !(part in current)) {
        return false
      }
      current = current[part]
    }
    return typeof current === 'string'
  }

  it('should have all translation keys from UserManagementView in both languages', () => {
    const viewPath = path.resolve(__dirname, '../../views/UserManagementView.vue')
    const content = readFileSync(viewPath, 'utf-8')
    const usedKeys = extractTranslationKeys(content)
    
    const missingEnKeys: string[] = []
    const missingHiKeys: string[] = []
    
    for (const key of usedKeys) {
      if (!hasTranslationKey(enTranslations, key)) {
        missingEnKeys.push(key)
      }
      if (!hasTranslationKey(hiTranslations, key)) {
        missingHiKeys.push(key)
      }
    }

    if (missingEnKeys.length > 0) {
      console.error('Missing English translation keys in UserManagementView:', missingEnKeys)
    }
    if (missingHiKeys.length > 0) {
      console.error('Missing Hindi translation keys in UserManagementView:', missingHiKeys)
    }

    expect(missingEnKeys).toHaveLength(0)
    expect(missingHiKeys).toHaveLength(0)
  })

  it('should have all translation keys from all views in both languages', async () => {
    const viewFiles = await glob('../../views/**/*.vue', { 
      cwd: __dirname,
      absolute: true 
    })
    
    const allMissingEnKeys: Record<string, string[]> = {}
    const allMissingHiKeys: Record<string, string[]> = {}
    
    for (const viewFile of viewFiles) {
      const content = readFileSync(viewFile, 'utf-8')
      const usedKeys = extractTranslationKeys(content)
      const fileName = path.basename(viewFile)
      
      const missingEnKeys: string[] = []
      const missingHiKeys: string[] = []
      
      for (const key of usedKeys) {
        if (!hasTranslationKey(enTranslations, key)) {
          missingEnKeys.push(key)
        }
        if (!hasTranslationKey(hiTranslations, key)) {
          missingHiKeys.push(key)
        }
      }
      
      if (missingEnKeys.length > 0) {
        allMissingEnKeys[fileName] = missingEnKeys
      }
      if (missingHiKeys.length > 0) {
        allMissingHiKeys[fileName] = missingHiKeys
      }
    }

    if (Object.keys(allMissingEnKeys).length > 0) {
      console.error('Missing English translation keys by view:', allMissingEnKeys)
    }
    if (Object.keys(allMissingHiKeys).length > 0) {
      console.error('Missing Hindi translation keys by view:', allMissingHiKeys)
    }

    expect(Object.keys(allMissingEnKeys)).toHaveLength(0)
    expect(Object.keys(allMissingHiKeys)).toHaveLength(0)
  })

  it('should verify translation key consistency between languages', () => {
    const enKeys = getAllTranslationKeys(enTranslations)
    const hiKeys = getAllTranslationKeys(hiTranslations)
    
    const enKeysSet = new Set(enKeys)
    const hiKeysSet = new Set(hiKeys)
    
    const missingInHindi = enKeys.filter(key => !hiKeysSet.has(key))
    const missingInEnglish = hiKeys.filter(key => !enKeysSet.has(key))
    
    if (missingInHindi.length > 0) {
      console.error('Keys present in English but missing in Hindi:', missingInHindi)
    }
    if (missingInEnglish.length > 0) {
      console.error('Keys present in Hindi but missing in English:', missingInEnglish)
    }
    
    expect(missingInHindi).toHaveLength(0)
    expect(missingInEnglish).toHaveLength(0)
  })

  it('should not have empty translation values', () => {
    const emptyEnKeys: string[] = []
    const emptyHiKeys: string[] = []
    
    function checkEmptyValues(obj: any, prefix = '', emptyKeys: string[]) {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          checkEmptyValues(obj[key], fullKey, emptyKeys)
        } else if (typeof obj[key] === 'string' && obj[key].trim() === '') {
          emptyKeys.push(fullKey)
        }
      }
    }
    
    checkEmptyValues(enTranslations, '', emptyEnKeys)
    checkEmptyValues(hiTranslations, '', emptyHiKeys)
    
    if (emptyEnKeys.length > 0) {
      console.error('Empty English translation values:', emptyEnKeys)
    }
    if (emptyHiKeys.length > 0) {
      console.error('Empty Hindi translation values:', emptyHiKeys)
    }
    
    expect(emptyEnKeys).toHaveLength(0)
    expect(emptyHiKeys).toHaveLength(0)
  })
})