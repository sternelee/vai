import { drizzle } from "drizzle-orm/op-sqlite";
import { open } from "@op-engineering/op-sqlite";

export const sqlite = open({ name: "local.db" });
export const database = drizzle(sqlite);
