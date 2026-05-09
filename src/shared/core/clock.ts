import { RunService, Workspace } from "@rbxts/services";

type Listener = (delta: number, now: number) => void;
type ScaleListener = (scale: number) => void;

export class Clock {
	private time = 0;
	private carry = 0;
	private paused = false;
	private timeScale = 1;

	private readonly interval: number;
	private readonly listeners = [] as Listener[];
	private readonly scaleListeners = [] as ScaleListener[];
	private readonly connection: RBXScriptConnection;

	public constructor(interval: number, initialTime?: number) {
		this.interval = math.max(interval, 1 / 1000);
		this.time = initialTime ?? 0;
		this.connection = RunService.Heartbeat.Connect((dt) => this.tick(dt));
	}

	public on(listener: Listener): () => void {
		this.listeners.push(listener);
		return () => {
			const i = this.listeners.indexOf(listener);
			if (i === -1) return;
			const last = this.listeners.size() - 1;
			if (i !== last) this.listeners[i] = this.listeners[last];
			this.listeners.remove(last);
		};
	}

	public onTimeScaleChanged(listener: ScaleListener): () => void {
		this.scaleListeners.push(listener);
		return () => {
			const i = this.scaleListeners.indexOf(listener);
			if (i === -1) return;
			const last = this.scaleListeners.size() - 1;
			if (i !== last) this.scaleListeners[i] = this.scaleListeners[last];
			this.scaleListeners.remove(last);
		};
	}

	public destroy(): void {
		this.connection.Disconnect();
	}

	public getTime(): number {
		return this.time;
	}

	public getFuture(seconds: number): number {
		return this.time + math.max(0, seconds);
	}

	public getProgress(startTime: number, endTime: number): number {
		if (endTime <= startTime) return 1;
		const total = endTime - startTime;
		const elapsed = this.time - startTime;
		return math.clamp(elapsed / total, 0, 1);
	}

	public hasPassed(targetTime: number): boolean {
		return this.time >= targetTime;
	}

	public pause(): void {
		this.paused = true;
	}

	public resume(): void {
		this.paused = false;
	}

	public reset(): void {
		this.time = 0;
		this.carry = 0;
		this.paused = false;
	}

	public isPaused(): boolean {
		return this.paused;
	}

	public isRunning(): boolean {
		return !this.paused;
	}

	public getTickInterval(): number {
		return this.interval;
	}

	public getTimeScale(): number {
		return this.timeScale;
	}

	public setTimeScale(scale: number): void {
		const nextScale = math.max(0, scale);
		if (nextScale === this.timeScale) return;
		this.timeScale = nextScale;
		for (const listener of this.scaleListeners) task.spawn(listener, nextScale);
	}

	public wait(seconds: number): void {
		const target = this.getFuture(math.max(0, seconds));
		while (!this.hasPassed(target)) {
			task.wait(math.max(this.interval, 1 / 60));
		}
	}

	private tick(dt: number): void {
		if (this.paused) return;
		const scaled = dt * this.timeScale;
		if (scaled <= 0) return;

		this.carry += scaled;
		this.time += scaled;

		const step = this.interval * this.timeScale;
		if (step <= 0) return;

		if (this.listeners.size() === 0) {
			this.carry = math.min(this.carry, step);
			return;
		}

		while (this.carry >= step) {
			this.carry -= step;
			for (const listener of this.listeners)
				task.spawn(listener, step, this.time);
		}
	}
}

const initialTime =
	Workspace.GetServerTimeNow !== undefined
		? Workspace.GetServerTimeNow()
		: os.clock();

// 20 Hz simulation clock — game logic, replication.
export const GameClock = new Clock(1 / 20, initialTime);

// 60 Hz UI clock — runs even when GameClock is paused.
export const CoreClock = new Clock(1 / 60, initialTime);
