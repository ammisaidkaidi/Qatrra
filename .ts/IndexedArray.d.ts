export declare class IndexedArray<T extends object, P extends keyof T> extends Array {
    readonly keyPath: P;
    _index: Map<T[P], T>;
    _instanceSet: WeakSet<T>;
    constructor(keyPath: P);
    validateAndIndex(item: T): boolean;
    validateAndIndexs(items: T[]): T[];
    unindex(item: T): void;
    push(...items: T[]): number;
    unshift(...items: T[]): number;
    replaceItemsBy(items: T[]): this;
    set(item: T[] | T): number;
    pop(): any;
    shift(): any;
    splice(start: number, deleteCount?: number, ...items: T[]): any[];
    get(id: any): T | undefined;
    fill(value: T, start?: number, end?: number): this;
    copyWithin(target: any, start: any, end: any): this;
    deleteById(id: T[P]): boolean;
    delete(row_id: T[P] | T): void;
    deletes(row_id: Array<T[P] | T>): void;
    deletes(row_id: T[P]): void;
    deletes(row_id: T): void;
}
export declare function createIndexedArray<T extends object>(keyPath: keyof T, ...items: T[]): IndexedArray<T, keyof T>;
//# sourceMappingURL=IndexedArray.d.ts.map