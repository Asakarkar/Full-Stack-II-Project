import { computeResponsive } from "../lib/responsive";

describe("computeResponsive", () => {
  it("computes small phone layout correctly for 320px width", () => {
    const res = computeResponsive(320, 568);

    expect(res.isSmallPhone).toBe(true);
    expect(res.isPhone).toBe(true);
    expect(res.isTablet).toBe(false);
    expect(res.isDesktop).toBe(false);
    expect(res.isTabletOrDesktop).toBe(false);
    expect(res.isLandscape).toBe(false);
    expect(res.horizontalPadding).toBe(12);
  });

  it("computes standard phone layout correctly for 390px width", () => {
    const res = computeResponsive(390, 844);

    expect(res.isSmallPhone).toBe(false);
    expect(res.isPhone).toBe(true);
    expect(res.isTablet).toBe(false);
    expect(res.isDesktop).toBe(false);
    expect(res.isTabletOrDesktop).toBe(false);
    expect(res.horizontalPadding).toBe(18);
  });

  it("computes tablet layout correctly for 820px width", () => {
    const res = computeResponsive(820, 1180);

    expect(res.isPhone).toBe(false);
    expect(res.isTablet).toBe(true);
    expect(res.isDesktop).toBe(false);
    expect(res.isTabletOrDesktop).toBe(true);
    expect(res.contentMaxWidth).toBe(760);
    expect(res.horizontalPadding).toBe(28);
  });

  it("computes desktop layout correctly for 1440px width", () => {
    const res = computeResponsive(1440, 900);

    expect(res.isPhone).toBe(false);
    expect(res.isTablet).toBe(false);
    expect(res.isDesktop).toBe(true);
    expect(res.isTabletOrDesktop).toBe(true);
    expect(res.isLandscape).toBe(true);
    expect(res.contentMaxWidth).toBe(940);
    expect(res.horizontalPadding).toBe(28);
  });
});
