/*
 * Ordinal formatting for finishing positions.
 *
 * These strings end up on certificates and in the
 * notification a student receives, so the irregular cases
 * matter: 11, 12 and 13 take "th" even though they end in
 * 1, 2 and 3.
 *
 * Kept free of any database import so it can be tested on
 * its own.
 */

export const getOrdinalSuffix = (
  position: number
): string => {
  if (
    position % 100 >= 11 &&
    position % 100 <= 13
  ) {
    return "th";
  }

  switch (position % 10) {
    case 1:
      return "st";

    case 2:
      return "nd";

    case 3:
      return "rd";

    default:
      return "th";
  }
};

/*
 * "1st place", used in notification copy.
 */
export const getOrdinalPosition = (
  position: number
): string => {
  return `${position}${getOrdinalSuffix(
    position
  )} place`;
};
