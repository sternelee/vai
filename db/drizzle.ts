import { drizzle } from "drizzle-orm/op-sqlite";
import { moveAssetsDatabase, openSync } from "@op-engineering/op-sqlite";

// https://op-engineering.github.io/op-sqlite/docs/installation
// npx expo install @op-engineering/op-sqlite
// npx expo prebuild
export const sqlite = openSync({
  name: "local.db",
  url: process.env.EXPO_PUBLIC_TURSO_DATABASE_URL!,
  authToken: process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN!,
  // syncInterval: 1000,
});

// try {
//   // Make the initial sync from the remote to the local database
//   sqlite.sync();
// } catch (e) {
//   console.log(e);
// }

export const database = drizzle(sqlite);
