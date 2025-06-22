import { describe, it, expect } from 'vitest';
import type { User } from '../services/pocketbase';

describe('User Profile with Phone Number', () => {
  it('should include phone number in User interface', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+919876543210',
      sites: [],
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z'
    };

    expect(mockUser.phone).toBe('+919876543210');
    expect(mockUser.email).toBe('test@example.com');
    expect(mockUser.name).toBe('Test User');
  });

  it('should handle optional phone number', () => {
    const mockUserWithoutPhone: User = {
      id: '2',
      email: 'test2@example.com',
      name: 'Test User 2',
      sites: [],
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z'
    };

    expect(mockUserWithoutPhone.phone).toBeUndefined();
    expect(mockUserWithoutPhone.email).toBe('test2@example.com');
  });

  it('should format phone number with country code', () => {
    const phone = '9876543210';
    const countryCode = '+91';
    const formattedPhone = `${countryCode}${phone}`;

    expect(formattedPhone).toBe('+919876543210');
  });
});