import { pb } from './pocketbase';

export interface BatchRequest {
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  body?: any;
  headers?: Record<string, string>;
}

export interface BatchResponse {
  status: number;
  body: any;
}

export interface BatchResult {
  success: boolean;
  responses: BatchResponse[];
  errors?: any[];
}

/**
 * Execute batch operations using PocketBase's batch API
 * @param requests Array of batch requests
 * @returns Promise with batch result
 */
export async function executeBatch(requests: BatchRequest[]): Promise<BatchResult> {
  try {
    const response = await pb.send('/api/batch', {
      method: 'POST',
      body: { requests },
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // The response is the array directly, not wrapped in a 'responses' property
    return {
      success: true,
      responses: response || []
    };
  } catch (error: any) {
    console.error('Batch operation failed:', error);
    return {
      success: false,
      responses: [],
      errors: [error.message || 'Batch operation failed']
    };
  }
}

/**
 * Create multiple records in a collection using batch API
 * @param collection Collection name
 * @param records Array of records to create
 * @returns Promise with created records
 */
export async function batchCreate<T extends Record<string, any>>(
  collection: string, 
  records: Omit<T, 'id' | 'created' | 'updated'>[]
): Promise<T[]> {
  if (records.length === 0) return [];

  const requests: BatchRequest[] = records.map(record => ({
    method: 'POST',
    url: `/api/collections/${collection}/records`,
    body: record
  }));

  const result = await executeBatch(requests);

  if (!result.success) {
    throw new Error(`Batch create failed: ${result.errors?.join(', ')}`);
  }

  return result.responses.map(response => response.body);
}

/**
 * Update multiple records in a collection using batch API
 * @param collection Collection name
 * @param updates Array of objects with id and data to update
 * @returns Promise with updated records
 */
export async function batchUpdate<T extends Record<string, any>>(
  collection: string,
  updates: Array<{ id: string; data: Partial<T> }>
): Promise<T[]> {
  if (updates.length === 0) return [];

  const requests: BatchRequest[] = updates.map(update => ({
    method: 'PATCH',
    url: `/api/collections/${collection}/records/${update.id}`,
    body: update.data
  }));

  const result = await executeBatch(requests);

  if (!result.success) {
    throw new Error(`Batch update failed: ${result.errors?.join(', ')}`);
  }

  return result.responses.map(response => response.body);
}

/**
 * Delete multiple records in a collection using batch API
 * @param collection Collection name
 * @param ids Array of record IDs to delete
 * @returns Promise with success status
 */
export async function batchDelete(
  collection: string,
  ids: string[]
): Promise<boolean> {
  if (ids.length === 0) return true;

  const requests: BatchRequest[] = ids.map(id => ({
    method: 'DELETE',
    url: `/api/collections/${collection}/records/${id}`
  }));

  const result = await executeBatch(requests);

  if (!result.success) {
    throw new Error(`Batch delete failed: ${result.errors?.join(', ')}`);
  }

  return true;
}

/**
 * Upsert multiple records in a collection using batch API
 * @param collection Collection name
 * @param records Array of records to upsert (must include id for updates)
 * @returns Promise with upserted records
 */
export async function batchUpsert<T extends Record<string, any>>(
  collection: string,
  records: Array<Partial<T> & { id?: string }>
): Promise<T[]> {
  if (records.length === 0) return [];

  const requests: BatchRequest[] = records.map(record => {
    const isUpdate = !!record.id;
    return {
      method: isUpdate ? 'PATCH' : 'POST',
      url: isUpdate 
        ? `/api/collections/${collection}/records/${record.id}`
        : `/api/collections/${collection}/records`,
      body: record
    };
  });

  const result = await executeBatch(requests);

  if (!result.success) {
    throw new Error(`Batch upsert failed: ${result.errors?.join(', ')}`);
  }

  return result.responses.map(response => response.body);
}