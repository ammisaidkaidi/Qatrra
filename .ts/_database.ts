/// <reference path="F:/testing/SM/node_modules/idb/build/entry.d.ts" />
import * as DB from "../libs/IDB/build/index.js"
import * as SB from '@supabase/supabase-js';
import { AuthClient, AuthAdminApi, GoTrueAdminApi, GoTrueClient, NavigatorLockAcquireTimeoutError, lockInternals, navigatorLock, processLock } from '@supabase/auth-js';


//import * as SB from '../libs/SB/dist/module/index.js';
import { IndexedArray } from "./IndexedArray.js";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { invoiceItem } from "../def/index.js";

export declare type Row = any;
export const createClient = SB.createClient;
export declare type NULL<T> = T | undefined;
type IObject<T extends string | number | symbol, KEY extends T> = {
    [n in T]: n extends KEY ? IDBValidKey : any;
}
type IRow<KEY extends PROPS, DEF extends IObject<PROPS, KEY>, PROPS extends keyof DEF = keyof DEF> = {
    [s in PROPS]: s extends KEY ? IDBValidKey : DEF[s];
};


export declare type IShemas = IRow<'name', { name: string, updated_at: Date }>;
export declare type IProduct = IRow<'id', { id: number, name: string, qte: number, price: number }>;
export declare type IInvoice = IRow<'id', { id: number, created_at: Date, updated_at: Date, total: number, client_id: number, client: string, status: string }>;

const _tableDef: tableDef[] = [
    { name: 'clients', keypath: 'id' },
    { name: 'categories', keypath: 'id' },
    { name: 'products', keypath: 'id' },
    { name: 'invoices', keypath: 'id' },
    { name: 'invoice_items', keypath: 'id' },
    { name: 'locations', keypath: 'id' },
    { name: 'shemas', keypath: 'name', local: true },
];


export interface tableDef {
    name: string;
    keypath?: string | 'id';
    local?: boolean;
}
export class table<KEY extends Exclude<keyof ROW, Symbol | number>, ROW extends Object = Row> {

    #rows: IndexedArray<ROW, KEY>;

    get #db(): database { return this.system.database; }
    get database() { return this.#db.db; }
    get server() { return this.#db.server; }



    constructor(readonly local: boolean, public readonly name: string, readonly keyPath: KEY, readonly system: System) {
        this.#rows = new IndexedArray<ROW, KEY>(keyPath);
    }

    async initialize() {
        return this.system.load(this.name, this.name !== 'shemas');
    }

    get rows() { return this.#rows; }

    fetchAll(server: API): PostgrestFilterBuilder<any, any, any, any[], string, unknown, "GET"> | undefined {
        const modifier = (onFetch as any)[this.name];
        if (typeof modifier === 'function') {
            return modifier(this.system, server);
        }

    }
}
abstract class SystemItem {
    get database() { return this.system.database; }
    get api() { return this.system.api; }
    get memory() { return this.system.memory; }
    get databaseName() { return this.system.databaseName; }
    get databaseVersion() { return this.system.databaseVersion; }
    get db() { return this.system.database.db; }
    get server() { return this.system.api.server; }
    get tables() { return this.memory.tables; }
    get system() { return this._system; }
    set system(v) { debugger; }

    constructor(public readonly _system: System) { }
    getTable(table: string) {
        return this.memory.tables.get(table);
    }
    getRow(tableName: string, key: any) {
        const table = this.memory.tables.get(tableName);
        if (table) {
            const rows = table.rows;
            return rows.get(key)
        }
        return undefined;
    }
}

export class System {
    readonly database: database;
    readonly api: API;
    readonly memory: Memory;
    session?: any;

    constructor(public readonly databaseName: string = "data", readonly databaseVersion: number = 1, readonly defs: tableDef[] = _tableDef) {
        this.database = new database(this)
        this.api = new API(this);
        this.memory = new Memory(this);
    }

    async newRow(table: string, init: Row) {
        try {
            const { data, error } = await this.api.server
                .from(table)
                .insert(init || {})
                .select()
                .single();

            if (error) throw error;
            this.memory.save(table, data);
            await this.database.put(table, data);
            return data;
        } catch (error) {
            console.error('Error creating new row:', error);
            return undefined;
        }
    }

    async updateRow(table: string, row: Row) {
        try {
            const { data, error } = await this.api.server
                .from(table)
                .select('*').eq('id', row.id)
                .single();
            if (error) throw error;

            Object.assign(row, data);
            this.saveRowLoacl(table, data);
            return true;
        } catch (error) {
            console.error('Error saving row:', error);
            return false;
        }
    }
    async uploadRow(table: string, row: Row) {
        try {
            const { data, error } = await this.api.server
                .from(table)
                .upsert(row)
                .select()
                .single();
            if (error) throw error;
            // check this line
            this.saveRowLoacl(table, data);
        } catch (error) {
            console.error('Error saving row:', error);
            throw error;
        }
    }

    async deleteRow(table: string, rowId: string | { id: string }) {
        const id = typeof rowId === 'object' ? rowId.id : rowId;
        const { data, error } = await this.api.server
            .from(table)
            .delete()
            .eq('id', id);
        if (error) throw error;
        this.memory.delete(table, id);
        await this.database.delete(table, id);
        return data;
    }

    async saveRowLoacl(table: string, row: Iterable<Row> | Row) {
        this.memory.save(table, row);
        await this.database.put(table, row);
    }

    async updated_at(table: string): Promise<Date>;
    async updated_at(table: string, value: undefined): Promise<Date>;
    async updated_at(table: string, value: Date): Promise<Date>
    async updated_at(table: string, value?: Date): Promise<Date> {
        if (!arguments.length || value === undefined) {
            const row = await this.database.db.get('shemas', table);
            return parseDate(row ? row['updated_at'] : 0);
        }
        const row = await this.database.db.put('shemas', { name: table, updated_at: dateToString(value) });
        return parseDate(value);
    }

    async load(table: string, fetch = true, deep?: boolean) {
        const now = new Date(Date.now());
        const updated_at = deep ? new Date(Date.now()) : await this.updated_at(table);
        const rows = await this.database.getAll(table);
        this.memory.save(table, rows);
        if (fetch) {
            this.saveRowLoacl(table, await this.api.fetchAll(table, updated_at));
            await this.updated_at(table, now);
        }
    }
    async loadAll(deep?: boolean) {
        await Promise.all(this.defs.map(async (def) => {
            debugger;
            return this.load(def.name, !def.local, deep);
        }));
    }
    async initialize() {
        this.memory.initialize();
        await this.database.initialize();
        this.session = await this.api.auth();
        await this.autoLogin();
    }
    async autoLogin() {
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
            try {
                this.user = JSON.parse(cachedUser);
                console.log('Loaded user from cache:', this.user);
                const x = await this.api.login1(this.user);
                return true;
            } catch (e) {
                console.error('Failed to parse cached user:', e);
                localStorage.removeItem('user');
            }
        }
        return false;
    }
    user: any;
}
export class Memory extends SystemItem {
    readonly #tables: Map<string, table<Row>> = new Map();
    get tables() { return this.#tables; }

    initialize() {
        const system = this.system;
        system.defs.forEach(def => {
            this.#tables.set(def.name, new table(def.local || false, def.name, def.keypath || 'id', system));
        });
    }
    getTable(name: string): table<Row> | undefined {
        if (!this.#tables.has(name))
            throw new Error(`no table ${name}`);
        return this.#tables.get(name);
    }

    save(table: string, rows: Row | Iterable<Row>) {
        this.#tables.get(table)?.rows.set(rows);
    }
    delete<T extends Row, P extends Exclude<keyof T, Symbol | number>>(table: string, rows: T | Iterable<T | T[P]> | T[P]) {
        this.#tables.get(table)?.rows.deletes(rows);
    }

}
export class database extends SystemItem {
    #db: DB.IDBPDatabase<unknown> = <DB.IDBPDatabase<unknown>><any>null;
    get db() { return this.#db; }

    async initialize() {
        const _this = this;
        function call(name: keyof typeof _this) {
            return function () { return (_this[name] as Function).apply(_this, arguments) };
        }
        this.#db = await DB.openDB(this.databaseName, this.databaseVersion, { blocked: call('blocked'), blocking: call('blocking'), terminated: call('terminated'), upgrade: call('upgrade') })
    }
    async upgrade(database: DB.IDBPDatabase<unknown>, oldVersion: number, newVersion: number | null, transaction: DB.IDBPTransaction<unknown, string[], "versionchange">, event: IDBVersionChangeEvent) {

        createTable.call(this, 'shemas', 'name');
        this.tables.forEach(table => createTable.call(this, table.name, table.keyPath));

        function createTable(this: database, tableName: string, key: string) {
            if (!database.objectStoreNames.contains(tableName))
                database.createObjectStore(tableName, { keyPath: key || 'id' });
        }
        transaction.commit();
        await transaction.done;

    }

    async terminated() {
        await this.initialize();
    }
    blocked?(currentVersion: number, blockedVersion: number | null, event: IDBVersionChangeEvent): void {

    }
    blocking?(currentVersion: number, blockedVersion: number | null, event: IDBVersionChangeEvent): void {

    }
    async put(table: string, rows: Row | Row[]) {
        if (!(rows instanceof Array)) rows = [rows];
        const tx = this.db.transaction(table, 'readwrite');
        const store = tx.store;
        for (const row of rows)
            store.put(row);
        return tx.done;
    }
    async _delete(table: string, row: Row | string) {
    }
    async delete<T extends Row, P extends Exclude<keyof T, Symbol | number>>(table: string, rows: (T | T[P])[] | (T | T[P])) {
        if (!(rows instanceof Array)) rows = [rows];
        const tx = this.db.transaction(table, 'readwrite');
        const store = tx.store;
        const _table = this.memory.getTable(table) as table<any>;
        for (let row of rows) {
            let id = row instanceof Object ? row = (row as any)[_table.keyPath] as T[P] : row as T[P];
            store.delete(id as any)
        } return tx.done;

    }
    async getAll<IRow = Row>(table: string) {
        return await this.db.getAll(table) as IRow[];
    }

}
const onFetch: { [n: string]: (system: System, server: API) => PostgrestFilterBuilder<any, any, any, any[], string, unknown, "GET"> } = {
    invoices(system: System, api: API) {
        const query = api.server
            .from('invoices')
            .select('*');
        return query.eq('client_id', system.user.id)
            .order('created_at', { ascending: false });
    },
    products(system, api) {
        const query = api.server
            .from('products')
            .select('*');
        return query.order('updated_at', { ascending: false, nullsFirst: false });
    }
}
export class API extends SystemItem {
    #logged: boolean = false;
    readonly #user: { id: number, name: string, phone: string, pwd: string } = { id: 0, name: "", phone: '', pwd: '' };
    readonly #server: SB.SupabaseClient<any, 'public', 'public'>
    get server() { return this.#server; }
    get database() { return this.system.database; }
    constructor(system: System) {
        super(system);
        const SUPABASE_URL = 'https://rhqckxywcpiwmddpngby.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocWNreHl3Y3Bpd21kZHBuZ2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDg0MzEsImV4cCI6MjA3NjA4NDQzMX0.yb3IbFipfKgOE61cOe-VKQ5keNSo7FhI3UW3Ik-fvRY';

        this.#server = SB.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    }

    public async fetchAll(tableName: string, after: Date): Promise<Row[] | undefined> {
        const { promise, resolve } = newPromise<Row[] | undefined>();
        const table = this.getTable(tableName);

        const query = table?.fetchAll(this) || this.server
            .from(tableName)
            .select('*');

        if (after)
            query.gte('updated_at', after.toISOString());

        query.then(async ({ data, error }) => {
            if (error) return resolve(undefined);
            resolve(data as Row[]);
        });
        return promise;

    }

    // ===============================
    // AUTHENTICATION
    // ===============================

    async auth() {
        const { data: { session }, error } = await this.server.auth.getSession();
        if (error) {
            this.#logged = false;
            throw error;
        }
        if (session) {
            this.#logged = true;
            return session;
        }
        this.#logged = false;
        return null;
    }
    async login({ email, pwd, phone }: { email?: string; pwd: string; phone?: string; }) {
        if (phone && pwd)
            return this.login1({ phone, pwd });

        else if (email && pwd)
            // use supabase auth to login
            return this.server.auth.signInWithPassword({
                email: email,
                password: pwd
            }).then(({ data, error }) => {
                if (error)
                    return error;
                return true;
            });
        else {
            return new Error('Invalid login parameters');
        }
    }
    async login1({ phone, pwd }: { pwd: string; phone?: string; }) {
        try {
            if (!phone || !pwd) {
                throw new Error('phone and pwd cannot be null');
            }
            phone = phone.trim();

            const { data: clientData, error: clientError } = await this.server
                .from('clients')
                .select('*')
                .eq('phone', phone)
                .eq('pwd', pwd)
                .maybeSingle();

            if (clientError) throw new Error(`Client fetch error: ${clientError.message}`);
            if (!clientData) throw new Error('Client not found or invalid credentials');

            Object.assign(this.#user, clientData);
            localStorage.setItem('user', JSON.stringify(this.#user));
            this.#logged = true;
            return true;
        } catch (error) {
            this.#logged = false;
            console.error('Login error:', error);
            return error;
        }
    }

    get logged() {
        return this.#logged;
    }

    async getIds(table: string, keyPath: string) {
        try {
            const { data, error } = await this.server
                .from(table)
                .select(keyPath);

            if (error) throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            return data;
        } catch (error) {
            return undefined;
        }
    }
    // ===============================
    // CATEGORIES
    // ===============================

    async getCategories() {
        try {
            const { data, error } = await this.server
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);

            return data;
        } catch (error) {
            console.error('Get categories error:', error);
            throw error;
        }
    }

    // ===============================
    // PRODUCTS
    // ===============================

    /**
     * 
     * @param {IndexedArray} output 
     * @returns 
     */
    async getProducts(output: { set: (arg0: any[]) => void; }) {

        try {
            const { data, error } = await this.server
                .from('products')
                .select('*');

            if (error) throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);

            output.set(data)
            return data;
        } catch (error) {
            console.error('Get products error:', error);
            throw error;
        }
    }

    // ===============================
    // INVOICES
    // ===============================
    /**
     * 
     * @param {IndexedArray} output 
     * @returns 
     */
    async getInvoices(output: IndexedArray<IInvoice, 'id'>, store?: any) {
        try {
            if (!this.#logged) {
                throw new Error('User not authenticated');
            }

            /**
             * @type {Array}
             */
            const { data, error } = await this.server
                .from('invoices')
                .select('*')
                .eq('client_id', this.#user.id)
                .order('created_at', { ascending: false });

            if (error) throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);



            output.set(data);
            return data;
        } catch (error) {
            console.error('Get invoices error:', error);
            throw error;
        }
    }

    async getInvoice(id: number) {
        try {
            if (!id) {
                throw new Error('invoice_id cannot be null');
            }
            if (!this.#logged) {
                throw new Error('User not authenticated');
            }

            const { data: invoiceData, error: invoiceError } = await this.server
                .from('invoices')
                .select('*')
                .eq('id', id)
                .eq('client_id', this.#user.id)
                .maybeSingle();

            if (invoiceError) throw new Error(`Supabase invoice error: ${invoiceError.message} (code: ${invoiceError.code})`);
            if (!invoiceData) throw new Error('Invoice not found or you do not have access');

            const { data: itemsData, error: itemsError } = await this.server
                .from('invoice_items')
                .select('*')
                .eq('invoice_id', id)
                .order('created_at', { ascending: true });

            if (itemsError) throw new Error(`Supabase items error: ${itemsError.message} (code: ${itemsError.code})`);

            const result = {
                ...invoiceData,
                items: itemsData || []
            };

            return result;
        } catch (error) {
            console.error('Get invoice error:', error);
            throw error;
        }
    }

    async getCurrentInvoice() {
        try {
            if (!this.#user || !this.#user.id) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await this.server
                .from('invoices')
                .select('*')
                .eq('client_id', this.#user.id)
                .eq('status', 'draft')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);

            const currentInvoice = data?.[0] || null;

            return currentInvoice;
        } catch (error) {
            console.error('Get current invoice error:', error);
            throw error;
        }
    }

    async validateInvoice(invoice_id: number) {
        try {
            if (!invoice_id) {
                throw new Error('invoice_id cannot be null');
            }

            const { data: items, error: itemsError } = await this.server
                .from('invoice_items')
                .select('qte, price')
                .eq('invoice_id', invoice_id);

            if (itemsError) throw itemsError;

            const calculatedTotal = items.reduce((sum, item) => sum + (item.qte * item.price), 0);

            const { data: invoice, error: invoiceError } = await this.server
                .from('invoices')
                .select('total, status')
                .eq('id', invoice_id)
                .single();

            if (invoiceError) throw invoiceError;

            const isValid = Math.abs(invoice.total - calculatedTotal) < 0.01;


            return { isValid, calculatedTotal, storedTotal: invoice.total, status: invoice.status };
        } catch (error) {
            console.error('Validate invoice error:', error);
            throw error;
        }
    }

    // ===============================
    // INVOICE ITEMS
    // ===============================

    async getInvoiceItems(invoice_id: number) {
        try {
            if (!invoice_id) {
                throw new Error('invoice_id cannot be null');
            }

            const { data, error } = await this.server.rpc('getinvoiceitems', { p_invoice_id: invoice_id });

            if (error) throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);

            return data;
        } catch (error) {
            console.error('Get invoice items error:', error);
            throw error;
        }
    }
    async updateInvoiceTotal(id: number) {
        const { data: items, error: itemsError } = await this.server
            .from('invoice_items')
            .select('price,qte')
            .eq('invoice_id', id);
        if (itemsError)
            return itemsError;
        const newTotal = items.reduce((sum, item) => sum + item.qte * item.price, 0);
        const { error: updateError } = await this.server
            .from('invoices')
            .update({ total: newTotal })
            .eq('id', id);
        return updateError;
    }
    async updateInvoiceItem(item: invoiceItem) {
        let { id, product_id, invoice_id, qte, observation, price, product } = item;
        if (!product)
            product = this.getRow('products', product_id);

        try {
            if (!invoice_id || !product_id || !id) {
                throw new Error('invoice_id and product_id cannot be null');
            }
            if (qte <= 0) {
                throw new Error('quantity must be greater than 0');
            }
            const { data, error } = await this.server
                .from('invoice_items')
                .upsert({
                    id,
                    invoice_id,
                    product_id,
                    qte,
                    price,
                    observation, product
                })
                .select()
                .single();
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            Object.assign(item, data);
            this.system.saveRowLoacl('invoice_items', data);
            const updateError = await this.updateInvoiceTotal(invoice_id);
            if (updateError)
                throw new Error(`Supabase error: ${updateError.message} (code: ${updateError.code})`);
            return data;
        }
        catch (error) {
            console.error('Add item to invoice error:', error);
            throw error;
        }
    }

    async deleteInvoiceItem(item_id: number) {
        try {
            if (!item_id) {
                throw new Error('item_id cannot be null');
            }

            const { data, error } = await this.server
                .from('invoice_items')
                .delete()
                .eq('id', item_id);

            if (error) throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);

            return data;
        } catch (error) {
            console.error('Delete invoice item error:', error);
            throw error;
        }
    }

}
function parseDate(value: string | number | Date) {
    if (!value) value = 0;
    else if (typeof value === 'string') value = isNaN(Number(value)) ? Date.parse(value) : Number(value);
    else if (typeof value === 'number') value = new Date(value);
    else if (value instanceof Date) return value;
    return new Date(value);
}
function dateToString(date: string | number | Date) {
    if (date)
        if (typeof date === 'number') return new Date(date).toISOString();
        else if (date instanceof Date) return date.toISOString();
        else if (typeof date === 'string') return parseDate(date).toISOString();
    return new Date().toISOString();
}
function newPromise<T>() {
    let resolve: (value: T) => void = <(value: T) => void><any>null, reject: (reason?: any) => void = <(reason?: any) => void><any>null;
    const promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return { promise, resolve, reject };
}

