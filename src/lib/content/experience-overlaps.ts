import type { Experience } from "./schemas";

export interface ExperienceOverlap {
  leftId: string;
  rightId: string;
  dateStart: string;
  dateEnd: string | null;
  leftContractType: "unknown";
  rightContractType: "unknown";
  basis: "published-month-ranges";
}

const OPEN_END = "9999-12";

/**
 * Returns chronology facts only. The function deliberately does not infer
 * full-time, part-time, employment or contractor status from an overlap.
 */
export function deriveExperienceOverlaps(
  experience: readonly Experience[],
): ExperienceOverlap[] {
  const ordered = [...experience].sort(
    (left, right) =>
      left.dateStart.localeCompare(right.dateStart) ||
      left.id.localeCompare(right.id),
  );
  const overlaps: ExperienceOverlap[] = [];

  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    const left = ordered[leftIndex];
    if (left === undefined) continue;

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < ordered.length;
      rightIndex += 1
    ) {
      const right = ordered[rightIndex];
      if (right === undefined) continue;

      const overlapStart =
        left.dateStart > right.dateStart ? left.dateStart : right.dateStart;
      const leftEnd = left.dateEnd ?? OPEN_END;
      const rightEnd = right.dateEnd ?? OPEN_END;
      const overlapEnd = leftEnd < rightEnd ? leftEnd : rightEnd;

      if (overlapStart > overlapEnd) continue;

      overlaps.push({
        leftId: left.id,
        rightId: right.id,
        dateStart: overlapStart,
        dateEnd: overlapEnd === OPEN_END ? null : overlapEnd,
        leftContractType: left.contractType,
        rightContractType: right.contractType,
        basis: "published-month-ranges",
      });
    }
  }

  return overlaps;
}
