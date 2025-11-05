// src/utils/pagination.js
export const getPagination = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const skip = (p - 1) * l;
  return { page: p, limit: l, skip };
};
