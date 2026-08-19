import { type OnStart, Service } from "@flamework/core";
import { effect } from "@rbxts/charm";
import { createCollection, type Document } from "@rbxts/lapis";
import { RunService } from "@rbxts/services";
import {
	type Data,
	DataManager,
	DEFAULT_DATA,
	IS_DATA,
	normalizeData,
} from "shared/data";
import { PlayerStateService } from "./PlayerStateService";

// In Studio, skip the real DataStore so reloads don't fight over session locks.
// Set to false to test real persistence in Studio.
export const USE_MOCK_DATA = RunService.IsStudio();
const COLLECTION_NAME = USE_MOCK_DATA ? "MockData" : "PlayerData";
const DOCUMENT_PREFIX = USE_MOCK_DATA ? "Mock:" : "Player:";

type Unsubscribe = () => void;

@Service({})
export class DataStoreService implements OnStart {
	private readonly collection = createCollection(COLLECTION_NAME, {
		defaultData: DEFAULT_DATA,
		validate: IS_DATA,
		// Append-only. Each entry upgrades one schema version. Add new entries
		// here when the Data type changes — never edit existing ones. The last
		// migration must return Data.
		//
		// normalizeData fills every field with its default when missing, so it
		// works as a universal "added a new field" migration. To rename or
		// transform existing values, add a separate Migration<unknown> entry
		// before the normalize step.
		migrations: [(data): Data => normalizeData(data as Partial<Data>)],
	});

	private readonly docs = new Map<number, Document<Data>>();
	private readonly subs = new Map<number, Unsubscribe>();
	private readonly sessionStarts = new Map<number, number>();

	public constructor(private readonly playerStateService: PlayerStateService) {}

	public onStart(): void {
		this.playerStateService.onPlayerAdded((player) => {
			this.loadPlayer(player);
		});
		this.playerStateService.onPlayerRemoving((player) => {
			this.unloadPlayer(player);
		});
	}

	private async loadPlayer(player: Player): Promise<void> {
		const id = player.UserId;

		if (USE_MOCK_DATA) {
			DataManager.setData(id, DEFAULT_DATA);
			DataManager.updateData(id, (data) => {
				data.player.lastLogin = os.time();
			});
			this.sessionStarts.set(id, os.time());
			this.playerStateService.markPlayerLoaded(player);
			return;
		}

		const key = `${DOCUMENT_PREFIX}${id}`;

		try {
			const doc = await this.collection.load(key, [id]);

			// Player may have left while we awaited — close the doc cleanly.
			if (!this.playerStateService.getPlayerByUserId(id)) {
				await doc
					.close()
					.catch((e) =>
						warn(
							`[DataStoreService]: close on early-exit failed for ${id}: ${tostring(e)}`,
						),
					);
				return;
			}

			const initial = doc.read();
			const isNewPlayer = initial.player.lastLogin === 0;

			DataManager.setData(id, initial);
			DataManager.updateData(id, (data) => {
				data.player.lastLogin = os.time();
			});

			if (isNewPlayer) {
				print(`[DataStoreService] ${player.Name} is a new player`);
				// Hook: grant starter pack, trigger tutorial, award first-login bonus, etc.
			}

			this.sessionStarts.set(id, os.time());

			const unsubscribe = effect(() => {
				const current = DataManager.getData(id);
				doc.write(current);
			});

			this.subs.set(id, unsubscribe);
			this.docs.set(id, doc);
		} catch (err) {
			warn(
				`[DataStoreService]: failed to load data for ${player.Name} (${id}): ${tostring(err)}`,
			);
			DataManager.setData(id, DEFAULT_DATA);
		}

		this.playerStateService.markPlayerLoaded(player);
	}

	private async unloadPlayer(player: Player): Promise<void> {
		const id = player.UserId;

		// Stamp total play time before any final write so the save includes
		// this session.
		const sessionStart = this.sessionStarts.get(id);
		this.sessionStarts.delete(id);
		if (sessionStart !== undefined) {
			DataManager.updateData(id, (data) => {
				data.player.totalPlayTime += os.time() - sessionStart;
			});
		}

		if (USE_MOCK_DATA) {
			DataManager.deleteData(id);
			return;
		}

		const doc = this.docs.get(id);

		// The reactive effect registered in loadPlayer fires synchronously on
		// every DataManager mutation (Charm 0.11 still notifies inside the
		// setter unless you wrap writes in batch()), so the session-time
		// updateData above already wrote the latest state to the Lapis buffer.
		// No explicit doc.write needed.
		//
		// If you ever wrap mutations in Charm.batch(...) upstream, restore an
		// explicit doc.write here — batched notifications only fire when the
		// batch block closes.

		this.subs.get(id)?.();
		this.subs.delete(id);
		DataManager.deleteData(id);

		if (!doc) return;

		await doc
			.close()
			.catch((e) =>
				warn(`[DataStoreService]: close failed for ${id}: ${tostring(e)}`),
			);
		this.docs.delete(id);
	}
}
