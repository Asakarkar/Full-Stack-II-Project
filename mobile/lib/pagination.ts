import type { PageEnvelope, PageResult } from "./types";

export function normalizeSpringPage<T>(response: PageEnvelope<T>): PageResult<T> {
  return {
    items: response.content,
    page: response.number + 1,
    limit: response.size,
    total: response.totalElements,
    totalPages: response.totalPages,
    first: response.first,
    last: response.last,
    empty: response.empty,
  };
}
