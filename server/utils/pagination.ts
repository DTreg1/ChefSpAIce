/**
 * Paginated response structure
 * @template T - Type of data items
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  offset: number;
}

/**
 * Utility class for handling standardized pagination
 */
export class PaginationHelper {
  /**
   * Creates a standardized paginated response
   * @param data The array of data items
   * @param total Total count of items in the database
   * @param page Current page number (1-indexed)
   * @param limit Items per page
   * @returns Standardized PaginatedResponse
   */
  static createResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<T> {
    const offset = (page - 1) * limit;
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
      offset
    };
  }

  /**
   * Parse pagination parameters from query string
   * @param query Query parameters object
   * @param defaultLimit Default items per page
   * @returns Parsed pagination parameters
   */
  static parseParams(
    query: any,
    defaultLimit: number = 20
  ): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  }

  /**
   * Validate pagination parameters
   * @param page Page number
   * @param limit Items per page
   * @returns true if parameters are valid
   */
  static validateParams(page: number, limit: number): boolean {
    return page >= 1 && limit >= 1 && limit <= 100;
  }

  /**
   * Calculate total pages
   * @param total Total items count
   * @param limit Items per page
   * @returns Total number of pages
   */
  static calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  /**
   * Check if a page number is valid for given total
   * @param page Page number to check
   * @param total Total items count
   * @param limit Items per page
   * @returns true if page is within valid range
   */
  static isPageValid(page: number, total: number, limit: number): boolean {
    const totalPages = this.calculateTotalPages(total, limit);
    return page >= 1 && page <= totalPages;
  }
}