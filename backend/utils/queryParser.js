/**
 * Query Parser - Parse Supabase-like query parameters
 * Supports: select, filter, order, limit, offset
 */

/**
 * Parse query parameters into structured format
 * @param {object} query - Express query object
 * @returns {object} Parsed query
 */
export function parseQuery(query) {
  const result = {
    select: parseSelect(query.select),
    filters: parseFilters(query),
    order: parseOrder(query.order),
    limit: parseLimit(query.limit),
    offset: parseOffset(query.offset)
  };
  
  return result;
}

/**
 * Parse select fields
 * @param {string} select - Comma-separated field names or '*'
 * @returns {string[]|null} Array of field names, or null for all
 */
function parseSelect(select) {
  if (!select) return null;
  if (select === '*') return null;
  return select.split(',').map(f => f.trim());
}

/**
 * Parse filters from query parameters
 * Supports: field=operator.value format
 * @param {object} query - Express query object
 * @returns {object} Filters object
 */
function parseFilters(query) {
  const filters = {};
  const filterKeys = Object.keys(query).filter(key => 
    !['select', 'order', 'limit', 'offset'].includes(key)
  );
  
  for (const key of filterKeys) {
    const value = query[key];
    const match = value.match(/^([^.]+)\.(.+)$/);
    
    if (match) {
      const [, operator, filterValue] = match;
      filters[key] = {
        operator,
        value: parseFilterValue(filterValue)
      };
    } else {
      // Simple equality filter
      filters[key] = {
        operator: 'eq',
        value: parseFilterValue(value)
      };
    }
  }
  
  return filters;
}

/**
 * Parse filter value (handle special cases)
 */
function parseFilterValue(value) {
  // Handle boolean strings
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Handle numbers
  if (!isNaN(value) && value !== '') {
    return Number(value);
  }
  
  return value;
}

/**
 * Parse order/sort parameters
 * Format: field.direction or field1.direction1,field2.direction2
 * @param {string} order - Order string
 * @returns {Array} Array of {field, direction}
 */
function parseOrder(order) {
  if (!order) return [];
  
  return order.split(',').map(part => {
    const [field, direction = 'asc'] = part.trim().split('.');
    return {
      field: field.trim(),
      direction: direction.toLowerCase() === 'desc' ? 'desc' : 'asc'
    };
  });
}

/**
 * Parse limit parameter
 */
function parseLimit(limit) {
  if (!limit) return null;
  const num = parseInt(limit, 10);
  return isNaN(num) || num < 1 ? null : Math.min(num, 1000); // Max 1000
}

/**
 * Parse offset parameter
 */
function parseOffset(offset) {
  if (!offset) return 0;
  const num = parseInt(offset, 10);
  return isNaN(num) || num < 0 ? 0 : num;
}

/**
 * Apply filters to data array
 * @param {Array} data - Data array
 * @param {object} filters - Filters object
 * @returns {Array} Filtered data
 */
export function applyFilters(data, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }
  
  return data.filter(item => {
    return Object.entries(filters).every(([field, filter]) => {
      const value = item[field];
      return applyFilter(value, filter.operator, filter.value);
    });
  });
}

/**
 * Apply a single filter
 */
function applyFilter(value, operator, filterValue) {
  switch (operator) {
    case 'eq':
      return value === filterValue;
    case 'neq':
      return value !== filterValue;
    case 'gt':
      return value > filterValue;
    case 'gte':
      return value >= filterValue;
    case 'lt':
      return value < filterValue;
    case 'lte':
      return value <= filterValue;
    case 'like':
      return String(value).includes(String(filterValue).replace(/%/g, ''));
    case 'ilike':
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase().replace(/%/g, ''));
    case 'in':
      const filterArray = Array.isArray(filterValue) ? filterValue : [filterValue];
      return filterArray.includes(value);
    default:
      return true;
  }
}

/**
 * Apply sorting to data array
 * @param {Array} data - Data array
 * @param {Array} order - Order array
 * @returns {Array} Sorted data
 */
export function applyOrder(data, order) {
  if (!order || order.length === 0) {
    return data;
  }
  
  return [...data].sort((a, b) => {
    for (const { field, direction } of order) {
      const aVal = a[field];
      const bVal = b[field];
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;
      
      if (comparison !== 0) {
        return direction === 'desc' ? -comparison : comparison;
      }
    }
    return 0;
  });
}

/**
 * Apply select fields to data
 * @param {Array|object} data - Data to select from
 * @param {string[]|null} select - Fields to select
 * @returns {Array|object} Selected data
 */
export function applySelect(data, select) {
  if (!select || select.length === 0) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => {
      const selected = {};
      for (const field of select) {
        if (item.hasOwnProperty(field)) {
          selected[field] = item[field];
        }
      }
      return selected;
    });
  } else {
    const selected = {};
    for (const field of select) {
      if (data.hasOwnProperty(field)) {
        selected[field] = data[field];
      }
    }
    return selected;
  }
}

/**
 * Apply pagination
 * @param {Array} data - Data array
 * @param {number|null} limit - Limit
 * @param {number} offset - Offset
 * @returns {Array} Paginated data
 */
export function applyPagination(data, limit, offset) {
  if (limit === null) {
    return data.slice(offset);
  }
  return data.slice(offset, offset + limit);
}

