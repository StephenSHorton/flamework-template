import { Flamework } from "@flamework/core";
import { BUILD_HASH, BUILD_TIME } from "shared/constants/build";

print(`[SERVER] Build: ${BUILD_HASH} (${BUILD_TIME})`);

Flamework.addPaths("src/server/components");
Flamework.addPaths("src/server/services");
Flamework.addPaths("src/shared/components");

Flamework.ignite();
