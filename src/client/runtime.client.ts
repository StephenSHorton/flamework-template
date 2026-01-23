import { Flamework } from "@flamework/core";
import { BUILD_HASH, BUILD_TIME } from "shared/constants/build";

print(`[CLIENT] Build: ${BUILD_HASH} (${BUILD_TIME})`);

Flamework.addPaths("src/client/components");
Flamework.addPaths("src/client/controllers");
Flamework.addPaths("src/shared/components");

Flamework.ignite();
