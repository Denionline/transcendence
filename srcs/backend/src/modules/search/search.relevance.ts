export interface BucketPage {
	skipA: number;
	takeA: number;
	skipB: number;
	takeB: number;
}

export function planBucketPage(skip: number, pageSize: number, countA: number): BucketPage {
	const isFullyInsideA = skip + pageSize <= countA;
	if (isFullyInsideA === true) {
		return { skipA: skip, takeA: pageSize, skipB: 0, takeB: 0 };
	}

	const isFullyInsideB = skip >= countA;
	if (isFullyInsideB === true) {
		return { skipA: 0, takeA: 0, skipB: skip - countA, takeB: pageSize };
	}

	//	skipB is 0 because only the first page to reach into B can straddle.
	const takeA = countA - skip;
	return { skipA: skip, takeA, skipB: 0, takeB: pageSize - takeA };
}
