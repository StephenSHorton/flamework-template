import { mkdirSync, writeFileSync } from "node:fs";

const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
const timestamp = new Date().toISOString();

const content = `// Auto-generated - DO NOT EDIT
export const BUILD_HASH = "${hash}";
export const BUILD_TIME = "${timestamp}";
`;

mkdirSync("src/shared/constants", { recursive: true });
writeFileSync("src/shared/constants/build.ts", content);
console.log(`Build hash: ${hash}`);
