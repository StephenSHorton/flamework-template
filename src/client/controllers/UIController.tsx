import { Controller, OnStart } from "@flamework/core";
// biome-ignore lint/correctness/noUnusedImports: Required for JSX
import Roact from "@rbxts/roact";
import { Players } from "@rbxts/services";
import { App } from "../ui/App";

@Controller()
export class UIController implements OnStart {
	private tree?: Roact.Tree;

	onStart() {
		const player = Players.LocalPlayer;
		const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

		this.tree = Roact.mount(<App />, playerGui, "App");
	}
}
