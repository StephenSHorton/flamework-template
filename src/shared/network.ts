import { Networking } from "@flamework/networking";

type ClientToServerEvents = {};

type ServerToClientEvents = {};

type ClientToServerFunctions = {};

type ServerToClientFunctions = {};

export const GlobalEvents = Networking.createEvent<
	ClientToServerEvents,
	ServerToClientEvents
>();
export const GlobalFunctions = Networking.createFunction<
	ClientToServerFunctions,
	ServerToClientFunctions
>();
