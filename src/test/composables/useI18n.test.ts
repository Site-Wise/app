import { describe, it, expect } from 'vitest'
import { useI18n } from '../../composables/useI18n'

describe('useI18n', () => {
  it('should translate simple keys', () => {
    const { t } = useI18n()
    
    expect(t('common.item')).toBe('Item')
    expect(t('common.vendor')).toBe('Vendor')
    expect(t('common.payment')).toBe('Payment')
  })

  it('should interpolate values correctly', () => {
    const { t } = useI18n()
    
    expect(t('messages.createSuccess', { item: 'Item' })).toBe('Item created successfully')
    expect(t('messages.updateSuccess', { item: 'Vendor' })).toBe('Vendor updated successfully')
    expect(t('messages.deleteSuccess', { item: 'Payment' })).toBe('Payment deleted successfully')
  })

  it('should handle nested interpolation', () => {
    const { t } = useI18n()
    
    const itemName = t('common.item')
    expect(t('messages.createSuccess', { item: itemName })).toBe('Item created successfully')
  })

  it('should return key when translation not found', () => {
    const { t } = useI18n()
    
    expect(t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('should handle missing interpolation values', () => {
    const { t } = useI18n()
    
    // Should keep placeholder when value is missing
    expect(t('messages.createSuccess', {})).toBe('{item} created successfully')
    expect(t('messages.createSuccess')).toBe('{item} created successfully')
  })
})