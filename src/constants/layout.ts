/**
 * Layout constants — header height, padding, touch targets.
 * Change header height, card overlap, etc. from this file only.
 */

export const layout = {
  horizontalScreenPadding: 16,
  cardPadding: 16,
  contentGap: 12,
  headerMinHeight: 64,
  compactHeaderContentHeight: 56,
  headerCurveRadius: 16,
  backButtonTouchTarget: 44,
  backArrowIconSize: 24,
  backArrowTopOffset: 0,
  minTouchTarget: 44,
  statCardMinHeight: 80,
  headerAvatarSize: 36,
  compactBarHeight: 44,
  loginHeaderMinHeight: 220,
  loginHeaderMaxHeight: 380,
  loginWhiteCardOverlap: 75,
  contentMaxWidth: 328,
  tokenGreenHeaderMinHeight: 220,
  tokenGreenHeaderMaxHeight: 320,
  tokenCardOverlap: 80,
} as const;
