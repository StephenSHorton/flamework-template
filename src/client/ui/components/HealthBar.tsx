import Maid from "@rbxts/maid";
// biome-ignore lint/correctness/noUnusedImports: Required for JSX
import Roact from "@rbxts/roact";
import { useEffect, useState, withHooks } from "@rbxts/roact-hooked";
import { Players, StarterGui } from "@rbxts/services";

function HealthBarComponent() {
	const [health, setHealth] = useState(100);
	const [maxHealth, setMaxHealth] = useState(100);

	useEffect(() => {
		StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Health, false);

		const maid = new Maid();
		const player = Players.LocalPlayer;

		const setupHumanoid = (humanoid: Humanoid) => {
			setHealth(humanoid.Health);
			setMaxHealth(humanoid.MaxHealth);

			maid.GiveTask(
				humanoid.GetPropertyChangedSignal("Health").Connect(() => {
					setHealth(humanoid.Health);
				}),
			);
			maid.GiveTask(
				humanoid.GetPropertyChangedSignal("MaxHealth").Connect(() => {
					setMaxHealth(humanoid.MaxHealth);
				}),
			);
		};

		const onCharacterAdded = (character: Model) => {
			const humanoid = character.WaitForChild("Humanoid") as Humanoid;
			setupHumanoid(humanoid);
		};

		if (player.Character) {
			const humanoid = player.Character.FindFirstChild("Humanoid") as
				| Humanoid
				| undefined;
			if (humanoid) {
				setupHumanoid(humanoid);
			}
		}

		maid.GiveTask(player.CharacterAdded.Connect(onCharacterAdded));

		return () => maid.DoCleaning();
	}, []);

	const healthPercent = maxHealth > 0 ? health / maxHealth : 0;

	return (
		<frame
			AnchorPoint={new Vector2(0, 1)}
			Position={new UDim2(0, 20, 1, -20)}
			Size={new UDim2(0, 200, 0, 24)}
			BackgroundColor3={Color3.fromRGB(30, 30, 30)}
			BorderSizePixel={0}
		>
			<uicorner CornerRadius={new UDim(0, 4)} />
			<frame
				Size={new UDim2(healthPercent, 0, 1, 0)}
				BackgroundColor3={Color3.fromRGB(80, 200, 80)}
				BorderSizePixel={0}
			>
				<uicorner CornerRadius={new UDim(0, 4)} />
			</frame>
			<textlabel
				Size={new UDim2(1, 0, 1, 0)}
				BackgroundTransparency={1}
				Text={`${math.floor(health)} / ${maxHealth}`}
				TextColor3={Color3.fromRGB(255, 255, 255)}
				TextSize={14}
				Font={Enum.Font.GothamBold}
				ZIndex={2}
			/>
		</frame>
	);
}

export const HealthBar = withHooks(HealthBarComponent);
