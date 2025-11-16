import * as DB from "idb";
import * as SB from '@supabase/supabase-js';
import { IndexedArray } from "./../help/IndexedArray";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";
export declare type Row = any;
export declare const createClient: any;
export declare type NULL<T> = T | undefined;
type IObject<T extends string | number | symbol, KEY extends T> = {
    [n in T]: n extends KEY ? IDBValidKey : any;
};
type IRow<KEY extends PROPS, DEF extends IObject<PROPS, KEY>, PROPS extends keyof DEF = keyof DEF> = {
    [s in PROPS]: s extends KEY ? IDBValidKey : DEF[s];
};
export declare type IShemas = IRow<'name', {
    name: string;
    updated_at: Date;
}>;
export declare type IProduct = IRow<'id', {
    id: number;
    name: string;
    qte: number;
    price: number;
}>;
export declare type IInvoice = IRow<'id', {
    id: number;
    created_at: Date;
    updated_at: Date;
    total: number;
    client_id: number;
    client: string;
    status: string;
}>;
export interface tableDef {
    name: string;
    keypath?: string | 'id';
    local?: boolean;
}
export declare class table<KEY extends Exclude<keyof ROW, Symbol | number>, ROW extends Object = Row> {
    #private;
    readonly local: boolean;
    readonly name: string;
    readonly keyPath: KEY;
    readonly system: System;
    get database(): DB.IDBPDatabase<unknown>;
    get server(): SB.SupabaseClient<any, "public", "public", any, any>;
    constructor(local: boolean, name: string, keyPath: KEY, system: System);
    initialize(): Promise<void>;
    get rows(): IndexedArray<ROW, KEY>;
    fetchAll(server: API): PostgrestFilterBuilder<any, any, any, any[], string, unknown, "GET"> | undefined;
}
declare abstract class SystemItem {
    readonly _system: System;
    get database(): database;
    get api(): API;
    get memory(): Memory;
    get databaseName(): string;
    get databaseVersion(): number;
    get db(): DB.IDBPDatabase<unknown>;
    get server(): SB.SupabaseClient<any, "public", "public", any, any>;
    get tables(): Map<string, table<any, any>>;
    get system(): System;
    set system(v: System);
    constructor(_system: System);
    getTable(table: string): table<any, any> | undefined;
}
export declare class System {
    readonly databaseName: string;
    readonly databaseVersion: number;
    readonly defs: tableDef[];
    readonly database: database;
    readonly api: API;
    readonly memory: Memory;
    session?: SB.Session | null;
    constructor(databaseName?: string, databaseVersion?: number, defs?: tableDef[]);
    newRow(table: string, init: Row): Promise<any>;
    uploadRow(table: string, row: Row): Promise<void>;
    deleteRow(table: string, rowId: string | {
        id: string;
    }): Promise<any>;
    saveRowLoacl(table: string, row: Iterable<Row> | Row): Promise<void>;
    updated_at(table: string): Promise<Date>;
    updated_at(table: string, value: undefined): Promise<Date>;
    updated_at(table: string, value: Date): Promise<Date>;
    load(table: string, fetch?: boolean, deep?: boolean): Promise<void>;
    loadAll(deep?: boolean): Promise<void>;
    initialize(): Promise<void>;
    autoLogin(): Promise<boolean>;
    user: any;
}
export declare class Memory extends SystemItem {
    #private;
    get tables(): Map<string, table<any, any>>;
    initialize(): void;
    getTable(name: string): table<Row> | undefined;
    save(table: string, rows: Row | Iterable<Row>): void;
    delete<T extends Row, P extends Exclude<keyof T, Symbol | number>>(table: string, rows: T | Iterable<T | T[P]> | T[P]): void;
}
export declare class database extends SystemItem {
    #private;
    get db(): DB.IDBPDatabase<unknown>;
    initialize(): Promise<void>;
    upgrade(database: DB.IDBPDatabase<unknown>, oldVersion: number, newVersion: number | null, transaction: DB.IDBPTransaction<unknown, string[], "versionchange">, event: IDBVersionChangeEvent): Promise<void>;
    terminated(): Promise<void>;
    blocked?(currentVersion: number, blockedVersion: number | null, event: IDBVersionChangeEvent): void;
    blocking?(currentVersion: number, blockedVersion: number | null, event: IDBVersionChangeEvent): void;
    put(table: string, rows: Row | Row[]): Promise<any>;
    _delete(table: string, row: Row | string): Promise<void>;
    delete<T extends Row, P extends Exclude<keyof T, Symbol | number>>(table: string, rows: (T | T[P])[] | (T | T[P])): Promise<any>;
    getAll<IRow = Row>(table: string): Promise<IRow[]>;
}
export declare class API extends SystemItem {
    #private;
    get server(): SB.SupabaseClient<any, "public", "public", any, any>;
    get database(): database;
    constructor(system: System);
    fetchAll(tableName: string, after: Date): Promise<Row[] | undefined>;
    auth(): Promise<any>;
    login({ email, pwd, phone }: {
        email?: string;
        pwd: string;
        phone?: string;
    }): Promise<any>;
    login1({ phone, pwd }: {
        pwd: string;
        phone?: string;
    }): Promise<unknown>;
    get logged(): boolean;
    getIds(table: string, keyPath: string): Promise<any>;
    getCategories(): Promise<any>;
    /**
     *
     * @param {IndexedArray} output
     * @returns
     */
    getProducts(output: {
        set: (arg0: any[]) => void;
    }): Promise<any>;
    /**
     *
     * @param {IndexedArray} output
     * @returns
     */
    getInvoices(output: IndexedArray<IInvoice, 'id'>, store?: any): Promise<any>;
    getInvoice(id: number): Promise<any>;
    getCurrentInvoice(): Promise<any>;
    validateInvoice(invoice_id: number): Promise<{
        isValid: boolean;
        calculatedTotal: any;
        storedTotal: any;
        status: any;
    }>;
    getInvoiceItems(invoice_id: number): Promise<any>;
    addItemToInvoice({ invoice_id, product_id, quantity }: {
        invoice_id: number;
        product_id: number;
        quantity: number;
    }): Promise<any>;
    deleteInvoiceItem(item_id: number): Promise<any>;
}
export {};
//# sourceMappingURL=database.d.ts.map