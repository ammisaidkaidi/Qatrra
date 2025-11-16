import {IndexedArray, SB, DB} from "./index.js";

export const createClient = SB.createClient;
const _tableDef = [{
    name: 'clients',
    keypath: 'id'
}, {
    name: 'categories',
    keypath: 'id'
}, {
    name: 'products',
    keypath: 'id'
}, {
    name: 'invoices',
    keypath: 'id'
}, {
    name: 'invoice_items',
    keypath: 'id'
}, {
    name: 'locations',
    keypath: 'id'
}, {
    name: 'shemas',
    keypath: 'name',
    local: true
}, ];
export class table {
    local;
    name;
    keyPath;
    system;
    #rows;
    get #db() {
        return this.system.database;
    }
    get database() {
        return this.#db.db;
    }
    get server() {
        return this.#db.server;
    }
    constructor(local, name, keyPath, system) {
        this.local = local;
        this.name = name;
        this.keyPath = keyPath;
        this.system = system;
        this.#rows = new IndexedArray(keyPath);
    }
    async initialize() {
        return this.system.load(this.name, this.name !== 'shemas');
    }
    get rows() {
        return this.#rows;
    }
    fetchAll(server) {
        const modifier = onFetch[this.name];
        if (typeof modifier === 'function') {
            return modifier(this.system, server);
        }
    }
}
class SystemItem {
    _system;
    get database() {
        return this.system.database;
    }
    get api() {
        return this.system.api;
    }
    get memory() {
        return this.system.memory;
    }
    get databaseName() {
        return this.system.databaseName;
    }
    get databaseVersion() {
        return this.system.databaseVersion;
    }
    get db() {
        return this.system.database.db;
    }
    get server() {
        return this.system.api.server;
    }
    get tables() {
        return this.memory.tables;
    }
    get system() {
        return this._system;
    }
    set system(v) {
        debugger ;
    }
    constructor(_system) {
        this._system = _system;
    }
    getTable(table) {
        return this.memory.tables.get(table);
    }
}
export class System {
    databaseName;
    databaseVersion;
    defs;
    database;
    api;
    memory;
    session;
    constructor(databaseName="data", databaseVersion=1, defs=_tableDef) {
        this.databaseName = databaseName;
        this.databaseVersion = databaseVersion;
        this.defs = defs;
        this.database = new database(this);
        this.api = new API(this);
        this.memory = new Memory(this);
    }
    async newRow(table, init) {
        try {
            const {data, error} = await this.api.server.from(table).insert(init || {}).select().single();
            if (error)
                throw error;
            this.memory.save(table, data);
            await this.database.put(table, data);
            return data;
        } catch (error) {
            console.error('Error creating new row:', error);
            return undefined;
        }
    }
    async updateRow(table, row) {
        try {
            const {data, error} = await this.api.server.from(table).select('*').eq('id', row.id).single();
            if (error)
                throw error;
            Object.assign(row, data);
            this.saveRowLoacl(table, data);
            return true;
        } catch (error) {
            console.error('Error saving row:', error);
            return false;
        }
    }
    async uploadRow(table, row) {
        try {
            const {data, error} = await this.api.server.from(table).upsert(row).select().single();
            if (error)
                throw error;
            this.saveRowLoacl(table, data);
        } catch (error) {
            console.error('Error saving row:', error);
            throw error;
        }
    }
    async deleteRow(table, rowId) {
        const id = typeof rowId === 'object' ? rowId.id : rowId;
        const {data, error} = await this.api.server.from(table).delete().eq('id', id);
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
        const row = await this.database.db.put('shemas', {
            name: table,
            updated_at: dateToString(value)
        });
        return parseDate(value);
    }
    async load(table, fetch=true, deep) {
        const now = new Date(Date.now());
        const updated_at = deep ? new Date(Date.now()) : await this.updated_at(table);
        const rows = await this.database.getAll(table);
        this.memory.save(table, rows);
        if (fetch) {
            debugger ;const rows = await this.api.fetchAll(table, updated_at);
            if(rows){
             this.saveRowLoacl(table, rows);
            await this.updated_at(table, now);
            }
        }
    }
    async loadAll(deep) {
        await Promise.all(this.defs.map(async (def) => {
            return this.load(def.name, !def.local, deep);
        }
        ));
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
    user;
}
export class Memory extends SystemItem {
    #tables = new Map();
    get tables() {
        return this.#tables;
    }
    initialize() {
        const system = this.system;
        system.defs.forEach(def => {
            this.#tables.set(def.name, new table(def.local || false,def.name,def.keypath || 'id',system));
        }
        );
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
export class database extends SystemItem {
    #db = null;
    get db() {
        return this.#db;
    }
    async initialize() {
        const _this = this;
        function call(name) {
            return function() {
                return _this[name].apply(_this, arguments);
            }
            ;
        }
        this.#db = await DB.openDB(this.databaseName, this.databaseVersion, {
            blocked: call('blocked'),
            blocking: call('blocking'),
            terminated: call('terminated'),
            upgrade: call('upgrade')
        });
    }
    async upgrade(database, oldVersion, newVersion, transaction, event) {
        createTable.call(this, 'shemas', 'name');
        this.tables.forEach(table => createTable.call(this, table.name, table.keyPath));
        function createTable(tableName, key) {
            if (!database.objectStoreNames.contains(tableName))
                database.createObjectStore(tableName, {
                    keyPath: key || 'id'
                });
        }
        transaction.commit();
        await transaction.done;
    }
    async terminated() {
        await this.initialize();
    }
    blocked(currentVersion, blockedVersion, event) {}
    blocking(currentVersion, blockedVersion, event) {}
    async put(table, rows) {
        if (!(rows instanceof Array))
            rows = [rows];
        const tx = this.db.transaction(table, 'readwrite');
        const store = tx.store;
        for (const row of rows)
            store.put(row);
        return tx.done;
    }
    async _delete(table, row) {}
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
const onFetch = {
    invoices(system, api) {
        const query = api.server.from('invoices').select('*');
        return query.eq('client_id', system.user.id).order('created_at', {
            ascending: false
        });
    },
    products(system, api) {
        const query = api.server.from('invoices').select('*');
        return query.order('updated_at', {
            ascending: false,
            nullsFirst: false
        });
    }
};
export class API extends SystemItem {
    #logged = false;
    #user = {
        id: 0,
        name: "",
        phone: '',
        pwd: ''
    };
    #server;
    get server() {
        return this.#server;
    }
    get database() {
        return this.system.database;
    }
    constructor(system) {
        super(system);
        const SUPABASE_URL = 'https://rhqckxywcpiwmddpngby.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocWNreHl3Y3Bpd21kZHBuZ2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDg0MzEsImV4cCI6MjA3NjA4NDQzMX0.yb3IbFipfKgOE61cOe-VKQ5keNSo7FhI3UW3Ik-fvRY';
        this.#server = SB.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    async fetchAll(tableName, after) {
        const {promise, resolve} = newPromise();
        const table = this.getTable(tableName);
        const query = table?.fetchAll(this) || this.server.from(tableName).select('*');
        if (after)
            query.gte('updated_at', after.toISOString());
        query.then(async ({data, error}) => {
            if (error)
                return resolve(undefined);
            resolve(data);
        }
        );
        return promise;
    }
    async auth() {
        const {data: {session}, error} = await this.server.auth.getSession();
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
    async login({email, pwd, phone}) {
        if (phone && pwd)
            return this.login1({
                phone,
                pwd
            });
        else if (email && pwd)
            return this.server.auth.signInWithPassword({
                email: email,
                password: pwd
            }).then( ({data, error}) => {
                if (error)
                    return error;
                return true;
            }
            );
        else {
            return new Error('Invalid login parameters');
        }
    }
    async login1({phone, pwd}) {
        try {
            if (!phone || !pwd) {
                throw new Error('phone and pwd cannot be null');
            }
            phone = phone.trim();
            const {data: clientData, error: clientError} = await this.server.from('clients').select('*').eq('phone', phone).eq('pwd', pwd).maybeSingle();
            if (clientError)
                throw new Error(`Client fetch error: ${clientError.message}`);
            if (!clientData)
                throw new Error('Client not found or invalid credentials');
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
    async getIds(table, keyPath) {
        try {
            const {data, error} = await this.server.from(table).select(keyPath);
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            return data;
        } catch (error) {
            return undefined;
        }
    }
    async getCategories() {
        try {
            const {data, error} = await this.server.from('categories').select('*').order('name', {
                ascending: true
            });
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            return data;
        } catch (error) {
            console.error('Get categories error:', error);
            throw error;
        }
    }
    async getProducts(output) {
        try {
            const {data, error} = await this.server.from('products').select('*');
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            output.set(data);
            return data;
        } catch (error) {
            console.error('Get products error:', error);
            throw error;
        }
    }
    async getInvoices(output, store) {
        try {
            if (!this.#logged) {
                throw new Error('User not authenticated');
            }
            const {data, error} = await this.server.from('invoices').select('*').eq('client_id', this.#user.id).order('created_at', {
                ascending: false
            });
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            output.set(data);
            return data;
        } catch (error) {
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
            const {data: invoiceData, error: invoiceError} = await this.server.from('invoices').select('*').eq('id', id).eq('client_id', this.#user.id).maybeSingle();
            if (invoiceError)
                throw new Error(`Supabase invoice error: ${invoiceError.message} (code: ${invoiceError.code})`);
            if (!invoiceData)
                throw new Error('Invoice not found or you do not have access');
            const {data: itemsData, error: itemsError} = await this.server.from('invoice_items').select('*').eq('invoice_id', id).order('created_at', {
                ascending: true
            });
            if (itemsError)
                throw new Error(`Supabase items error: ${itemsError.message} (code: ${itemsError.code})`);
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
            const {data, error} = await this.server.from('invoices').select('*').eq('client_id', this.#user.id).eq('status', 'draft').order('created_at', {
                ascending: false
            }).limit(1);
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            const currentInvoice = data?.[0] || null;
            return currentInvoice;
        } catch (error) {
            console.error('Get current invoice error:', error);
            throw error;
        }
    }
    async validateInvoice(invoice_id) {
        try {
            if (!invoice_id) {
                throw new Error('invoice_id cannot be null');
            }
            const {data: items, error: itemsError} = await this.server.from('invoice_items').select('qte, price').eq('invoice_id', invoice_id);
            if (itemsError)
                throw itemsError;
            const calculatedTotal = items.reduce( (sum, item) => sum + (item.qte * item.price), 0);
            const {data: invoice, error: invoiceError} = await this.server.from('invoices').select('total, status').eq('id', invoice_id).single();
            if (invoiceError)
                throw invoiceError;
            const isValid = Math.abs(invoice.total - calculatedTotal) < 0.01;
            return {
                isValid,
                calculatedTotal,
                storedTotal: invoice.total,
                status: invoice.status
            };
        } catch (error) {
            console.error('Validate invoice error:', error);
            throw error;
        }
    }
    async getInvoiceItems(invoice_id) {
        try {
            if (!invoice_id) {
                throw new Error('invoice_id cannot be null');
            }
            const {data, error} = await this.server.rpc('getinvoiceitems', {
                p_invoice_id: invoice_id
            });
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            return data;
        } catch (error) {
            console.error('Get invoice items error:', error);
            throw error;
        }
    }
    async updateInvoiceItem(item) {}
    async addItemToInvoice({invoice_id, product_id, quantity}) {
        try {
            if (!invoice_id || !product_id || !quantity) {
                throw new Error('invoice_id, product_id, and quantity cannot be null');
            }
            if (quantity <= 0) {
                throw new Error('quantity must be greater than 0');
            }
            const {data: product, error: productError} = await this.server.from('products').select('price').eq('id', product_id).single();
            if (productError)
                throw productError;
            const price = product.price;
            const total = price * quantity;
            const {data, error} = await this.server.from('invoice_items').insert({
                invoice_id,
                product_id,
                qte: quantity,
                price,
                total
            }).select().single();
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            const {data: items, error: itemsError} = await this.server.from('invoice_items').select('total').eq('invoice_id', invoice_id);
            if (itemsError)
                throw itemsError;
            const newTotal = items.reduce( (sum, item) => sum + item.total, 0);
            const {error: updateError} = await this.server.from('invoices').update({
                total: newTotal
            }).eq('id', invoice_id);
            if (updateError)
                throw new Error(`Supabase error: ${updateError.message} (code: ${updateError.code})`);
            return data;
        } catch (error) {
            console.error('Add item to invoice error:', error);
            throw error;
        }
    }
    async deleteInvoiceItem(item_id) {
        try {
            if (!item_id) {
                throw new Error('item_id cannot be null');
            }
            const {data, error} = await this.server.from('invoice_items').delete().eq('id', item_id);
            if (error)
                throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
            return data;
        } catch (error) {
            console.error('Delete invoice item error:', error);
            throw error;
        }
    }
}
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
    let resolve = null
      , reject = null;
    const promise = new Promise( (_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    }
    );
    return {
        promise,
        resolve,
        reject
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2hELE9BQU8sS0FBSyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFLNUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBS3pELE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDO0FBYzVDLE1BQU0sU0FBUyxHQUFlO0lBQzFCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0lBQ2xDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0lBQ3JDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0lBQ25DLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0lBQ25DLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0lBQ3hDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0lBQ3BDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7Q0FDbkQsQ0FBQztBQVFGLE1BQU0sT0FBTyxLQUFLO0lBVU87SUFBZ0M7SUFBdUI7SUFBdUI7SUFSbkcsS0FBSyxDQUF5QjtJQUU5QixJQUFJLEdBQUcsS0FBZSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNwRCxJQUFJLFFBQVEsS0FBSyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN0QyxJQUFJLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxH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bm9kZV9tb2R1bGVzL2lkYi9idWlsZC9lbnRyeS5kLnRzXCIgLz5cbmltcG9ydCAqIGFzIERCIGZyb20gXCIuLi9saWJzL0lEQi9idWlsZC9pbmRleC5qc1wiXG5pbXBvcnQgKiBhcyBTQiBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnO1xuaW1wb3J0IHtBdXRoQ2xpZW50LEF1dGhBZG1pbkFwaSxHb1RydWVBZG1pbkFwaSxHb1RydWVDbGllbnQsTmF2aWdhdG9yTG9ja0FjcXVpcmVUaW1lb3V0RXJyb3IsbG9ja0ludGVybmFscyxuYXZpZ2F0b3JMb2NrLHByb2Nlc3NMb2NrfSBmcm9tICdAc3VwYWJhc2UvYXV0aC1qcyc7XG5cblxuLy9pbXBvcnQgKiBhcyBTQiBmcm9tICcuLi9saWJzL1NCL2Rpc3QvbW9kdWxlL2luZGV4LmpzJztcbmltcG9ydCB7IEluZGV4ZWRBcnJheSB9IGZyb20gXCIuLy4uL2hlbHAvSW5kZXhlZEFycmF5LmpzXCI7XG5pbXBvcnQgeyBQb3N0Z3Jlc3RGaWx0ZXJCdWlsZGVyIH0gZnJvbSBcIkBzdXBhYmFzZS9wb3N0Z3Jlc3QtanNcIjtcbmltcG9ydCB7IGludm9pY2VJdGVtIH0gZnJvbSBcIi4uL2RlZi9pbmRleC5qc1wiO1xuXG5leHBvcnQgZGVjbGFyZSB0eXBlIFJvdyA9IGFueTtcbmV4cG9ydCBjb25zdCBjcmVhdGVDbGllbnQgPSBTQi5jcmVhdGVDbGllbnQ7XG5leHBvcnQgZGVjbGFyZSB0eXBlIE5VTEw8VD4gPSBUIHwgdW5kZWZpbmVkO1xudHlwZSBJT2JqZWN0PFQgZXh0ZW5kcyBzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wsIEtFWSBleHRlbmRzIFQ+ID0ge1xuICAgIFtuIGluIFRdOiBuIGV4dGVuZHMgS0VZID8gSURCVmFsaWRLZXkgOiBhbnk7XG59XG50eXBlIElSb3c8S0VZIGV4dGVuZHMgUFJPUFMsIERFRiBleHRlbmRzIElPYmplY3Q8UFJPUFMsIEtFWT4sIFBST1BTIGV4dGVuZHMga2V5b2YgREVGID0ga2V5b2YgREVGPiA9IHtcbiAgICBbcyBpbiBQUk9QU106IHMgZXh0ZW5kcyBLRVkgPyBJREJWYWxpZEtleSA6IERFRltzXTtcbn07XG5cblxuZXhwb3J0IGRlY2xhcmUgdHlwZSBJU2hlbWFzID0gSVJvdzwnbmFtZScsIHsgbmFtZTogc3RyaW5nLCB1cGRhdGVkX2F0OiBEYXRlIH0+O1xuZXhwb3J0IGRlY2xhcmUgdHlwZSBJUHJvZHVjdCA9IElSb3c8J2lkJywgeyBpZDogbnVtYmVyLCBuYW1lOiBzdHJpbmcsIHF0ZTogbnVtYmVyLCBwcmljZTogbnVtYmVyIH0+O1xuZXhwb3J0IGRlY2xhcmUgdHlwZSBJSW52b2ljZSA9IElSb3c8J2lkJywgeyBpZDogbnVtYmVyLCBjcmVhdGVkX2F0OiBEYXRlLCB1cGRhdGVkX2F0OiBEYXRlLCB0b3RhbDogbnVtYmVyLCBjbGllbnRfaWQ6IG51bWJlciwgY2xpZW50OiBzdHJpbmcsIHN0YXR1czogc3RyaW5nIH0+O1xuXG5jb25zdCBfdGFibGVEZWY6IHRhYmxlRGVmW10gPSBbXG4gICAgeyBuYW1lOiAnY2xpZW50cycsIGtleXBhdGg6ICdpZCcgfSxcbiAgICB7IG5hbWU6ICdjYXRlZ29yaWVzJywga2V5cGF0aDogJ2lkJyB9LFxuICAgIHsgbmFtZTogJ3Byb2R1Y3RzJywga2V5cGF0aDogJ2lkJyB9LFxuICAgIHsgbmFtZTogJ2ludm9pY2VzJywga2V5cGF0aDogJ2lkJyB9LFxuICAgIHsgbmFtZTogJ2ludm9pY2VfaXRlbXMnLCBrZXlwYXRoOiAnaWQnIH0sXG4gICAgeyBuYW1lOiAnbG9jYXRpb25zJywga2V5cGF0aDogJ2lkJyB9LFxuICAgIHsgbmFtZTogJ3NoZW1hcycsIGtleXBhdGg6ICduYW1lJywgbG9jYWw6IHRydWUgfSxcbl07XG5cblxuZXhwb3J0IGludGVyZmFjZSB0YWJsZURlZiB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGtleXBhdGg/OiBzdHJpbmcgfCAnaWQnO1xuICAgIGxvY2FsPzogYm9vbGVhbjtcbn1cbmV4cG9ydCBjbGFzcyB0YWJsZTxLRVkgZXh0ZW5kcyBFeGNsdWRlPGtleW9mIFJPVywgU3ltYm9sIHwgbnVtYmVyPiwgUk9XIGV4dGVuZHMgT2JqZWN0ID0gUm93PiB7XG5cbiAgICAjcm93czogSW5kZXhlZEFycmF5PFJPVywgS0VZPjtcblxuICAgIGdldCAjZGIoKTogZGF0YWJhc2UgeyByZXR1cm4gdGhpcy5zeXN0ZW0uZGF0YWJhc2U7IH1cbiAgICBnZXQgZGF0YWJhc2UoKSB7IHJldHVybiB0aGlzLiNkYi5kYjsgfVxuICAgIGdldCBzZXJ2ZXIoKSB7IHJldHVybiB0aGlzLiNkYi5zZXJ2ZXI7IH1cblxuXG5cbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSBsb2NhbDogYm9vbGVhbiwgcHVibGljIHJlYWRvbmx5IG5hbWU6IHN0cmluZywgcmVhZG9ubHkga2V5UGF0aDogS0VZLCByZWFkb25seSBzeXN0ZW06IFN5c3RlbSkge1xuICAgICAgICB0aGlzLiNyb3dzID0gbmV3IEluZGV4ZWRBcnJheTxST1csIEtFWT4oa2V5UGF0aCk7XG4gICAgfVxuXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3lzdGVtLmxvYWQodGhpcy5uYW1lLCB0aGlzLm5hbWUgIT09ICdzaGVtYXMnKTtcbiAgICB9XG5cbiAgICBnZXQgcm93cygpIHsgcmV0dXJuIHRoaXMuI3Jvd3M7IH1cblxuICAgIGZldGNoQWxsKHNlcnZlcjogQVBJKTogUG9zdGdyZXN0RmlsdGVyQnVpbGRlcjxhbnksIGFueSwgYW55LCBhbnlbXSwgc3RyaW5nLCB1bmtub3duLCBcIkdFVFwiPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IG1vZGlmaWVyID0gKG9uRmV0Y2ggYXMgYW55KVt0aGlzLm5hbWVdO1xuICAgICAgICBpZiAodHlwZW9mIG1vZGlmaWVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9kaWZpZXIodGhpcy5zeXN0ZW0sIHNlcnZlcik7XG4gICAgICAgIH1cblxuICAgIH1cbn1cbmFic3RyYWN0IGNsYXNzIFN5c3RlbUl0ZW0ge1xuICAgIGdldCBkYXRhYmFzZSgpIHsgcmV0dXJuIHRoaXMuc3lzdGVtLmRhdGFiYXNlOyB9XG4gICAgZ2V0IGFwaSgpIHsgcmV0dXJuIHRoaXMuc3lzdGVtLmFwaTsgfVxuICAgIGdldCBtZW1vcnkoKSB7IHJldHVybiB0aGlzLnN5c3RlbS5tZW1vcnk7IH1cbiAgICBnZXQgZGF0YWJhc2VOYW1lKCkgeyByZXR1cm4gdGhpcy5zeXN0ZW0uZGF0YWJhc2VOYW1lOyB9XG4gICAgZ2V0IGRhdGFiYXNlVmVyc2lvbigpIHsgcmV0dXJuIHRoaXMuc3lzdGVtLmRhdGFiYXNlVmVyc2lvbjsgfVxuICAgIGdldCBkYigpIHsgcmV0dXJuIHRoaXMuc3lzdGVtLmRhdGFiYXNlLmRiOyB9XG4gICAgZ2V0IHNlcnZlcigpIHsgcmV0dXJuIHRoaXMuc3lzdGVtLmFwaS5zZXJ2ZXI7IH1cbiAgICBnZXQgdGFibGVzKCkgeyByZXR1cm4gdGhpcy5tZW1vcnkudGFibGVzOyB9XG4gICAgZ2V0IHN5c3RlbSgpIHsgcmV0dXJuIHRoaXMuX3N5c3RlbTsgfVxuICAgIHNldCBzeXN0ZW0odikgeyBkZWJ1Z2dlcjsgfVxuXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IF9zeXN0ZW06IFN5c3RlbSkgeyB9XG4gICAgZ2V0VGFibGUodGFibGU6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5tZW1vcnkudGFibGVzLmdldCh0YWJsZSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3lzdGVtIHtcbiAgICByZWFkb25seSBkYXRhYmFzZTogZGF0YWJhc2U7XG4gICAgcmVhZG9ubHkgYXBpOiBBUEk7XG4gICAgcmVhZG9ubHkgbWVtb3J5OiBNZW1vcnk7XG4gICAgc2Vzc2lvbj86YW55O1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGRhdGFiYXNlTmFtZTogc3RyaW5nID0gXCJkYXRhXCIsIHJlYWRvbmx5IGRhdGFiYXNlVmVyc2lvbjogbnVtYmVyID0gMSwgcmVhZG9ubHkgZGVmczogdGFibGVEZWZbXSA9IF90YWJsZURlZikge1xuICAgICAgICB0aGlzLmRhdGFiYXNlID0gbmV3IGRhdGFiYXNlKHRoaXMpXG4gICAgICAgIHRoaXMuYXBpID0gbmV3IEFQSSh0aGlzKTtcbiAgICAgICAgdGhpcy5tZW1vcnkgPSBuZXcgTWVtb3J5KHRoaXMpO1xuICAgIH1cblxuICAgIGFzeW5jIG5ld1Jvdyh0YWJsZTogc3RyaW5nLCBpbml0OiBSb3cpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHRoaXMuYXBpLnNlcnZlclxuICAgICAgICAgICAgICAgIC5mcm9tKHRhYmxlKVxuICAgICAgICAgICAgICAgIC5pbnNlcnQoaW5pdCB8fCB7fSlcbiAgICAgICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgICAgICAuc2luZ2xlKCk7XG5cbiAgICAgICAgICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB0aGlzLm1lbW9yeS5zYXZlKHRhYmxlLCBkYXRhKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UucHV0KHRhYmxlLCBkYXRhKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JlYXRpbmcgbmV3IHJvdzonLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgdXBkYXRlUm93KHRhYmxlOiBzdHJpbmcsIHJvdzogUm93KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCB0aGlzLmFwaS5zZXJ2ZXJcbiAgICAgICAgICAgICAgICAuZnJvbSh0YWJsZSlcbiAgICAgICAgICAgICAgICAuc2VsZWN0KCcqJykuZXEoJ2lkJywgcm93LmlkKVxuICAgICAgICAgICAgICAgIC5zaW5nbGUoKTtcbiAgICAgICAgICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocm93LCBkYXRhKTtcbiAgICAgICAgICAgIHRoaXMuc2F2ZVJvd0xvYWNsKHRhYmxlLCBkYXRhKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2F2aW5nIHJvdzonLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYXN5bmMgdXBsb2FkUm93KHRhYmxlOiBzdHJpbmcsIHJvdzogUm93KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCB0aGlzLmFwaS5zZXJ2ZXJcbiAgICAgICAgICAgICAgICAuZnJvbSh0YWJsZSlcbiAgICAgICAgICAgICAgICAudXBzZXJ0KHJvdylcbiAgICAgICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgICAgICAuc2luZ2xlKCk7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuICAgICAgICAgICAgLy8gY2hlY2sgdGhpcyBsaW5lXG4gICAgICAgICAgICB0aGlzLnNhdmVSb3dMb2FjbCh0YWJsZSwgZGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzYXZpbmcgcm93OicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZGVsZXRlUm93KHRhYmxlOiBzdHJpbmcsIHJvd0lkOiBzdHJpbmcgfCB7IGlkOiBzdHJpbmcgfSkge1xuICAgICAgICBjb25zdCBpZCA9IHR5cGVvZiByb3dJZCA9PT0gJ29iamVjdCcgPyByb3dJZC5pZCA6IHJvd0lkO1xuICAgICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCB0aGlzLmFwaS5zZXJ2ZXJcbiAgICAgICAgICAgIC5mcm9tKHRhYmxlKVxuICAgICAgICAgICAgLmRlbGV0ZSgpXG4gICAgICAgICAgICAuZXEoJ2lkJywgaWQpO1xuICAgICAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuICAgICAgICB0aGlzLm1lbW9yeS5kZWxldGUodGFibGUsIGlkKTtcbiAgICAgICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5kZWxldGUodGFibGUsIGlkKTtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgYXN5bmMgc2F2ZVJvd0xvYWNsKHRhYmxlOiBzdHJpbmcsIHJvdzogSXRlcmFibGU8Um93PiB8IFJvdykge1xuICAgICAgICB0aGlzLm1lbW9yeS5zYXZlKHRhYmxlLCByb3cpO1xuICAgICAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLnB1dCh0YWJsZSwgcm93KTtcbiAgICB9XG5cbiAgICBhc3luYyB1cGRhdGVkX2F0KHRhYmxlOiBzdHJpbmcpOiBQcm9taXNlPERhdGU+O1xuICAgIGFzeW5jIHVwZGF0ZWRfYXQodGFibGU6IHN0cmluZywgdmFsdWU6IHVuZGVmaW5lZCk6IFByb21pc2U8RGF0ZT47XG4gICAgYXN5bmMgdXBkYXRlZF9hdCh0YWJsZTogc3RyaW5nLCB2YWx1ZTogRGF0ZSk6IFByb21pc2U8RGF0ZT5cbiAgICBhc3luYyB1cGRhdGVkX2F0KHRhYmxlOiBzdHJpbmcsIHZhbHVlPzogRGF0ZSk6IFByb21pc2U8RGF0ZT4ge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGggfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5kYi5nZXQoJ3NoZW1hcycsIHRhYmxlKTtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZURhdGUocm93ID8gcm93Wyd1cGRhdGVkX2F0J10gOiAwKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByb3cgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLmRiLnB1dCgnc2hlbWFzJywgeyBuYW1lOiB0YWJsZSwgdXBkYXRlZF9hdDogZGF0ZVRvU3RyaW5nKHZhbHVlKSB9KTtcbiAgICAgICAgcmV0dXJuIHBhcnNlRGF0ZSh2YWx1ZSk7XG4gICAgfVxuXG4gICAgYXN5bmMgbG9hZCh0YWJsZTogc3RyaW5nLCBmZXRjaCA9IHRydWUsIGRlZXA/OiBib29sZWFuKSB7XG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKERhdGUubm93KCkpO1xuICAgICAgICBjb25zdCB1cGRhdGVkX2F0ID0gZGVlcCA/IG5ldyBEYXRlKERhdGUubm93KCkpIDogYXdhaXQgdGhpcy51cGRhdGVkX2F0KHRhYmxlKTtcbiAgICAgICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuZ2V0QWxsKHRhYmxlKTtcbiAgICAgICAgdGhpcy5tZW1vcnkuc2F2ZSh0YWJsZSwgcm93cyk7XG4gICAgICAgIGlmIChmZXRjaCkge1xuICAgICAgICAgICAgdGhpcy5zYXZlUm93TG9hY2wodGFibGUsIGF3YWl0IHRoaXMuYXBpLmZldGNoQWxsKHRhYmxlLCB1cGRhdGVkX2F0KSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZWRfYXQodGFibGUsIG5vdyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYXN5bmMgbG9hZEFsbChkZWVwPzogYm9vbGVhbikge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLmRlZnMubWFwKGFzeW5jIChkZWYpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvYWQoZGVmLm5hbWUsICFkZWYubG9jYWwsIGRlZXApO1xuICAgICAgICB9KSk7XG4gICAgfVxuICAgIGFzeW5jIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMubWVtb3J5LmluaXRpYWxpemUoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5pbml0aWFsaXplKCk7XG4gICAgICAgIHRoaXMuc2Vzc2lvbiA9IGF3YWl0IHRoaXMuYXBpLmF1dGgoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hdXRvTG9naW4oKTtcbiAgICB9XG4gICAgYXN5bmMgYXV0b0xvZ2luKCkge1xuICAgICAgICBjb25zdCBjYWNoZWRVc2VyID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3VzZXInKTtcbiAgICAgICAgaWYgKGNhY2hlZFVzZXIpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy51c2VyID0gSlNPTi5wYXJzZShjYWNoZWRVc2VyKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnTG9hZGVkIHVzZXIgZnJvbSBjYWNoZTonLCB0aGlzLnVzZXIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSBhd2FpdCB0aGlzLmFwaS5sb2dpbjEodGhpcy51c2VyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgY2FjaGVkIHVzZXI6JywgZSk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3VzZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHVzZXI6IGFueTtcbn1cbmV4cG9ydCBjbGFzcyBNZW1vcnkgZXh0ZW5kcyBTeXN0ZW1JdGVtIHtcbiAgICByZWFkb25seSAjdGFibGVzOiBNYXA8c3RyaW5nLCB0YWJsZTxSb3c+PiA9IG5ldyBNYXAoKTtcbiAgICBnZXQgdGFibGVzKCkgeyByZXR1cm4gdGhpcy4jdGFibGVzOyB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zdCBzeXN0ZW0gPSB0aGlzLnN5c3RlbTtcbiAgICAgICAgc3lzdGVtLmRlZnMuZm9yRWFjaChkZWYgPT4ge1xuICAgICAgICAgICAgdGhpcy4jdGFibGVzLnNldChkZWYubmFtZSwgbmV3IHRhYmxlKGRlZi5sb2NhbCB8fCBmYWxzZSwgZGVmLm5hbWUsIGRlZi5rZXlwYXRoIHx8ICdpZCcsIHN5c3RlbSkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0VGFibGUobmFtZTogc3RyaW5nKTogdGFibGU8Um93PiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghdGhpcy4jdGFibGVzLmhhcyhuYW1lKSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbm8gdGFibGUgJHtuYW1lfWApO1xuICAgICAgICByZXR1cm4gdGhpcy4jdGFibGVzLmdldChuYW1lKTtcbiAgICB9XG5cbiAgICBzYXZlKHRhYmxlOiBzdHJpbmcsIHJvd3M6IFJvdyB8IEl0ZXJhYmxlPFJvdz4pIHtcbiAgICAgICAgdGhpcy4jdGFibGVzLmdldCh0YWJsZSk/LnJvd3Muc2V0KHJvd3MpO1xuICAgIH1cbiAgICBkZWxldGU8VCBleHRlbmRzIFJvdywgUCBleHRlbmRzIEV4Y2x1ZGU8a2V5b2YgVCwgU3ltYm9sIHwgbnVtYmVyPj4odGFibGU6IHN0cmluZywgcm93czogVCB8IEl0ZXJhYmxlPFQgfCBUW1BdPiB8IFRbUF0pIHtcbiAgICAgICAgdGhpcy4jdGFibGVzLmdldCh0YWJsZSk/LnJvd3MuZGVsZXRlcyhyb3dzKTtcbiAgICB9XG5cbn1cbmV4cG9ydCBjbGFzcyBkYXRhYmFzZSBleHRlbmRzIFN5c3RlbUl0ZW0ge1xuICAgICNkYjogREIuSURCUERhdGFiYXNlPHVua25vd24+ID0gPERCLklEQlBEYXRhYmFzZTx1bmtub3duPj48YW55Pm51bGw7XG4gICAgZ2V0IGRiKCkgeyByZXR1cm4gdGhpcy4jZGI7IH1cblxuICAgIGFzeW5jIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnN0IF90aGlzID0gdGhpcztcbiAgICAgICAgZnVuY3Rpb24gY2FsbChuYW1lOiBrZXlvZiB0eXBlb2YgX3RoaXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7IHJldHVybiAoX3RoaXNbbmFtZV0gYXMgRnVuY3Rpb24pLmFwcGx5KF90aGlzLCBhcmd1bWVudHMpIH07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4jZGIgPSBhd2FpdCBEQi5vcGVuREIodGhpcy5kYXRhYmFzZU5hbWUsIHRoaXMuZGF0YWJhc2VWZXJzaW9uLCB7IGJsb2NrZWQ6IGNhbGwoJ2Jsb2NrZWQnKSwgYmxvY2tpbmc6IGNhbGwoJ2Jsb2NraW5nJyksIHRlcm1pbmF0ZWQ6IGNhbGwoJ3Rlcm1pbmF0ZWQnKSwgdXBncmFkZTogY2FsbCgndXBncmFkZScpIH0pXG4gICAgfVxuICAgIGFzeW5jIHVwZ3JhZGUoZGF0YWJhc2U6IERCLklEQlBEYXRhYmFzZTx1bmtub3duPiwgb2xkVmVyc2lvbjogbnVtYmVyLCBuZXdWZXJzaW9uOiBudW1iZXIgfCBudWxsLCB0cmFuc2FjdGlvbjogREIuSURCUFRyYW5zYWN0aW9uPHVua25vd24sIHN0cmluZ1tdLCBcInZlcnNpb25jaGFuZ2VcIj4sIGV2ZW50OiBJREJWZXJzaW9uQ2hhbmdlRXZlbnQpIHtcblxuICAgICAgICBjcmVhdGVUYWJsZS5jYWxsKHRoaXMsICdzaGVtYXMnLCAnbmFtZScpO1xuICAgICAgICB0aGlzLnRhYmxlcy5mb3JFYWNoKHRhYmxlID0+IGNyZWF0ZVRhYmxlLmNhbGwodGhpcywgdGFibGUubmFtZSwgdGFibGUua2V5UGF0aCkpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZVRhYmxlKHRoaXM6IGRhdGFiYXNlLCB0YWJsZU5hbWU6IHN0cmluZywga2V5OiBzdHJpbmcpIHtcbiAgICAgICAgICAgIGlmICghZGF0YWJhc2Uub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyh0YWJsZU5hbWUpKVxuICAgICAgICAgICAgICAgIGRhdGFiYXNlLmNyZWF0ZU9iamVjdFN0b3JlKHRhYmxlTmFtZSwgeyBrZXlQYXRoOiBrZXkgfHwgJ2lkJyB9KTtcbiAgICAgICAgfVxuICAgICAgICB0cmFuc2FjdGlvbi5jb21taXQoKTtcbiAgICAgICAgYXdhaXQgdHJhbnNhY3Rpb24uZG9uZTtcblxuICAgIH1cblxuICAgIGFzeW5jIHRlcm1pbmF0ZWQoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xuICAgIH1cbiAgICBibG9ja2VkPyhjdXJyZW50VmVyc2lvbjogbnVtYmVyLCBibG9ja2VkVmVyc2lvbjogbnVtYmVyIHwgbnVsbCwgZXZlbnQ6IElEQlZlcnNpb25DaGFuZ2VFdmVudCk6IHZvaWQge1xuXG4gICAgfVxuICAgIGJsb2NraW5nPyhjdXJyZW50VmVyc2lvbjogbnVtYmVyLCBibG9ja2VkVmVyc2lvbjogbnVtYmVyIHwgbnVsbCwgZXZlbnQ6IElEQlZlcnNpb25DaGFuZ2VFdmVudCk6IHZvaWQge1xuXG4gICAgfVxuICAgIGFzeW5jIHB1dCh0YWJsZTogc3RyaW5nLCByb3dzOiBSb3cgfCBSb3dbXSkge1xuICAgICAgICBpZiAoIShyb3dzIGluc3RhbmNlb2YgQXJyYXkpKSByb3dzID0gW3Jvd3NdO1xuICAgICAgICBjb25zdCB0eCA9IHRoaXMuZGIudHJhbnNhY3Rpb24odGFibGUsICdyZWFkd3JpdGUnKTtcbiAgICAgICAgY29uc3Qgc3RvcmUgPSB0eC5zdG9yZTtcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2Ygcm93cylcbiAgICAgICAgICAgIHN0b3JlLnB1dChyb3cpO1xuICAgICAgICByZXR1cm4gdHguZG9uZTtcbiAgICB9XG4gICAgYXN5bmMgX2RlbGV0ZSh0YWJsZTogc3RyaW5nLCByb3c6IFJvdyB8IHN0cmluZykge1xuICAgIH1cbiAgICBhc3luYyBkZWxldGU8VCBleHRlbmRzIFJvdywgUCBleHRlbmRzIEV4Y2x1ZGU8a2V5b2YgVCwgU3ltYm9sIHwgbnVtYmVyPj4odGFibGU6IHN0cmluZywgcm93czogKFQgfCBUW1BdKVtdIHwgKFQgfCBUW1BdKSkge1xuICAgICAgICBpZiAoIShyb3dzIGluc3RhbmNlb2YgQXJyYXkpKSByb3dzID0gW3Jvd3NdO1xuICAgICAgICBjb25zdCB0eCA9IHRoaXMuZGIudHJhbnNhY3Rpb24odGFibGUsICdyZWFkd3JpdGUnKTtcbiAgICAgICAgY29uc3Qgc3RvcmUgPSB0eC5zdG9yZTtcbiAgICAgICAgY29uc3QgX3RhYmxlID0gdGhpcy5tZW1vcnkuZ2V0VGFibGUodGFibGUpIGFzIHRhYmxlPGFueT47XG4gICAgICAgIGZvciAobGV0IHJvdyBvZiByb3dzKSB7XG4gICAgICAgICAgICBsZXQgaWQgPSByb3cgaW5zdGFuY2VvZiBPYmplY3QgPyByb3cgPSAocm93IGFzIGFueSlbX3RhYmxlLmtleVBhdGhdIGFzIFRbUF0gOiByb3cgYXMgVFtQXTtcbiAgICAgICAgICAgIHN0b3JlLmRlbGV0ZShpZCBhcyBhbnkpXG4gICAgICAgIH0gcmV0dXJuIHR4LmRvbmU7XG5cbiAgICB9XG4gICAgYXN5bmMgZ2V0QWxsPElSb3cgPSBSb3c+KHRhYmxlOiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZGIuZ2V0QWxsKHRhYmxlKSBhcyBJUm93W107XG4gICAgfVxuXG59XG5jb25zdCBvbkZldGNoOiB7IFtuOiBzdHJpbmddOiAoc3lzdGVtOiBTeXN0ZW0sIHNlcnZlcjogQVBJKSA9PiBQb3N0Z3Jlc3RGaWx0ZXJCdWlsZGVyPGFueSwgYW55LCBhbnksIGFueVtdLCBzdHJpbmcsIHVua25vd24sIFwiR0VUXCI+IH0gPSB7XG4gICAgaW52b2ljZXMoc3lzdGVtOiBTeXN0ZW0sIGFwaTogQVBJKSB7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gYXBpLnNlcnZlclxuICAgICAgICAgICAgLmZyb20oJ2ludm9pY2VzJylcbiAgICAgICAgICAgIC5zZWxlY3QoJyonKTtcbiAgICAgICAgcmV0dXJuIHF1ZXJ5LmVxKCdjbGllbnRfaWQnLCBzeXN0ZW0udXNlci5pZClcbiAgICAgICAgICAgIC5vcmRlcignY3JlYXRlZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KTtcbiAgICB9LFxuICAgIHByb2R1Y3RzKHN5c3RlbSwgYXBpKSB7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gYXBpLnNlcnZlclxuICAgICAgICAgICAgLmZyb20oJ2ludm9pY2VzJylcbiAgICAgICAgICAgIC5zZWxlY3QoJyonKTtcbiAgICAgICAgcmV0dXJuIHF1ZXJ5Lm9yZGVyKCd1cGRhdGVkX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlLCBudWxsc0ZpcnN0OiBmYWxzZSB9KTtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgQVBJIGV4dGVuZHMgU3lzdGVtSXRlbSB7XG4gICAgI2xvZ2dlZDogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHJlYWRvbmx5ICN1c2VyOiB7IGlkOiBudW1iZXIsIG5hbWU6IHN0cmluZywgcGhvbmU6IHN0cmluZywgcHdkOiBzdHJpbmcgfSA9IHsgaWQ6IDAsIG5hbWU6IFwiXCIsIHBob25lOiAnJywgcHdkOiAnJyB9O1xuICAgIHJlYWRvbmx5ICNzZXJ2ZXI6IFNCLlN1cGFiYXNlQ2xpZW50PGFueSwgJ3B1YmxpYycsICdwdWJsaWMnPlxuICAgIGdldCBzZXJ2ZXIoKSB7IHJldHVybiB0aGlzLiNzZXJ2ZXI7IH1cbiAgICBnZXQgZGF0YWJhc2UoKSB7IHJldHVybiB0aGlzLnN5c3RlbS5kYXRhYmFzZTsgfVxuICAgIGNvbnN0cnVjdG9yKHN5c3RlbTogU3lzdGVtKSB7XG4gICAgICAgIHN1cGVyKHN5c3RlbSk7XG4gICAgICAgIGNvbnN0IFNVUEFCQVNFX1VSTCA9ICdodHRwczovL3JocWNreHl3Y3Bpd21kZHBuZ2J5LnN1cGFiYXNlLmNvJztcbiAgICAgICAgY29uc3QgU1VQQUJBU0VfQU5PTl9LRVkgPSAnZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5Kb2NXTnJlSGwzWTNCcGQyMWtaSEJ1WjJKNUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTmpBMU1EZzBNekVzSW1WNGNDSTZNakEzTmpBNE5EUXpNWDAueWIzSWJGaXBmS2dPRTYxY09lLVZLUTVrZU5TbzdGaEkzVVczSWstZnZSWSc7XG5cbiAgICAgICAgdGhpcy4jc2VydmVyID0gU0IuY3JlYXRlQ2xpZW50KFNVUEFCQVNFX1VSTCwgU1VQQUJBU0VfQU5PTl9LRVkpO1xuXG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGZldGNoQWxsKHRhYmxlTmFtZTogc3RyaW5nLCBhZnRlcjogRGF0ZSk6IFByb21pc2U8Um93W10gfCB1bmRlZmluZWQ+IHtcbiAgICAgICAgY29uc3QgeyBwcm9taXNlLCByZXNvbHZlIH0gPSBuZXdQcm9taXNlPFJvd1tdIHwgdW5kZWZpbmVkPigpO1xuICAgICAgICBjb25zdCB0YWJsZSA9IHRoaXMuZ2V0VGFibGUodGFibGVOYW1lKTtcblxuICAgICAgICBjb25zdCBxdWVyeSA9IHRhYmxlPy5mZXRjaEFsbCh0aGlzKSB8fCB0aGlzLnNlcnZlclxuICAgICAgICAgICAgLmZyb20odGFibGVOYW1lKVxuICAgICAgICAgICAgLnNlbGVjdCgnKicpO1xuXG4gICAgICAgIGlmIChhZnRlcilcbiAgICAgICAgICAgIHF1ZXJ5Lmd0ZSgndXBkYXRlZF9hdCcsIGFmdGVyLnRvSVNPU3RyaW5nKCkpO1xuXG4gICAgICAgIHF1ZXJ5LnRoZW4oYXN5bmMgKHsgZGF0YSwgZXJyb3IgfSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gcmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICAgICAgcmVzb2x2ZShkYXRhIGFzIFJvd1tdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuXG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEFVVEhFTlRJQ0FUSU9OXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgYXN5bmMgYXV0aCgpIHtcbiAgICAgICAgY29uc3QgeyBkYXRhOiB7IHNlc3Npb24gfSwgZXJyb3IgfSA9IGF3YWl0IHRoaXMuc2VydmVyLmF1dGguZ2V0U2Vzc2lvbigpO1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuI2xvZ2dlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlc3Npb24pIHtcbiAgICAgICAgICAgIHRoaXMuI2xvZ2dlZCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm4gc2Vzc2lvbjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiNsb2dnZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGFzeW5jIGxvZ2luKHsgZW1haWwsIHB3ZCwgcGhvbmUgfTogeyBlbWFpbD86IHN0cmluZzsgcHdkOiBzdHJpbmc7IHBob25lPzogc3RyaW5nOyB9KSB7XG4gICAgICAgIGlmIChwaG9uZSAmJiBwd2QpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2dpbjEoeyBwaG9uZSwgcHdkIH0pO1xuXG4gICAgICAgIGVsc2UgaWYgKGVtYWlsICYmIHB3ZClcbiAgICAgICAgICAgIC8vIHVzZSBzdXBhYmFzZSBhdXRoIHRvIGxvZ2luXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXJ2ZXIuYXV0aC5zaWduSW5XaXRoUGFzc3dvcmQoe1xuICAgICAgICAgICAgICAgIGVtYWlsOiBlbWFpbCxcbiAgICAgICAgICAgICAgICBwYXNzd29yZDogcHdkXG4gICAgICAgICAgICB9KS50aGVuKCh7IGRhdGEsIGVycm9yIH0pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRXJyb3IoJ0ludmFsaWQgbG9naW4gcGFyYW1ldGVycycpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFzeW5jIGxvZ2luMSh7IHBob25lLCBwd2QgfTogeyBwd2Q6IHN0cmluZzsgcGhvbmU/OiBzdHJpbmc7IH0pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghcGhvbmUgfHwgIXB3ZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncGhvbmUgYW5kIHB3ZCBjYW5ub3QgYmUgbnVsbCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGhvbmUgPSBwaG9uZS50cmltKCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YTogY2xpZW50RGF0YSwgZXJyb3I6IGNsaWVudEVycm9yIH0gPSBhd2FpdCB0aGlzLnNlcnZlclxuICAgICAgICAgICAgICAgIC5mcm9tKCdjbGllbnRzJylcbiAgICAgICAgICAgICAgICAuc2VsZWN0KCcqJylcbiAgICAgICAgICAgICAgICAuZXEoJ3Bob25lJywgcGhvbmUpXG4gICAgICAgICAgICAgICAgLmVxKCdwd2QnLCBwd2QpXG4gICAgICAgICAgICAgICAgLm1heWJlU2luZ2xlKCk7XG5cbiAgICAgICAgICAgIGlmIChjbGllbnRFcnJvcikgdGhyb3cgbmV3IEVycm9yKGBDbGllbnQgZmV0Y2ggZXJyb3I6ICR7Y2xpZW50RXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIGlmICghY2xpZW50RGF0YSkgdGhyb3cgbmV3IEVycm9yKCdDbGllbnQgbm90IGZvdW5kIG9yIGludmFsaWQgY3JlZGVudGlhbHMnKTtcblxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLiN1c2VyLCBjbGllbnREYXRhKTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCd1c2VyJywgSlNPTi5zdHJpbmdpZnkodGhpcy4jdXNlcikpO1xuICAgICAgICAgICAgdGhpcy4jbG9nZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgdGhpcy4jbG9nZ2VkID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdMb2dpbiBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgbG9nZ2VkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4jbG9nZ2VkO1xuICAgIH1cblxuICAgIGFzeW5jIGdldElkcyh0YWJsZTogc3RyaW5nLCBrZXlQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHRoaXMuc2VydmVyXG4gICAgICAgICAgICAgICAgLmZyb20odGFibGUpXG4gICAgICAgICAgICAgICAgLnNlbGVjdChrZXlQYXRoKTtcblxuICAgICAgICAgICAgaWYgKGVycm9yKSB0aHJvdyBuZXcgRXJyb3IoYFN1cGFiYXNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9IChjb2RlOiAke2Vycm9yLmNvZGV9KWApO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDQVRFR09SSUVTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgYXN5bmMgZ2V0Q2F0ZWdvcmllcygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHRoaXMuc2VydmVyXG4gICAgICAgICAgICAgICAgLmZyb20oJ2NhdGVnb3JpZXMnKVxuICAgICAgICAgICAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgICAgICAgICAgIC5vcmRlcignbmFtZScsIHsgYXNjZW5kaW5nOiB0cnVlIH0pO1xuXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHRocm93IG5ldyBFcnJvcihgU3VwYWJhc2UgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX0gKGNvZGU6ICR7ZXJyb3IuY29kZX0pYCk7XG5cbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignR2V0IGNhdGVnb3JpZXMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUFJPRFVDVFNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0luZGV4ZWRBcnJheX0gb3V0cHV0IFxuICAgICAqIEByZXR1cm5zIFxuICAgICAqL1xuICAgIGFzeW5jIGdldFByb2R1Y3RzKG91dHB1dDogeyBzZXQ6IChhcmcwOiBhbnlbXSkgPT4gdm9pZDsgfSkge1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCB0aGlzLnNlcnZlclxuICAgICAgICAgICAgICAgIC5mcm9tKCdwcm9kdWN0cycpXG4gICAgICAgICAgICAgICAgLnNlbGVjdCgnKicpO1xuXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHRocm93IG5ldyBFcnJvcihgU3VwYWJhc2UgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX0gKGNvZGU6ICR7ZXJyb3IuY29kZX0pYCk7XG5cbiAgICAgICAgICAgIG91dHB1dC5zZXQoZGF0YSlcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignR2V0IHByb2R1Y3RzIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIElOVk9JQ0VTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7SW5kZXhlZEFycmF5fSBvdXRwdXQgXG4gICAgICogQHJldHVybnMgXG4gICAgICovXG4gICAgYXN5bmMgZ2V0SW52b2ljZXMob3V0cHV0OiBJbmRleGVkQXJyYXk8SUludm9pY2UsICdpZCc+LCBzdG9yZT86IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLiNsb2dnZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHRoaXMuc2VydmVyXG4gICAgICAgICAgICAgICAgLmZyb20oJ2ludm9pY2VzJylcbiAgICAgICAgICAgICAgICAuc2VsZWN0KCcqJylcbiAgICAgICAgICAgICAgICAuZXEoJ2NsaWVudF9pZCcsIHRoaXMuI3VzZXIuaWQpXG4gICAgICAgICAgICAgICAgLm9yZGVyKCdjcmVhdGVkX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pO1xuXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHRocm93IG5ldyBFcnJvcihgU3VwYWJhc2UgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX0gKGNvZGU6ICR7ZXJyb3IuY29kZX0pYCk7XG5cblxuXG4gICAgICAgICAgICBvdXRwdXQuc2V0KGRhdGEpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdHZXQgaW52b2ljZXMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBnZXRJbnZvaWNlKGlkOiBudW1iZXIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludm9pY2VfaWQgY2Fubm90IGJlIG51bGwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy4jbG9nZ2VkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVc2VyIG5vdCBhdXRoZW50aWNhdGVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YTogaW52b2ljZURhdGEsIGVycm9yOiBpbnZvaWNlRXJyb3IgfSA9IGF3YWl0IHRoaXMuc2VydmVyXG4gICAgICAgICAgICAgICAgLmZyb20oJ2ludm9pY2VzJylcbiAgICAgICAgICAgICAgICAuc2VsZWN0KCcqJylcbiAgICAgICAgICAgICAgICAuZXEoJ2lkJywgaWQpXG4gICAgICAgICAgICAgICAgLmVxKCdjbGllbnRfaWQnLCB0aGlzLiN1c2VyLmlkKVxuICAgICAgICAgICAgICAgIC5tYXliZVNpbmdsZSgpO1xuXG4gICAgICAgICAgICBpZiAoaW52b2ljZUVycm9yKSB0aHJvdyBuZXcgRXJyb3IoYFN1cGFiYXNlIGludm9pY2UgZXJyb3I6ICR7aW52b2ljZUVycm9yLm1lc3NhZ2V9IChjb2RlOiAke2ludm9pY2VFcnJvci5jb2RlfSlgKTtcbiAgICAgICAgICAgIGlmICghaW52b2ljZURhdGEpIHRocm93IG5ldyBFcnJvcignSW52b2ljZSBub3QgZm91bmQgb3IgeW91IGRvIG5vdCBoYXZlIGFjY2VzcycpO1xuXG4gICAgICAgICAgICBjb25zdCB7IGRhdGE6IGl0ZW1zRGF0YSwgZXJyb3I6IGl0ZW1zRXJyb3IgfSA9IGF3YWl0IHRoaXMuc2VydmVyXG4gICAgICAgICAgICAgICAgLmZyb20oJ2ludm9pY2VfaXRlbXMnKVxuICAgICAgICAgICAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgICAgICAgICAgIC5lcSgnaW52b2ljZV9pZCcsIGlkKVxuICAgICAgICAgICAgICAgIC5vcmRlcignY3JlYXRlZF9hdCcsIHsgYXNjZW5kaW5nOiB0cnVlIH0pO1xuXG4gICAgICAgICAgICBpZiAoaXRlbXNFcnJvcikgdGhyb3cgbmV3IEVycm9yKGBTdXBhYmFzZSBpdGVtcyBlcnJvcjogJHtpdGVtc0Vycm9yLm1lc3NhZ2V9IChjb2RlOiAke2l0ZW1zRXJyb3IuY29kZX0pYCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAuLi5pbnZvaWNlRGF0YSxcbiAgICAgICAgICAgICAgICBpdGVtczogaXRlbXNEYXRhIHx8IFtdXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignR2V0IGludm9pY2UgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBnZXRDdXJyZW50SW52b2ljZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghdGhpcy4jdXNlciB8fCAhdGhpcy4jdXNlci5pZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVXNlciBub3QgYXV0aGVudGljYXRlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCB0aGlzLnNlcnZlclxuICAgICAgICAgICAgICAgIC5mcm9tKCdpbnZvaWNlcycpXG4gICAgICAgICAgICAgICAgLnNlbGVjdCgnKicpXG4gICAgICAgICAgICAgICAgLmVxKCdjbGllbnRfaWQnLCB0aGlzLiN1c2VyLmlkKVxuICAgICAgICAgICAgICAgIC5lcSgnc3RhdHVzJywgJ2RyYWZ0JylcbiAgICAgICAgICAgICAgICAub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSlcbiAgICAgICAgICAgICAgICAubGltaXQoMSk7XG5cbiAgICAgICAgICAgIGlmIChlcnJvcikgdGhyb3cgbmV3IEVycm9yKGBTdXBhYmFzZSBlcnJvcjogJHtlcnJvci5tZXNzYWdlfSAoY29kZTogJHtlcnJvci5jb2RlfSlgKTtcblxuICAgICAgICAgICAgY29uc3QgY3VycmVudEludm9pY2UgPSBkYXRhPy5bMF0gfHwgbnVsbDtcblxuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRJbnZvaWNlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignR2V0IGN1cnJlbnQgaW52b2ljZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHZhbGlkYXRlSW52b2ljZShpbnZvaWNlX2lkOiBudW1iZXIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghaW52b2ljZV9pZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW52b2ljZV9pZCBjYW5ub3QgYmUgbnVsbCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IGRhdGE6IGl0ZW1zLCBlcnJvcjogaXRlbXNFcnJvciB9ID0gYXdhaXQgdGhpcy5zZXJ2ZXJcbiAgICAgICAgICAgICAgICAuZnJvbSgnaW52b2ljZV9pdGVtcycpXG4gICAgICAgICAgICAgICAgLnNlbGVjdCgncXRlLCBwcmljZScpXG4gICAgICAgICAgICAgICAgLmVxKCdpbnZvaWNlX2lkJywgaW52b2ljZV9pZCk7XG5cbiAgICAgICAgICAgIGlmIChpdGVtc0Vycm9yKSB0aHJvdyBpdGVtc0Vycm9yO1xuXG4gICAgICAgICAgICBjb25zdCBjYWxjdWxhdGVkVG90YWwgPSBpdGVtcy5yZWR1Y2UoKHN1bSwgaXRlbSkgPT4gc3VtICsgKGl0ZW0ucXRlICogaXRlbS5wcmljZSksIDApO1xuXG4gICAgICAgICAgICBjb25zdCB7IGRhdGE6IGludm9pY2UsIGVycm9yOiBpbnZvaWNlRXJyb3IgfSA9IGF3YWl0IHRoaXMuc2VydmVyXG4gICAgICAgICAgICAgICAgLmZyb20oJ2ludm9pY2VzJylcbiAgICAgICAgICAgICAgICAuc2VsZWN0KCd0b3RhbCwgc3RhdHVzJylcbiAgICAgICAgICAgICAgICAuZXEoJ2lkJywgaW52b2ljZV9pZClcbiAgICAgICAgICAgICAgICAuc2luZ2xlKCk7XG5cbiAgICAgICAgICAgIGlmIChpbnZvaWNlRXJyb3IpIHRocm93IGludm9pY2VFcnJvcjtcblxuICAgICAgICAgICAgY29uc3QgaXNWYWxpZCA9IE1hdGguYWJzKGludm9pY2UudG90YWwgLSBjYWxjdWxhdGVkVG90YWwpIDwgMC4wMTtcblxuXG4gICAgICAgICAgICByZXR1cm4geyBpc1ZhbGlkLCBjYWxjdWxhdGVkVG90YWwsIHN0b3JlZFRvdGFsOiBpbnZvaWNlLnRvdGFsLCBzdGF0dXM6IGludm9pY2Uuc3RhdHVzIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdWYWxpZGF0ZSBpbnZvaWNlIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIElOVk9JQ0UgSVRFTVNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBhc3luYyBnZXRJbnZvaWNlSXRlbXMoaW52b2ljZV9pZDogbnVtYmVyKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIWludm9pY2VfaWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludm9pY2VfaWQgY2Fubm90IGJlIG51bGwnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgdGhpcy5zZXJ2ZXIucnBjKCdnZXRpbnZvaWNlaXRlbXMnLCB7IHBfaW52b2ljZV9pZDogaW52b2ljZV9pZCB9KTtcblxuICAgICAgICAgICAgaWYgKGVycm9yKSB0aHJvdyBuZXcgRXJyb3IoYFN1cGFiYXNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9IChjb2RlOiAke2Vycm9yLmNvZGV9KWApO1xuXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBpbnZvaWNlIGl0ZW1zIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFzeW5jIHVwZGF0ZUludm9pY2VJdGVtKGl0ZW06IGludm9pY2VJdGVtKSB7XG5cbiAgICB9XG4gICAgYXN5bmMgYWRkSXRlbVRvSW52b2ljZSh7IGludm9pY2VfaWQsIHByb2R1Y3RfaWQsIHF1YW50aXR5IH06IHsgaW52b2ljZV9pZDogbnVtYmVyLCBwcm9kdWN0X2lkOiBudW1iZXIsIHF1YW50aXR5OiBudW1iZXIgfSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFpbnZvaWNlX2lkIHx8ICFwcm9kdWN0X2lkIHx8ICFxdWFudGl0eSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW52b2ljZV9pZCwgcHJvZHVjdF9pZCwgYW5kIHF1YW50aXR5IGNhbm5vdCBiZSBudWxsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocXVhbnRpdHkgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncXVhbnRpdHkgbXVzdCBiZSBncmVhdGVyIHRoYW4gMCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IGRhdGE6IHByb2R1Y3QsIGVycm9yOiBwcm9kdWN0RXJyb3IgfSA9IGF3YWl0IHRoaXMuc2VydmVyXG4gICAgICAgICAgICAgICAgLmZyb20oJ3Byb2R1Y3RzJylcbiAgICAgICAgICAgICAgICAuc2VsZWN0KCdwcmljZScpXG4gICAgICAgICAgICAgICAgLmVxKCdpZCcsIHByb2R1Y3RfaWQpXG4gICAgICAgICAgICAgICAgLnNpbmdsZSgpO1xuXG4gICAgICAgICAgICBpZiAocHJvZHVjdEVycm9yKSB0aHJvdyBwcm9kdWN0RXJyb3I7XG5cbiAgICAgICAgICAgIGNvbnN0IHByaWNlID0gcHJvZHVjdC5wcmljZTtcbiAgICAgICAgICAgIGNvbnN0IHRvdGFsID0gcHJpY2UgKiBxdWFudGl0eTtcblxuICAgICAgICAgICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgdGhpcy5zZXJ2ZXJcbiAgICAgICAgICAgICAgICAuZnJvbSgnaW52b2ljZV9pdGVtcycpXG4gICAgICAgICAgICAgICAgLmluc2VydCh7XG4gICAgICAgICAgICAgICAgICAgIGludm9pY2VfaWQsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3RfaWQsXG4gICAgICAgICAgICAgICAgICAgIHF0ZTogcXVhbnRpdHksXG4gICAgICAgICAgICAgICAgICAgIHByaWNlLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgICAgICAgLnNpbmdsZSgpO1xuXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHRocm93IG5ldyBFcnJvcihgU3VwYWJhc2UgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX0gKGNvZGU6ICR7ZXJyb3IuY29kZX0pYCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpbnZvaWNlIHRvdGFsXG4gICAgICAgICAgICBjb25zdCB7IGRhdGE6IGl0ZW1zLCBlcnJvcjogaXRlbXNFcnJvciB9ID0gYXdhaXQgdGhpcy5zZXJ2ZXJcbiAgICAgICAgICAgICAgICAuZnJvbSgnaW52b2ljZV9pdGVtcycpXG4gICAgICAgICAgICAgICAgLnNlbGVjdCgndG90YWwnKVxuICAgICAgICAgICAgICAgIC5lcSgnaW52b2ljZV9pZCcsIGludm9pY2VfaWQpO1xuXG4gICAgICAgICAgICBpZiAoaXRlbXNFcnJvcikgdGhyb3cgaXRlbXNFcnJvcjtcblxuICAgICAgICAgICAgY29uc3QgbmV3VG90YWwgPSBpdGVtcy5yZWR1Y2UoKHN1bSwgaXRlbSkgPT4gc3VtICsgaXRlbS50b3RhbCwgMCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHsgZXJyb3I6IHVwZGF0ZUVycm9yIH0gPSBhd2FpdCB0aGlzLnNlcnZlclxuICAgICAgICAgICAgICAgIC5mcm9tKCdpbnZvaWNlcycpXG4gICAgICAgICAgICAgICAgLnVwZGF0ZSh7IHRvdGFsOiBuZXdUb3RhbCB9KVxuICAgICAgICAgICAgICAgIC5lcSgnaWQnLCBpbnZvaWNlX2lkKTtcblxuICAgICAgICAgICAgaWYgKHVwZGF0ZUVycm9yKSB0aHJvdyBuZXcgRXJyb3IoYFN1cGFiYXNlIGVycm9yOiAke3VwZGF0ZUVycm9yLm1lc3NhZ2V9IChjb2RlOiAke3VwZGF0ZUVycm9yLmNvZGV9KWApO1xuXG5cbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignQWRkIGl0ZW0gdG8gaW52b2ljZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGRlbGV0ZUludm9pY2VJdGVtKGl0ZW1faWQ6IG51bWJlcikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFpdGVtX2lkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpdGVtX2lkIGNhbm5vdCBiZSBudWxsJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHRoaXMuc2VydmVyXG4gICAgICAgICAgICAgICAgLmZyb20oJ2ludm9pY2VfaXRlbXMnKVxuICAgICAgICAgICAgICAgIC5kZWxldGUoKVxuICAgICAgICAgICAgICAgIC5lcSgnaWQnLCBpdGVtX2lkKTtcblxuICAgICAgICAgICAgaWYgKGVycm9yKSB0aHJvdyBuZXcgRXJyb3IoYFN1cGFiYXNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9IChjb2RlOiAke2Vycm9yLmNvZGV9KWApO1xuXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0RlbGV0ZSBpbnZvaWNlIGl0ZW0gZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbn1cbmZ1bmN0aW9uIHBhcnNlRGF0ZSh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgRGF0ZSkge1xuICAgIGlmICghdmFsdWUpIHZhbHVlID0gMDtcbiAgICBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB2YWx1ZSA9IGlzTmFOKE51bWJlcih2YWx1ZSkpID8gRGF0ZS5wYXJzZSh2YWx1ZSkgOiBOdW1iZXIodmFsdWUpO1xuICAgIGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHZhbHVlID0gbmV3IERhdGUodmFsdWUpO1xuICAgIGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkgcmV0dXJuIHZhbHVlO1xuICAgIHJldHVybiBuZXcgRGF0ZSh2YWx1ZSk7XG59XG5mdW5jdGlvbiBkYXRlVG9TdHJpbmcoZGF0ZTogc3RyaW5nIHwgbnVtYmVyIHwgRGF0ZSkge1xuICAgIGlmIChkYXRlKVxuICAgICAgICBpZiAodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSByZXR1cm4gbmV3IERhdGUoZGF0ZSkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgZWxzZSBpZiAoZGF0ZSBpbnN0YW5jZW9mIERhdGUpIHJldHVybiBkYXRlLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBkYXRlID09PSAnc3RyaW5nJykgcmV0dXJuIHBhcnNlRGF0ZShkYXRlKS50b0lTT1N0cmluZygpO1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG59XG5mdW5jdGlvbiBuZXdQcm9taXNlPFQ+KCkge1xuICAgIGxldCByZXNvbHZlOiAodmFsdWU6IFQpID0+IHZvaWQgPSA8KHZhbHVlOiBUKSA9PiB2b2lkPjxhbnk+bnVsbCwgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkID0gPChyZWFzb24/OiBhbnkpID0+IHZvaWQ+PGFueT5udWxsO1xuICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZTxUPigoX3Jlc29sdmUsIF9yZWplY3QpID0+IHtcbiAgICAgICAgcmVzb2x2ZSA9IF9yZXNvbHZlO1xuICAgICAgICByZWplY3QgPSBfcmVqZWN0O1xuICAgIH0pO1xuICAgIHJldHVybiB7IHByb21pc2UsIHJlc29sdmUsIHJlamVjdCB9O1xufVxuXG4iXX0=
