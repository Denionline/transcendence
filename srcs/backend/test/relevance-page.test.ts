import test from "node:test";
import assert from "node:assert/strict";

import { planBucketPage } from "../src/modules/search/search.relevance.js";

//	Models Postgres' OFFSET/LIMIT so a page walk can be simulated without a database.
function sliceBucket(label: string, count: number, skip: number, take: number): string[] {
	const rows: string[] = [];
	let index = skip;
	while (index < count && index < skip + take) {
		rows.push(`${label}${index}`);
		index += 1;
	}
	return rows;
}

function walkEveryPage(countA: number, countB: number, pageSize: number): string[] {
	const collected: string[] = [];
	const total = countA + countB;
	let page = 1;

	while ((page - 1) * pageSize < total) {
		const plan = planBucketPage((page - 1) * pageSize, pageSize, countA);
		collected.push(...sliceBucket("A", countA, plan.skipA, plan.takeA));
		collected.push(...sliceBucket("B", countB, plan.skipB, plan.takeB));
		page += 1;
	}
	return collected;
}

function expectedOrder(countA: number, countB: number): string[] {
	return [...sliceBucket("A", countA, 0, countA), ...sliceBucket("B", countB, 0, countB)];
}

test("planBucketPage keeps a page fully inside A when it fits", () => {
	assert.deepEqual(planBucketPage(0, 2, 5), { skipA: 0, takeA: 2, skipB: 0, takeB: 0 });
	assert.deepEqual(planBucketPage(2, 2, 5), { skipA: 2, takeA: 2, skipB: 0, takeB: 0 });
});

test("planBucketPage treats a page ending exactly on the seam as fully inside A", () => {
	assert.deepEqual(planBucketPage(3, 2, 5), { skipA: 3, takeA: 2, skipB: 0, takeB: 0 });
});

test("planBucketPage splits a page that straddles the seam", () => {
	assert.deepEqual(planBucketPage(2, 2, 3), { skipA: 2, takeA: 1, skipB: 0, takeB: 1 });
	assert.deepEqual(planBucketPage(0, 4, 1), { skipA: 0, takeA: 1, skipB: 0, takeB: 3 });
});

test("planBucketPage offsets into B once A is exhausted", () => {
	assert.deepEqual(planBucketPage(3, 2, 3), { skipA: 0, takeA: 0, skipB: 0, takeB: 2 });
	assert.deepEqual(planBucketPage(4, 2, 3), { skipA: 0, takeA: 0, skipB: 1, takeB: 2 });
});

test("planBucketPage reads only B when no title matched", () => {
	assert.deepEqual(planBucketPage(0, 2, 0), { skipA: 0, takeA: 0, skipB: 0, takeB: 2 });
	assert.deepEqual(planBucketPage(6, 2, 0), { skipA: 0, takeA: 0, skipB: 6, takeB: 2 });
});

test("planBucketPage asks for a page's worth of rows in every branch", () => {
	let countA = 0;
	while (countA <= 6) {
		let skip = 0;
		while (skip <= 12) {
			const plan = planBucketPage(skip, 4, countA);
			assert.equal(
				plan.takeA + plan.takeB,
				4,
				`takeA + takeB must equal pageSize (skip=${skip}, countA=${countA})`,
			);
			skip += 1;
		}
		countA += 1;
	}
});

test("walking every page yields each row exactly once, A before B", () => {
	let countA = 0;
	while (countA <= 6) {
		let countB = 0;
		while (countB <= 6) {
			let pageSize = 1;
			while (pageSize <= 4) {
				assert.deepEqual(
					walkEveryPage(countA, countB, pageSize),
					expectedOrder(countA, countB),
					`walk mismatch for countA=${countA}, countB=${countB}, pageSize=${pageSize}`,
				);
				pageSize += 1;
			}
			countB += 1;
		}
		countA += 1;
	}
});

test("a page past the end of both buckets comes back empty", () => {
	const plan = planBucketPage(100, 20, 3);
	assert.deepEqual(plan, { skipA: 0, takeA: 0, skipB: 97, takeB: 20 });
	assert.deepEqual(sliceBucket("B", 5, plan.skipB, plan.takeB), []);
});
