import Charm from "@rbxts/charm";
import Object from "@rbxts/object-utils";

type MapLike<T> = Readonly<Record<string, T | undefined>>;
type Unsubscribe = () => void;

export function watchMap<T>(
	atom: (update?: ((v: MapLike<T>) => MapLike<T>) | MapLike<T>) => MapLike<T>,
	handlers: {
		added?: (id: string, cur: T) => void;
		changed?: (id: string, prev: T, cur: T) => void;
		removed?: (id: string, prev: T) => void;
	},
): Unsubscribe {
	let prev = atom();
	const { added, changed, removed } = handlers;

	return Charm.subscribe(atom, (nxt) => {
		for (const [id, p] of Object.entries(prev)) {
			if (nxt[id as string] === undefined) removed?.(id as string, p);
		}
		for (const [id, n] of Object.entries(nxt)) {
			const key = id as string;
			const p = prev[key];
			if (p === undefined) added?.(key, n);
			else if (p !== n) changed?.(key, p, n);
		}
		prev = nxt;
	});
}
