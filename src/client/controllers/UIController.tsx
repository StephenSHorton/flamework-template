import { Controller, OnStart } from "@flamework/core";
import Roact from "@rbxts/roact";
import { Players } from "@rbxts/services";
import { App } from "../ui/App";

@Controller()
export class UIController implements OnStart {
	onStart() {
		const player = Players.LocalPlayer;
		const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

		Roact.mount(<App />, playerGui, "App");
	}
}
