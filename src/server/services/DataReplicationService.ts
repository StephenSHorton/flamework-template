import { type OnStart, Service } from "@flamework/core";
import Object from "@rbxts/object-utils";
import { Players } from "@rbxts/services";
import Squash from "@rbxts/squash";
import { Clock } from "shared/core";
import {
	buildDataKey,
	DataManager,
	DataReplica,
	type DataReplicationDelta,
	dataAtom,
	parseDataUserId,
} from "shared/data";
import { Events, Functions } from "../network";
import { PlayerStateService } from "./PlayerStateService";

const SYNC_INTERVAL = 1 / 10;
const serdesCount = Squash.vlq();

@Service({})
export class DataReplicationService implements OnStart {
	private readonly replicas = new Map<string, DataReplica>();
	private readonly hydratedPlayers = new Set<number>();
	private readonly clock = new Clock(SYNC_INTERVAL);

	public constructor(private readonly playerStateService: PlayerStateService) {}

	public onStart(): void {
		this.playerStateService.onPlayerLoaded((player) =>
			this.sendInitialSnapshot(player),
		);
		this.playerStateService.onPlayerRemoving((player) =>
			this.hydratedPlayers.delete(player.UserId),
		);
		Functions.requestHydration.setCallback((player) =>
			this.sendInitialSnapshot(player),
		);
		this.clock.on(() => this.tick());
	}

	private tick(): void {
		const grouped = this.collectDeltas();

		grouped.forEach((deltas, userId) => {
			if (deltas.size() === 0) return;
			const player = Players.GetPlayerByUserId(userId);
			if (!player) return;
			Events.core.dataDelta(player, this.encode(deltas));
		});
	}

	private collectDeltas(): Map<number, Array<DataReplicationDelta>> {
		const grouped = new Map<number, Array<DataReplicationDelta>>();
		const current = dataAtom();
		const seen = new Set<string>();

		for (const [key, data] of Object.entries(current)) {
			const recordKey = key as string;
			seen.add(recordKey);
			if (data === undefined) continue;

			const userId = parseDataUserId(recordKey);
			if (
				userId === undefined ||
				!this.playerStateService.isPlayerLoaded(userId)
			)
				continue;

			let replica = this.replicas.get(recordKey);
			if (!replica) {
				replica = new DataReplica(recordKey, data);
				this.replicas.set(recordKey, replica);
			}

			const delta = replica.update(data);
			if (delta !== undefined) this.pushDelta(grouped, userId, delta);
		}

		const stale: string[] = [];
		this.replicas.forEach((_, key) => {
			if (!seen.has(key)) stale.push(key);
		});

		for (const key of stale) {
			const replica = this.replicas.get(key);
			if (!replica) continue;
			this.replicas.delete(key);
			const userId = parseDataUserId(key);
			if (userId !== undefined)
				this.pushDelta(grouped, userId, replica.cleanup());
		}

		return grouped;
	}

	private sendInitialSnapshot(player: Player): void {
		if (this.hydratedPlayers.has(player.UserId)) return;

		const key = buildDataKey(player.UserId);
		if (dataAtom()[key] === undefined) return;

		const entry = DataManager.getData(player.UserId);

		let replica = this.replicas.get(key);
		if (!replica) {
			replica = new DataReplica(key, entry);
			this.replicas.set(key, replica);
		}

		const snapshot = replica.snapshotDelta(entry);
		replica.prime();
		this.hydratedPlayers.add(player.UserId);

		Events.core.dataDelta(player, this.encode([snapshot]));
	}

	private encode(deltas: ReadonlyArray<DataReplicationDelta>): buffer {
		// Squash uses a stack cursor: serialize order is read out in LIFO during
		// deserialize. We push deltas first then count; the decoder pops count
		// first then deltas in REVERSE insertion order. Safe today because
		// collectDeltas only emits one delta per recordKey per tick. If you
		// ever batch multiple deltas for the same key in one tick, fix this.
		const cursor = Squash.cursor();
		for (const delta of deltas) DataReplica.serialize(cursor, delta);
		serdesCount.ser(cursor, deltas.size());
		return Squash.tobuffer(cursor);
	}

	private pushDelta(
		grouped: Map<number, Array<DataReplicationDelta>>,
		userId: number,
		delta: DataReplicationDelta,
	): void {
		let list = grouped.get(userId);
		if (!list) {
			list = [] as DataReplicationDelta[];
			grouped.set(userId, list);
		}
		list.push(delta);
	}
}
