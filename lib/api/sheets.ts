/**
 * Sheet API Service
 * Handles all sheet-related API calls
 * 
 * Supports multiple response formats from backend:
 * - { data: { escalations: [...] } }  - Escalation sheet
 * - { data: { tech: [...] } }          - Tech sheet
 * - { data: { rows: [...] } }          - Generic format
 */

import { apiClient, ApiResponse } from './client';
import { RowData } from '@/types';

/**
 * Backend response format for sheet data
 * Supports multiple data property names for flexibility
 */
export interface SheetData {
  escalations?: RowData[];  // Escalation sheet format
  tech?: RowData[];         // Tech sheet format
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
      console.error('Failed to update escalation entries:', error);
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
      const response = await apiClient.get<ApiResponse<SheetData>>(
        `/sheets/${sheetName}`
      );

      return extractRowsFromResponse(response.data);
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
}

// Export singleton instance
export const sheetApiService = new SheetApiService();

// Export class for testing
export default SheetApiService;

