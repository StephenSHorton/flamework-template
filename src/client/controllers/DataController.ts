import { Controller, type OnStart } from "@flamework/core";
import Squash from "@rbxts/squash";
import {
	DataFlags,
	DataManager,
	DataReplica,
	parseDataUserId,
} from "shared/data";
import { Events, Functions } from "../network";

const serdesCount = Squash.vlq();

@Controller({})
export class DataController implements OnStart {
	public onStart(): void {
		Events.core.dataDelta.connect((payload) => this.onDataDelta(payload));
		Functions.requestHydration.invoke();
	}

	private onDataDelta(payload: buffer): void {
		const [ok, err] = pcall(() => {
			const cursor = Squash.frombuffer(payload);
			const count = serdesCount.des(cursor);
			// Squash cursor is LIFO — deltas come out in reverse insertion order.
			// Safe because the server emits at most one delta per recordKey per tick.
			for (let i = 0; i < count; i++) {
				const delta = DataReplica.deserialize(cursor);
				const userId = parseDataUserId(delta.key);
				if (userId === undefined) continue;

				if ((delta.flags & DataFlags.Cleanup) !== 0) {
					DataManager.deleteData(userId);
					continue;
				}

				if (delta.data !== undefined) DataManager.setData(userId, delta.data);
			}
		});

		if (!ok)
			warn(`[DataController] failed to deserialize delta: ${tostring(err)}`);
	}
}
