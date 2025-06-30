import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const remoteDb = createClient({
  url: process.env.EXPO_PUBLIC_TURSO_DATABASE_URL!,
  authToken: process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN,
});

export const db = drizzle(remoteDb);
