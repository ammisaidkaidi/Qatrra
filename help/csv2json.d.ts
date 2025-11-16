export declare class csv2json {
    private readonly data;
    private readonly delimer;
    private readonly newLine;
    private readonly stringQuote;
    private _index;
    private rows;
    private row;
    private col;
    get char(): string;
    get nextChar(): string;
    constructor(data: string, delimer: string, newLine: string, stringQuote?: string);
    get isDelimer(): boolean;
    get isNewline(): boolean;
    start(): this;
    nextLine(): void;
    nextColumn(): void;
    getString(): string;
    get isWhiteSpace(): boolean;
    whitespace(): void;
    toJSON<T extends object>(constr: IConstructor<T>): Object[];
}
interface IConstructor<T extends Object> {
    select?<P extends keyof T>(this: IConstructor<T>, name: P): P extends keyof T ? true : false;
    parse?<P extends keyof T>(this: IConstructor<T>, obj: T, name: P, value: T[P], index: number): T[P];
    ctor?(this: IConstructor<T>, data: string[], columnIndex: Record<string, number>): T;
    set?(this: IConstructor<T>, obj: T, name: string, value: string, index: number): void;
    finalize(obj: T): void;
}
export declare function parseCSV(url_csv: string): Promise<Object[]>;
export declare function test(): Promise<void>;
export {};
//# sourceMappingURL=csv2json.d.ts.map