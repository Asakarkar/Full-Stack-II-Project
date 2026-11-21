import { normalizeSpringPage } from "../lib/pagination";

describe("normalizeSpringPage", () => {
  it("maps Spring's zero-based page and content metadata to the app page model", () => {
    const items = [{ id: "student-1" }];
    expect(normalizeSpringPage({
      content: items,
      pageable: {},
      totalPages: 4,
      totalElements: 31,
      last: false,
      size: 10,
      number: 1,
      sort: {},
      numberOfElements: 10,
      first: false,
      empty: false,
    })).toEqual({
      items,
      page: 2,
      limit: 10,
      total: 31,
      totalPages: 4,
      first: false,
      last: false,
      empty: false,
    });
  });

  it("preserves an empty last page", () => {
    expect(normalizeSpringPage({
      content: [],
      totalPages: 0,
      totalElements: 0,
      last: true,
      size: 20,
      number: 0,
      numberOfElements: 0,
      first: true,
      empty: true,
    })).toMatchObject({ items: [], page: 1, total: 0, totalPages: 0, empty: true });
  });
});
