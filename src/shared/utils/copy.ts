type AnyTable = Record<string, unknown>;

function isTable(value: unknown): value is AnyTable {
	return typeIs(value, "table");
}

export function deepClone<T>(value: T, seen?: Map<AnyTable, AnyTable>): T {
	if (!isTable(value)) return value;
	const cache = seen ?? new Map<AnyTable, AnyTable>();
	const cached = cache.get(value as AnyTable);
	if (cached !== undefined) return cached as T;

	const out: AnyTable = {};
	cache.set(value as AnyTable, out);
	for (const [key, v] of pairs(value as AnyTable)) {
		out[key as string] = deepClone(v, cache);
	}
	return out as T;
}

export function deepMerge<T extends AnyTable>(
	target: T,
	source: Partial<T>,
): T {
	const out: AnyTable = { ...(target as AnyTable) };
	for (const [key, value] of pairs(source as AnyTable)) {
		const k = key as string;
		const current = out[k];
		if (isTable(value) && isTable(current)) {
			out[k] = deepMerge(current as AnyTable, value as AnyTable);
		} else {
			out[k] = value;
		}
	}
	return out as T;
}
