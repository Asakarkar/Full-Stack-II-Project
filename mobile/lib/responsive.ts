import { useWindowDimensions } from "react-native";

export interface ResponsiveInfo {
  width: number;
  height: number;
  isSmallPhone: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTabletOrDesktop: boolean;
  isLandscape: boolean;
  contentMaxWidth: number;
  horizontalPadding: number;
}

export function computeResponsive(width: number, height: number): ResponsiveInfo {
  const isSmallPhone = width < 375;
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isTabletOrDesktop = isTablet || isDesktop;
  const isLandscape = width > height;

  const contentMaxWidth = isDesktop ? 940 : isTablet ? 760 : undefined;
  const horizontalPadding = isSmallPhone ? 12 : isPhone ? 18 : 28;

  return {
    width,
    height,
    isSmallPhone,
    isPhone,
    isTablet,
    isDesktop,
    isTabletOrDesktop,
    isLandscape,
    contentMaxWidth: contentMaxWidth ?? 900,
    horizontalPadding,
  };
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  return computeResponsive(width, height);
}
