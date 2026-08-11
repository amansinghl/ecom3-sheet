/**
 * Sheet API Service
 * Handles all sheet-related API calls
 * 
 * Supports multiple response formats from backend:
 * - { data: { escalations: [...] } }  - Escalation sheet
 * - { data: { tech: [...] } }          - Tech sheet
 * - { data: { rows: [...] } }          - Generic format
 */

import { apiClient, ApiError, ApiResponse } from './client';
import { MediaItem, RowData } from '@/types';

/**
 * Backend response format for sheet data
 * Supports multiple data property names for flexibility
 */
export interface SheetData {
  escalations?: RowData[];  // Escalation sheet format
  tech?: RowData[];         // Tech sheet format
  lsd?: RowData[];          // LSD sheet format
  logs?: RowData[];         // N8N logs sheet format
  leads?: RowData[];        // Lead Manager sheet format
  rows?: RowData[];         // Generic format
  [key: string]: any;       // Allow other sheet types
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface UpdateSheetPayload {
  [key: string]: any;
}

export interface EscalationResponse {
  escalation: RowData;
}

/**
 * Response payload of the escalation media upload/delete endpoints.
 * Both return the row's full, post-operation attachment list.
 */
export interface EscalationMediaResponse {
  media: MediaItem[];
}

/** Backend limits for escalation attachments - mirrored here for client-side guards */
export const MEDIA_MAX_FILES_PER_UPLOAD = 10;
export const MEDIA_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export interface LSDResponse {
  lsd?: RowData;
  lsd_record?: RowData; // Actual API response structure
  [key: string]: any;
}

/**
 * Helper function to extract rows from different response formats
 * Provides flexibility for different backend response structures
 */
function extractRowsFromResponse(data: SheetData): RowData[] {
  if (Array.isArray(data.rows)) {
    return data.rows;
  }
  if (Array.isArray(data.escalations)) {
    return data.escalations;
  }
  if (Array.isArray(data.tech)) {
    return data.tech;
  }
  if (Array.isArray(data.lsd)) {
    return data.lsd;
  }
  if (Array.isArray(data.logs)) {
    return data.logs;
  }
  if (Array.isArray(data.leads)) {
    return data.leads;
  }
  // Fallback: check for array properties
  for (const key in data) {
    if (Array.isArray(data[key as keyof SheetData])) {
      return data[key as keyof SheetData] as RowData[];
    }
  }
  return [];
}

class SheetApiService {
  /**
   * Get escalation sheet data
   * Fetches escalation records from backend
   * 
   * @returns Array of escalation rows
   * @throws Error if API request fails
   */
  async getEscalationSheet(): Promise<RowData[]> {
    try {
      const response = await apiClient.get<ApiResponse<SheetData>>(
        '/sheets/escalation'
      );

      return extractRowsFromResponse(response.data);
    } catch (error) {
      console.error('Failed to fetch escalation sheet:', error);
      throw error;
    }
  }

  /**
   * Update escalation sheet data by shipment number
   * Fetches/updates escalation details for a specific shipment
   * 
   * @param shipment_no Shipment number to update
   * @returns API response with escalation details
   * @throws Error if API request fails
   */
  async updateEscalationSheet(shipment_no: string): Promise<ApiResponse<EscalationResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<EscalationResponse>>(
        `/sheets/escalation/update/${shipment_no}`
      );

      return response;
    } catch (error) {
      console.error('Failed to update escalation sheet:', error);
      throw error;
    }
  }

  /**
   * Update escalation sheet entries
   * Updates specific fields in an escalation record
   * 
   * @param id The ID of the escalation record
   * @param payload Object containing the fields to update
   * @returns API response with operation result
   * @throws Error if API request fails
   */
  async updateEscalationEntries(
    id: number | string,
    payload: Record<string, any>
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        '/sheets/escalation/update-entries',
        {
          id: Number(id),
          ...payload,
        }
      );

      return response;
    } catch (error) {
      // Error is handled in the component with user-friendly toast messages
      throw error;
    }
  }

  /**
   * Bulk upload escalation entries
   * Uploads multiple escalation records from Excel file
   * 
   * @param data Array of escalation records to upload
   * @returns API response with operation result
   * @throws Error if API request fails
   */
  async bulkUploadEscalations(
    data: Array<{
      shipment_no: string | number;
      manual_case?: string | null;
      followup_remarks?: string | null;
      [key: string]: any;
    }>
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        '/sheets/escalation/bulk-upload-escalations',
        data
      );

      return response;
    } catch (error) {
      console.error('Failed to bulk upload escalations:', error);
      throw error;
    }
  }

  /**
   * Delete escalation by id and shipment number
   * 
   * @param id The ID of the escalation record
   * @param shipment_no Shipment number to delete
   * @returns API response
   * @throws Error if API request fails
   */
  async deleteEscalation(id: number | string, shipment_no: string | number, vamashipper: string | number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `/sheets/escalation/delete/${id}`,
        { shipment_no: shipment_no, vamashipper: vamashipper }
      );
      return response;
    } catch (error) {
      // Error is handled in the component with user-friendly toast messages
      throw error;
    }
  }

  /**
   * Upload attachments to an escalation row
   *
   * Bypasses the JSON api client on purpose: the request is multipart, so only
   * the Authorization header is set and the browser generates the boundary.
   * Uses XHR (not fetch) so upload progress can be reported.
   *
   * @param id The ID of the escalation record
   * @param files Files to upload (max 10, max 100 MB each - enforced by backend too)
   * @param onProgress Optional callback receiving upload progress as 0-100
   * @returns The row's full attachment list after the upload
   * @throws ApiError if the request fails
   */
  async uploadEscalationMedia(
    id: number | string,
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<MediaItem[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files[]', file));

    const token = apiClient.getToken();
    const url = `${apiClient.getBaseUrl()}/sheets/escalation/media/upload/${id}`;

    return new Promise<MediaItem[]>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      // Authorization only - setting Content-Type here would break the boundary
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (onProgress && event.lengthComputable && event.total > 0) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        let payload: {
          data?: { media?: MediaItem[] };
          message?: string;
          error?: string;
          errors?: { msg?: string; message?: string };
        } = {};
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          payload = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload?.data?.media ?? []);
          return;
        }

        const error: ApiError = {
          message:
            payload?.errors?.msg ||
            payload?.errors?.message ||
            payload?.message ||
            payload?.error ||
            xhr.statusText ||
            'Failed to upload attachments',
          status: xhr.status,
        };
        reject(error);
      };

      xhr.onerror = () => {
        const error: ApiError = { message: 'Network request failed', status: 0 };
        reject(error);
      };

      xhr.send(formData);
    });
  }

  /**
   * Delete a single attachment from an escalation row
   *
   * @param id The ID of the escalation record
   * @param key Storage key of the attachment to remove
   * @returns The row's full attachment list after the delete
   * @throws Error if API request fails
   */
  async deleteEscalationMedia(id: number | string, key: string): Promise<MediaItem[]> {
    const response = await apiClient.post<ApiResponse<EscalationMediaResponse>>(
      `/sheets/escalation/media/delete/${id}`,
      { key }
    );

    return response.data?.media ?? [];
  }

  /**
   * Get tech sheet data
   * Fetches tech sheet records from backend
   *
   * @returns Array of tech sheet rows
   * @throws Error if API request fails
   */
  async getTechSheet(): Promise<RowData[]> {
    try {
      const response = await apiClient.get<ApiResponse<SheetData>>(
        '/sheets/tech'
      );

      return extractRowsFromResponse(response.data);
    } catch (error) {
      console.error('Failed to fetch tech sheet:', error);
      throw error;
    }
  }

  /**
   * Update tech sheet data
   * Sends updates for tech records to backend
   * 
   * @param payload Update data
   * @returns API response with operation result
   * @throws Error if API request fails
   */
  async updateTechSheet(payload: UpdateSheetPayload): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        '/sheets/tech/update',
        payload
      );

      return response;
    } catch (error) {
      console.error('Failed to update tech sheet:', error);
      throw error;
    }
  }

  /**
   * Generic method to get any sheet data
   * Supports multiple sheet types with flexible response parsing
   * 
   * @param sheetName Name of the sheet (e.g., 'escalation', 'tech')
   * @returns Array of rows from the sheet
   * @throws Error if API request fails
   */
  async getSheetData(sheetName: string): Promise<RowData[]> {
    try {
      const response = await apiClient.get<any>(
        `/sheets/${sheetName}`
      );

      // Handle different response structures
      // Backend may return: { data: { logs: [...] }, meta: {...} }
      // Or: { data: { escalations: [...] } }
      // Or: { data: { data: { logs: [...] } } } (nested)
      let dataToExtract: SheetData;
      
      if (response && typeof response === 'object') {
        // Check if response has a data property
        if (response.data && typeof response.data === 'object') {
          // Check if response.data has a data property (nested structure)
          if (response.data.data && typeof response.data.data === 'object') {
            dataToExtract = response.data.data;
          } else {
            // Use response.data directly (e.g., { logs: [...], count: 3 })
            dataToExtract = response.data;
          }
        } else {
          // Response itself is the data
          dataToExtract = response as SheetData;
        }
      } else {
        // Fallback: use response directly
        dataToExtract = response as SheetData;
      }

      let extracted = extractRowsFromResponse(dataToExtract);
      
      // Ensure each row has an id field (required for DataGrid)
      // For n8n-logs, use _unix_timestamp or _stored_at as id if available
      if (sheetName === 'n8n-logs') {
        extracted = extracted.map((row: RowData, index: number) => {
          // Use _unix_timestamp as id if available, otherwise use index
          if (!row.id) {
            if (row._unix_timestamp) {
              row.id = `n8n-${row._unix_timestamp}-${index}`;
            } else if (row._stored_at) {
              row.id = `n8n-${row._stored_at}-${index}`;
            } else {
              row.id = `n8n-${Date.now()}-${index}`;
            }
          }
          return row;
        });
      }
      
      // Debug logging for n8n-logs
      if (sheetName === 'n8n-logs') {
        console.log('N8N Logs - Response structure:', response);
        console.log('N8N Logs - Data to extract:', dataToExtract);
        console.log('N8N Logs - Extracted rows:', extracted);
      }
      
      return extracted;
    } catch (error) {
      console.error(`Failed to fetch ${sheetName} sheet:`, error);
      throw error;
    }
  }

  /**
   * Generic method to update any sheet data
   * Supports multiple sheet types
   * 
   * @param sheetName Name of the sheet (e.g., 'escalation', 'tech')
   * @param payload Update data
   * @returns API response with operation result
   * @throws Error if API request fails
   */
  async updateSheetData(
    sheetName: string,
    payload: UpdateSheetPayload
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `/sheets/${sheetName}/update`,
        payload
      );

      return response;
    } catch (error) {
      console.error(`Failed to update ${sheetName} sheet:`, error);
      throw error;
    }
  }

  /**
   * Update LSD sheet data by shipment number
   * Fetches/updates LSD details for a specific shipment
   * 
   * @param shipment_no Shipment number to update
   * @returns API response with LSD details
   * @throws Error if API request fails
   */
  async updateLSDSheet(shipment_no: string): Promise<ApiResponse<LSDResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<LSDResponse>>(
        `/sheets/lsd/update/${shipment_no}`
      );

      return response;
    } catch (error) {
      console.error('Failed to update LSD sheet:', error);
      throw error;
    }
  }

  /**
   * Get LSD sheet data
   * Fetches LSD records from backend
   * 
   * @returns Array of LSD rows
   * @throws Error if API request fails
   */
  async getLSDSheet(): Promise<RowData[]> {
    try {
      const response = await apiClient.get<ApiResponse<SheetData>>(
        '/sheets/lsd'
      );

      return extractRowsFromResponse(response.data);
    } catch (error) {
      console.error('Failed to fetch LSD sheet:', error);
      throw error;
    }
  }

  /**
   * Update LSD sheet entries
   * Updates specific fields in an LSD record
   * 
   * @param id The ID of the LSD record
   * @param payload Object containing the fields to update
   * @returns API response with operation result
   * @throws Error if API request fails
   */
  async updateLSDEntries(
    id: number | string,
    payload: Record<string, any>
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        '/sheets/lsd/update-entries',
        {
          id: Number(id),
          ...payload,
        }
      );

      return response;
    } catch (error) {
      // Error is handled in the component with user-friendly toast messages
      throw error;
    }
  }

  /**
   * Delete LSD entry by id
   * 
   * @param id The ID of the LSD record
   * @param vamashipper Vamashipper for authorization
   * @returns API response
   * @throws Error if API request fails
   */
  async deleteLSD(id: number | string, vamashipper: string | number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `/sheets/lsd/delete/${id}`,
        { vamashipper: vamashipper }
      );
      return response;
    } catch (error) {
      // Error is handled in the component with user-friendly toast messages
      throw error;
    }
  }

  /**
   * Get lead manager sheet data
   */
  async getLeadSheet(): Promise<RowData[]> {
    try {
      const response = await apiClient.get<ApiResponse<SheetData>>(
        '/sheets/leads'
      );
      return extractRowsFromResponse(response.data);
    } catch (error) {
      console.error('Failed to fetch lead sheet:', error);
      throw error;
    }
  }

  /**
   * Get sales employees for lead assignment dropdown
   */
  async getSalesEmployees(): Promise<{ id: number; email: string; name: string }[]> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        '/sheets/leads/sales-employees'
      );
      return response.data?.employees || [];
    } catch (error) {
      console.error('Failed to fetch sales employees:', error);
      return [];
    }
  }

  /**
   * Update lead manager sheet entries
   */
  async updateLeadEntries(
    id: number | string,
    payload: Record<string, any>
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        '/sheets/leads/update-entries',
        {
          id: Number(id),
          ...payload,
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add escalation from N8N logs
   * Adds an escalation entry from N8N log data
   * 
   * @param reference_number Reference number (AWB or shipment number)
   * @param payload Object containing manual_case, notes, vamashipper, is_from_n8n, _redis_key
   * @returns API response with operation result
   * @throws Error if API request fails
   */
  async addEscalationFromN8N(
    reference_number: string,
    payload: {
      manual_case: string;
      notes: string;
      is_from_n8n: number;
      _redis_key?: string;
    }
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `/sheets/n8n-logs/update/${reference_number}`,
        payload
      );
      return response;
    } catch (error) {
      console.error('Failed to add escalation from N8N:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sheetApiService = new SheetApiService();

// Export class for testing
export default SheetApiService;

