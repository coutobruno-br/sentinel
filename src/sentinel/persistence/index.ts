// src/sentinel/persistence/index.ts
import { SQLiteAdapter } from './SQLiteAdapter'

export const db = new SQLiteAdapter()
