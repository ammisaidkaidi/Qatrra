"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = exports.database = exports.Memory = exports.System = exports.table = exports.createClient = void 0;
/// <reference path="F:/testing/SM/node_modules/idb/build/entry.d.ts" />
const DB = __importStar(require("../libs/IDB/build/index.js"));
const SB = __importStar(require("@supabase/supabase-js"));
//import * as SB from '../libs/SB/dist/module/index.js';
const IndexedArray_js_1 = require("./../help/IndexedArray.js");
exports.createClient = SB.createClient;
const _tableDef = [
    { name: 'clients', keypath: 'id' },
    { name: 'categories', keypath: 'id' },
    { name: 'products', keypath: 'id' },
    { name: 'invoices', keypath: 'id' },
    { name: 'invoice_items', keypath: 'id' },
    { name: 'locations', keypath: 'id' },
    { name: 'shemas', keypath: 'name', local: true },
];
class table {
    local;
    name;
    keyPath;
    system;
    #rows;
    get #db() { return this.system.database; }
    get database() { return this.#db.db; }
    get server() { return this.#db.server; }
    constructor(local, name, keyPath, system) {
        this.local = local;
        this.name = name;
        this.keyPath = keyPath;
        this.system = system;
        this.#rows = new IndexedArray_js_1.IndexedArray(keyPath);
    }
    async initialize() {
        return this.system.load(this.name, this.name !== 'shemas');
    }
    get rows() { return this.#rows; }
    fetchAll(server) {
        const modifier = onFetch[this.name];
        if (typeof modifier === 'function') {
            return modifier(this.system, server);
        }
    }
}
exports.table = table;
class SystemItem {
    _system;
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
    constructor(_system) {
        this._system = _system;
    }
    getTable(table) {
        return this.memory.tables.get(table);
    }
}
class System {
    databaseName;
    databaseVersion;
    defs;
    database;
    api;
    memory;
    session;
    constructor(databaseName = "data", databaseVersion = 1, defs = _tableDef) {
        this.databaseName = databaseName;
        this.databaseVersion = databaseVersion;
        this.defs = defs;
        this.database = new database(this);
        this.api = new API(this);
        this.memory = new Memory(this);
    }
    async newRow(table, init) {
        try {
            const { data, error } = await this.api.server
                .from(table)
                .insert(init || {})
                .select()
                .single();
            if (error)
                throw error;
            this.memory.save(table, data);
            await this.database.put(table, data);
            return data;
        }
        catch (error) {
            console.error('Error creating new row:', error);
            return undefined;
        }
    }
    async updateRow(table, row) {
        try {
            const { data, error } = await this.api.server
                .from(table)
                .select('*').eq('id', row.id)
                .single();
            if (error)
                throw error;
            Object.assign(row, data);
            this.saveRowLoacl(table, data);
            return true;
        }
        catch (error) {
            console.error('Error saving row:', error);
            return false;
        }
    }
    async uploadRow(table, row) {
        try {
            const { data, error } = await this.api.server
                .from(table)
                .upsert(row)
                .select()
                .single();
            if (error)
                throw error;
            // check this line
            this.saveRowLoacl(table, data);
        }
        catch (error) {
            console.error('Error saving row:', error);
            throw error;
        }
    }
    async deleteRow(table, rowId) {
        const id = typeof rowId === 'object' ? rowId.id : rowId;
        const { data, error } = await this.api.server
            .from(table)
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        this.memory.delete(table, id);
        await this.database.delete(table, id);
        return data;
    }
    async saveRowLoacl(table, row) {
        this.memory.save(table, row);
        await this.database.put(table, row);
    }
    async updated_at(table, value) {
        if (!arguments.length || value === undefined) {
            const row = await this.database.db.get('shemas', table);
            return parseDate(row ? row['updated_at'] : 0);
        }
        const row = await this.database.db.put('shemas', { name: table, updated_at: dateToString(value) });
        return parseDate(value);
    }
    async load(table, fetch = true, deep) {
        const now = new Date(Date.now());
        const updated_at = deep ? new Date(Date.now()) : await this.updated_at(table);
        const rows = await this.database.getAll(table);
        this.memory.save(table, rows);
        if (fetch) {
            this.saveRowLoacl(table, await this.api.fetchAll(table, updated_at));
            await this.updated_at(table, now);
        }
    }
    async loadAll(deep) {
        await Promise.all(this.defs.map(async (def) => {
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
            }
            catch (e) {
                console.error('Failed to parse cached user:', e);
                localStorage.removeItem('user');
            }
        }
        return false;
    }
    user;
}
exports.System = System;
class Memory extends SystemItem {
    #tables = new Map();
    get tables() { return this.#tables; }
    initialize() {
        const system = this.system;
        system.defs.forEach(def => {
            this.#tables.set(def.name, new table(def.local || false, def.name, def.keypath || 'id', system));
        });
    }
    getTable(name) {
        if (!this.#tables.has(name))
            throw new Error(`no table ${name}`);
        return this.#tables.get(name);
    }
    save(table, rows) {
        this.#tables.get(table)?.rows.set(rows);
    }
    delete(table, rows) {
        this.#tables.get(table)?.rows.deletes(rows);
    }
}
exports.Memory = Memory;
class database extends SystemItem {
    #db = null;
    get db() { return this.#db; }
    async initialize() {
        const _this = this;
        function call(name) {
            return function () { return _this[name].apply(_this, arguments); };
        }
        this.#db = await DB.openDB(this.databaseName, this.databaseVersion, { blocked: call('blocked'), blocking: call('blocking'), terminated: call('terminated'), upgrade: call('upgrade') });
    }
    async upgrade(database, oldVersion, newVersion, transaction, event) {
        createTable.call(this, 'shemas', 'name');
        this.tables.forEach(table => createTable.call(this, table.name, table.keyPath));
        function createTable(tableName, key) {
            if (!database.objectStoreNames.contains(tableName))
                database.createObjectStore(tableName, { keyPath: key || 'id' });
        }
        transaction.commit();
        await transaction.done;
    }
    async terminated() {
        await this.initialize();
    }
    blocked(currentVersion, blockedVersion, event) {
    }
    blocking(currentVersion, blockedVersion, event) {
    }
    async put(table, rows) {
        if (!(rows instanceof Array))
            rows = [rows];
        const tx = this.db.transaction(table, 'readwrite');
        const store = tx.store;
        for (const row of rows)
            store.put(row);
        return tx.done;
    }
    async _delete(table, row) {
    }
    async delete(table, rows) {
        if (!(rows instanceof Array))
            rows = [rows];
        const tx = this.db.transaction(table, 'readwrite');
        const store = tx.store;
        const _table = this.memory.getTable(table);
        for (let row of rows) {
            let id = row instanceof Object ? row = row[_table.keyPath] : row;
            store.delete(id);
        }
        return tx.done;
    }
    async getAll(table) {
        return await this.db.getAll(table);
    }
}
exports.database = database;
const onFetch = {
    invoices(system, api) {
        const query = api.server
            .from('invoices')
            .select('*');
        return query.eq('client_id', system.user.id)
            .order('created_at', { ascending: false });
    },
    products(system, api) {
        const query = api.server
            .from('invoices')
            .select('*');
        return query.order('updated_at', { ascending: false, nullsFirst: false });
    }
};
class API extends SystemItem {
    #logged = false;
    #user = { id: 0, name: "", phone: '', pwd: '' };
    #server;
    get server() { return this.#server; }
    get database() { return this.system.database; }
    constructor(system) {
        super(system);
        const SUPABASE_URL = 'https://rhqckxywcpiwmddpngby.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocWNreHl3Y3Bpd21kZHBuZ2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDg0MzEsImV4cCI6MjA3NjA4NDQzMX0.yb3IbFipfKgOE61cOe-VKQ5keNSo7FhI3UW3Ik-fvRY';
        this.#server = SB.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    async fetchAll(tableName, after) {
        const { promise, resolve } = newPromise();
        const table = this.getTable(tableName);
        const query = table?.fetchAll(this) || this.server
            .from(tableName)
            .select('*');
        if (after)
            query.gte('updated_at', after.toISOString());
        query.then(async ({ data, error }) => {
            if (error)
                return resolve(undefined);
            resolve(data);
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
    async login({ email, pwd, phone }) {
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
    async login1({ phone, pwd }) {
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
            if (clientError)
                throw new Error(`Client fetch error: ${clientError.message}`);
            if (!clientData)
                throw new Error('Client not found or invalid credentials');
            Object.assign(this.#user, clientData);
            localStorage.setItem('user', JSON.stringify(this.#user));
            this.#logged = true;
            return true;
        }
        catch (error) {
            this.#logged = false;
            console.error('Login error:', error);
            return error;
        }
    }
    get logged() {
        return this.#logged;
    }
    async getIds(table, keyPath) {
        try {
            const { data, error } = await this.server
                .from(table)
                .select(keyPath);
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            return data;
        }
        catch (error) {
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
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            return data;
        }
        catch (error) {
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
    async getProducts(output) {
        try {
            const { data, error } = await this.server
                .from('products')
                .select('*');
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            output.set(data);
            return data;
        }
        catch (error) {
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
    async getInvoices(output, store) {
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
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            output.set(data);
            return data;
        }
        catch (error) {
            console.error('Get invoices error:', error);
            throw error;
        }
    }
    async getInvoice(id) {
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
            if (invoiceError)
                throw new Error(`Supabase invoice error: ${invoiceError.message} (code: ${invoiceError.code})`);
            if (!invoiceData)
                throw new Error('Invoice not found or you do not have access');
            const { data: itemsData, error: itemsError } = await this.server
                .from('invoice_items')
                .select('*')
                .eq('invoice_id', id)
                .order('created_at', { ascending: true });
            if (itemsError)
                throw new Error(`Supabase items error: ${itemsError.message} (code: ${itemsError.code})`);
            const result = {
                ...invoiceData,
                items: itemsData || []
            };
            return result;
        }
        catch (error) {
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
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            const currentInvoice = data?.[0] || null;
            return currentInvoice;
        }
        catch (error) {
            console.error('Get current invoice error:', error);
            throw error;
        }
    }
    async validateInvoice(invoice_id) {
        try {
            if (!invoice_id) {
                throw new Error('invoice_id cannot be null');
            }
            const { data: items, error: itemsError } = await this.server
                .from('invoice_items')
                .select('qte, price')
                .eq('invoice_id', invoice_id);
            if (itemsError)
                throw itemsError;
            const calculatedTotal = items.reduce((sum, item) => sum + (item.qte * item.price), 0);
            const { data: invoice, error: invoiceError } = await this.server
                .from('invoices')
                .select('total, status')
                .eq('id', invoice_id)
                .single();
            if (invoiceError)
                throw invoiceError;
            const isValid = Math.abs(invoice.total - calculatedTotal) < 0.01;
            return { isValid, calculatedTotal, storedTotal: invoice.total, status: invoice.status };
        }
        catch (error) {
            console.error('Validate invoice error:', error);
            throw error;
        }
    }
    // ===============================
    // INVOICE ITEMS
    // ===============================
    async getInvoiceItems(invoice_id) {
        try {
            if (!invoice_id) {
                throw new Error('invoice_id cannot be null');
            }
            const { data, error } = await this.server.rpc('getinvoiceitems', { p_invoice_id: invoice_id });
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            return data;
        }
        catch (error) {
            console.error('Get invoice items error:', error);
            throw error;
        }
    }
    async updateInvoiceItem(item) {
    }
    async addItemToInvoice({ invoice_id, product_id, quantity }) {
        try {
            if (!invoice_id || !product_id || !quantity) {
                throw new Error('invoice_id, product_id, and quantity cannot be null');
            }
            if (quantity <= 0) {
                throw new Error('quantity must be greater than 0');
            }
            const { data: product, error: productError } = await this.server
                .from('products')
                .select('price')
                .eq('id', product_id)
                .single();
            if (productError)
                throw productError;
            const price = product.price;
            const total = price * quantity;
            const { data, error } = await this.server
                .from('invoice_items')
                .insert({
                invoice_id,
                product_id,
                qte: quantity,
                price,
                total
            })
                .select()
                .single();
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            // Update invoice total
            const { data: items, error: itemsError } = await this.server
                .from('invoice_items')
                .select('total')
                .eq('invoice_id', invoice_id);
            if (itemsError)
                throw itemsError;
            const newTotal = items.reduce((sum, item) => sum + item.total, 0);
            const { error: updateError } = await this.server
                .from('invoices')
                .update({ total: newTotal })
                .eq('id', invoice_id);
            if (updateError)
                throw new Error(`Supabase error: ${updateError.message} (code: ${updateError.code})`);
            return data;
        }
        catch (error) {
            console.error('Add item to invoice error:', error);
            throw error;
        }
    }
    async deleteInvoiceItem(item_id) {
        try {
            if (!item_id) {
                throw new Error('item_id cannot be null');
            }
            const { data, error } = await this.server
                .from('invoice_items')
                .delete()
                .eq('id', item_id);
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            return data;
        }
        catch (error) {
            console.error('Delete invoice item error:', error);
            throw error;
        }
    }
}
exports.API = API;
function parseDate(value) {
    if (!value)
        value = 0;
    else if (typeof value === 'string')
        value = isNaN(Number(value)) ? Date.parse(value) : Number(value);
    else if (typeof value === 'number')
        value = new Date(value);
    else if (value instanceof Date)
        return value;
    return new Date(value);
}
function dateToString(date) {
    if (date)
        if (typeof date === 'number')
            return new Date(date).toISOString();
        else if (date instanceof Date)
            return date.toISOString();
        else if (typeof date === 'string')
            return parseDate(date).toISOString();
    return new Date().toISOString();
}
function newPromise() {
    let resolve = null, reject = null;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return { promise, resolve, reject };
}
