import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "@shared/schema";
import { logger } from "./lib/logger";

export interface ColumnInfo {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  defaultValue: string | null;
  isForeignKey: boolean;
  references?: { table: string; column: string; onDelete?: string };
}

export interface TableInfo {
  name: string;
  exportName: string;
  domain: string;
  domainColor: string;
  columns: ColumnInfo[];
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: string;
  onDelete?: string;
}

export interface SchemaData {
  tables: TableInfo[];
  relationships: Relationship[];
}

const domainMap: Record<string, { domain: string; color: string }> = {
  users: { domain: "User & Auth", color: "#4EA8DE" },
  auth_providers: { domain: "User & Auth", color: "#4EA8DE" },
  user_sessions: { domain: "User & Auth", color: "#4EA8DE" },
  password_reset_tokens: { domain: "User & Auth", color: "#4EA8DE" },
  user_sync_data: { domain: "Sync & Data", color: "#118AB2" },
  user_inventory_items: { domain: "Sync & Data", color: "#118AB2" },
  user_saved_recipes: { domain: "Sync & Data", color: "#118AB2" },
  user_meal_plans: { domain: "Sync & Data", color: "#118AB2" },
  user_shopping_items: { domain: "Sync & Data", color: "#118AB2" },
  user_cookware_items: { domain: "Sync & Data", color: "#118AB2" },
  user_storage_locations: { domain: "Sync & Data", color: "#118AB2" },
  user_sync_kv: { domain: "Sync & Data", color: "#118AB2" },
  user_waste_logs: { domain: "Tracking", color: "#06D6A0" },
  user_consumed_logs: { domain: "Tracking", color: "#06D6A0" },
  monthly_log_summaries: { domain: "Tracking", color: "#06D6A0" },
  subscriptions: { domain: "Subscriptions", color: "#7B68EE" },
  conversion_events: { domain: "Subscriptions", color: "#7B68EE" },
  cancellation_reasons: { domain: "Subscriptions", color: "#7B68EE" },
  winback_campaigns: { domain: "Subscriptions", color: "#7B68EE" },
  retention_offers: { domain: "Subscriptions", color: "#7B68EE" },
  feedback: { domain: "Feedback", color: "#F78C6B" },
  feedback_buckets: { domain: "Feedback", color: "#F78C6B" },
  nutrition_corrections: { domain: "Feedback", color: "#F78C6B" },
  error_reports: { domain: "Feedback", color: "#F78C6B" },
  cooking_terms: { domain: "Reference", color: "#073B4C" },
  appliances: { domain: "Reference", color: "#073B4C" },
  user_appliances: { domain: "Sync & Data", color: "#118AB2" },
  notifications: { domain: "Notifications", color: "#FF6B6B" },
  user_push_tokens: { domain: "Notifications", color: "#FF6B6B" },
  cron_jobs: { domain: "System", color: "#E6AC00" },
  api_cache: { domain: "System", color: "#E6AC00" },
  referrals: { domain: "System", color: "#E6AC00" },
};

const columnTypeMap: Record<string, string> = {
  PgVarchar: "varchar",
  PgText: "text",
  PgInteger: "integer",
  PgBoolean: "boolean",
  PgTimestamp: "timestamp",
  PgJsonb: "jsonb",
  PgDoublePrecision: "double precision",
  PgSerial: "serial",
  PgBigInt53: "bigint",
  PgBigInt64: "bigint",
  PgCustomColumn: "custom",
};

function resolveColumnType(column: any): string {
  try {
    const colType: string = column.columnType || "";

    if (colType === "PgArray" || colType.includes("Array")) {
      const baseCol = column.baseColumn;
      if (baseCol) {
        const baseType = resolveColumnType(baseCol);
        return `${baseType}[]`;
      }
      return "text[]";
    }

    if (columnTypeMap[colType]) {
      return columnTypeMap[colType];
    }

    if (colType.startsWith("Pg")) {
      return colType.slice(2).replace(/([A-Z])/g, " $1").trim().toLowerCase();
    }

    return colType || "unknown";
  } catch {
    return "unknown";
  }
}

function extractDefaultValue(column: any): string | null {
  try {
    if (!column.hasDefault) return null;

    if (column.default !== undefined && column.default !== null) {
      const def = column.default;

      if (typeof def === "object" && def !== null) {
        if (typeof def.toSQL === "function") {
          try {
            const sqlChunks = def.toSQL();
            if (Array.isArray(sqlChunks)) {
              return sqlChunks.map((chunk: any) => {
                if (typeof chunk === "string") return chunk;
                if (chunk && typeof chunk.value !== "undefined") return String(chunk.value);
                return String(chunk);
              }).join("");
            }
          } catch {}
        }

        if (def.queryChunks) {
          try {
            const chunks = Array.isArray(def.queryChunks) ? def.queryChunks : [];
            const parts: string[] = [];
            for (const chunk of chunks) {
              if (typeof chunk === "string") {
                parts.push(chunk);
              } else if (chunk && typeof chunk.value !== "undefined") {
                parts.push(String(chunk.value));
              }
            }
            if (parts.length > 0) return parts.join("").trim();
          } catch {}
        }

        const sqlSym = Symbol.for("drizzle:SQL");
        if (def[sqlSym] || def.decoder) {
          return "(sql expression)";
        }
      }

      if (typeof def === "boolean") return String(def);
      if (typeof def === "number") return String(def);
      if (typeof def === "string") return `'${def}'`;
    }

    if (column.defaultFn) {
      return "(dynamic)";
    }

    if (column.hasDefault) {
      return "(default)";
    }

    return null;
  } catch {
    return null;
  }
}

let cachedSchemaData: SchemaData | null = null;

export function getSchemaData(): SchemaData {
  if (cachedSchemaData) return cachedSchemaData;

  const tables: TableInfo[] = [];
  const relationships: Relationship[] = [];
  const uniqueColumnsPerTable: Record<string, Set<string>> = {};

  for (const [exportName, value] of Object.entries(schema)) {
    try {
      if (!value || typeof value !== "object") continue;
      if (!(value as any)[Symbol.for("drizzle:Name")]) continue;

      const table = value as any;
      const tableName: string = table[Symbol.for("drizzle:Name")];

      let columns: Record<string, any>;
      try {
        columns = getTableColumns(table);
      } catch (e) {
        logger.warn(`Failed to get columns for table ${tableName}`, { error: e });
        continue;
      }

      let config: any;
      try {
        config = getTableConfig(table);
      } catch (e) {
        logger.warn(`Failed to get config for table ${tableName}`, { error: e });
        config = { foreignKeys: [], uniqueConstraints: [] };
      }

      const fkMap = new Map<string, { table: string; column: string; onDelete?: string }>();
      try {
        for (const fk of config.foreignKeys || []) {
          const ref = fk.reference();
          if (ref && ref.columns?.length > 0 && ref.foreignColumns?.length > 0) {
            const fromColName = ref.columns[0].name;
            const toTableName = ref.foreignTable[Symbol.for("drizzle:Name")] || "unknown";
            const toColName = ref.foreignColumns[0].name;

            let onDelete: string | undefined;
            try {
              onDelete = fk.onDelete || ref.onDelete;
            } catch {}

            fkMap.set(fromColName, { table: toTableName, column: toColName, onDelete });

            const fromColObj = ref.columns[0];
            const isUnique = fromColObj?.isUnique === true;

            relationships.push({
              fromTable: tableName,
              fromColumn: fromColName,
              toTable: toTableName,
              toColumn: toColName,
              type: isUnique ? "1:1" : "1:N",
              ...(onDelete ? { onDelete } : {}),
            });
          }
        }
      } catch (e) {
        logger.warn(`Failed to parse foreign keys for table ${tableName}`, { error: e });
      }

      const uniqueCols = new Set<string>();
      try {
        for (const uc of config.uniqueConstraints || []) {
          if (uc.columns?.length === 1) {
            uniqueCols.add(uc.columns[0].name);
          }
        }
      } catch {}
      uniqueColumnsPerTable[tableName] = uniqueCols;

      const columnInfos: ColumnInfo[] = [];
      for (const [, col] of Object.entries(columns)) {
        try {
          const colName = col.name;
          const colType = resolveColumnType(col);
          const isPK = col.primary === true;
          const isNotNull = col.notNull === true;
          const isUnique = col.isUnique === true || uniqueCols.has(colName);
          const defaultValue = extractDefaultValue(col);
          const fkRef = fkMap.get(colName);

          const colInfo: ColumnInfo = {
            name: colName,
            type: colType,
            isPrimaryKey: isPK,
            isNotNull: isNotNull || isPK,
            isUnique: isUnique || isPK,
            defaultValue,
            isForeignKey: !!fkRef,
          };

          if (fkRef) {
            colInfo.references = fkRef;
          }

          columnInfos.push(colInfo);
        } catch (e) {
          logger.warn(`Failed to parse column in table ${tableName}`, { error: e });
        }
      }

      const domainInfo = domainMap[tableName] || { domain: "Other", color: "#999999" };

      tables.push({
        name: tableName,
        exportName,
        domain: domainInfo.domain,
        domainColor: domainInfo.color,
        columns: columnInfos,
      });
    } catch (e) {
      logger.warn(`Failed to introspect export "${exportName}"`, { error: e });
    }
  }

  tables.sort((a, b) => a.name.localeCompare(b.name));

  cachedSchemaData = { tables, relationships };
  return cachedSchemaData;
}
