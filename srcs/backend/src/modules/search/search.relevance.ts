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

export type BucketFetcher<T> = (skip: number, take: number) => Promise<T[]>;

//	One bucket is empty in both non-straddle branches, so skip the round trip.
async function fetchBucket<T>(fetch: BucketFetcher<T>, skip: number, take: number): Promise<T[]> {
	if (take === 0) return [];
	return await fetch(skip, take);
}

export async function fetchBucketPage<T>(
	page: number,
	pageSize: number,
	countA: number,
	fetchA: BucketFetcher<T>,
	fetchB: BucketFetcher<T>,
): Promise<T[]> {
	const plan = planBucketPage((page - 1) * pageSize, pageSize, countA);
	const [itemsA, itemsB] = await Promise.all([
		fetchBucket(fetchA, plan.skipA, plan.takeA),
		fetchBucket(fetchB, plan.skipB, plan.takeB),
	]);
	return [...itemsA, ...itemsB];
}
