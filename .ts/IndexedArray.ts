export class IndexedArray<T extends object, P extends keyof T> extends Array {
    // Private field for ID-to-item mapping
    _index = new Map<T[P], T>();
    // Private field for instance-to-ID mapping (to check for duplicate instances)
    _instanceSet = new WeakSet<T>();

    constructor(readonly keyPath: P) {
        super();
        if(!arguments.length) throw new Error("");
        
    }

    // Helper method for validation and uniqueness checks
    validateAndIndex(item: T) {
        if (!item || typeof item !== 'object' || item[this.keyPath] === undefined) {
            return false;
        }

        // Check 1: Instance Uniqueness
        if (this._instanceSet.has(item)) {
            return false;
            //throw new Error(`Cannot add the same object instance twice. ID: '${item[this.keyPath]}'.`);
        }

        // Check 2: ID Uniqueness
        if (this._index.has(item[this.keyPath])) {
            Object.assign(this._index.get(item[this.keyPath]) as T, item);
            return false;
        }
        const id = item[this.keyPath];
        Object.defineProperty(item, 'id', { get() { return id; }, set() { }, enumerable: false });
        this._index.set(item[this.keyPath], item);
        this._instanceSet.add(item);
        return true;
    }
    validateAndIndexs(items: T[]) {
        return items.filter(item => {
            if (this.validateAndIndex(item) === false) return false;
            return true;
        });
    }
    // Helper method to remove tracking
    unindex(item: T) {
        if (item && item[this.keyPath] !== undefined) {
            this._index.delete(item[this.keyPath]);
            this._instanceSet.delete(item);
        }
    }

    // --- Mutator Methods ---

    push(...items: T[]) {
        return super.push(...this.validateAndIndexs(items));
    }

    unshift(...items: T[]) {
        return super.unshift(...this.validateAndIndexs(items));

    }
    replaceItemsBy(items: T[]) {
        this.splice(0, this.length, ...items);
        return this;
    }
    set(item: T[] | T) {
        if (item instanceof Array) return this.push.apply(this, item);
        if (this.validateAndIndex(item))
            return super.push(item);
        return -1;
    }
    pop() {
        const item = super.pop();
        this.unindex(item);
        return item;
    }

    shift() {
        const item = super.shift();
        this.unindex(item);
        return item;
    }

    splice(start: number, deleteCount = 0, ...items: T[]) {
        // 1. Mark items for removal from tracking
        const itemsToDelete = deleteCount > 0 ? this.slice(start, start + deleteCount) : [];
        itemsToDelete.forEach(item => this.unindex(item));

        // 2. Validate and mark new items for tracking
        items = this.validateAndIndexs(items);

        // 3. Perform the array operation
        return super.splice(start, deleteCount, ...items);
    }

    // --- Utility Methods ---

    get(id: any) {
        return this._index.get(id);
    }

    // NOTE on `fill`: fill() is inherently incompatible with instance uniqueness 
    // if the fill range is > 1, as it inserts the same reference object. 
    // We throw an error to prevent corruption.
    fill(value: T, start = 0, end = this.length) {
        const fillStart = Math.max(0, start);
        const fillEnd = Math.min(this.length, end);
        const fillRange = fillEnd - fillStart;

        if (fillRange > 1) {
            throw new Error('fill() cannot be used with a range greater than 1 as it inserts the same object instance multiple times, violating uniqueness.');
        }
        if (fillRange === 1) {
            // Remove old item
            this.unindex(this[fillStart]);
            // Validate/Index new item
            if (!this.validateAndIndex(value)) return this;
        }

        return super.fill(value, start, end);
    }
    copyWithin(target: any, start: any, end: any): this {
        throw new Error('copyWithin() is not supported as it would break instance uniqueness by duplicating references.');
    }
    deleteById(id: T[P]) {
        const f = this._index.get(id);
        if (f) {
            this._index.delete(id);
            this._instanceSet.delete(f);
            const i = this.indexOf(f);
            if (i !== -1) this.splice(i, 1);
        }
        return true;
    }

    delete(row_id: T[P] | T) {
        this.deleteById(row_id instanceof Object ? row_id[this.keyPath] : row_id);
    }
    deletes(row_id: Array<T[P] | T>): void;
    deletes(row_id: T[P]): void;
    deletes(row_id: T): void
    deletes(row_id: Array<T[P] | T> | (T[P] | T)) {
        if (row_id instanceof Array)
            row_id.forEach(function (this: IndexedArray<any, any>, r) { this.delete(r); }, this);
        else this.delete(row_id);
    }
}


// Factory function to create and wrap the array in a Proxy
export function createIndexedArray<T extends object>(keyPath: keyof T, ...items: T[]) {
    const targetArray = new IndexedArray<T, keyof T>(keyPath);
    return targetArray;
    return new Proxy(targetArray, {
        // 1. Intercepts ALL property assignments: array[0] = item;
        set(target, property, value, receiver) {
            // Allow non-numeric properties (e.g., 'length', custom methods)
            if (typeof property !== 'string' || isNaN(Number(property))) {
                return Reflect.set(target, property, value, receiver);
            }

            // --- Custom Logic for Index Assignment ---

            const index = Number(property);

            // Check if assignment is within array bounds (replacement)
            if (index < target.length) {
                // 1. Get the old item that is about to be replaced
                const oldItem = target[index];

                // 2. Temporarily remove the old item's tracking
                target.unindex(oldItem);
                // NOTE: We need a private method accessible here, or make it public/protected

                try {
                    // 3. Validate and track the new item
                    target.validateAndIndex(value); // NOTE: Same accessibility issue

                    // 4. Perform the native array assignment
                    const result = Reflect.set(target, property, value, receiver);
                    return result;
                } catch (e) {
                    // 5. If validation fails, revert the change by re-indexing the old item
                    target.validateAndIndex(oldItem);
                    throw e; // Re-throw the original error
                }
            }

            // If assignment is outside bounds (e.g., array[5] = item on a length 3 array),
            // it should be treated like a push/mutation, which is complex to handle correctly
            // via proxy, so we'll treat out-of-bounds index assignment as an error
            // to force the user to use .push() or .splice().
            target.splice(property as any as number, 1, value);
            throw new Error("Direct index assignment is only allowed for replacing existing elements, and assignment outside array bounds is forbidden. Use .push() or .splice().");
        }
    });
}


function assign(target: { [x: string]: any; }, ...sources: any[]) {
    sources.forEach(source => {
        if (source != null) {
            for (let key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    try {

                        target[key] = source[key];
                    } catch (error) {

                    }
                }
            }
        }
    });
    return target;
}
Object.assign = assign;