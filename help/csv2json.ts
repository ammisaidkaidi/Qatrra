const whitespaces: Record<string, boolean> = { ' ': true, '\t': true };
export class csv2json {
    private _index: number = 0;
    private rows: string[][] = [];
    private row: string[] = [];
    private col: string = '';
    get char() { return this.data[this._index]; }
    get nextChar() { return this.data[this._index + 1]; }

    constructor(private readonly data: string, private readonly delimer: string, private readonly newLine: string, private readonly stringQuote = '"') {
        this.delimer = this.delimer[0];
        this.newLine = this.newLine[0];
    }
    get isDelimer() { return this.data[this._index] === this.delimer; }
    get isNewline() { return this.data[this._index] === this.newLine; }
    start() {
        const l = this.data.length;
        let c: string;
        while (this._index < l)
            switch (c = this.char) {
                case this.delimer:
                    this.nextColumn();
                    break;
                case '\r':
                    this._index++;
                    if (this.char !== this.newLine) {
                        this.col += c;
                        continue;
                    }
                case this.newLine:
                    this.nextLine();
                    continue
                case ' ':
                    if (this.col.length) this.col += c;
                    continue;
                case this.stringQuote:
                    if (!this.col.length) {
                        this.col += this.getString();
                        continue;
                    }
                default:
                    this.col += c;
                    this._index++;
                    break;
            }
        if (!this.col && !this.row.length) return this;
        this.nextLine();
        return this;
    }
    nextLine() {
        this.row.push(this.col);
        this.rows.push(this.row);
        this.row = [];
        this.col = '';
        this._index++;
    }
    nextColumn() {
        this._index++;
        this.row.push(this.col);
        this.col = '';
    }
    getString() {
        var char = '';
        const quote = this.char;
        const start = ++this._index;
        while (char = this.char) {
            if (char !== quote)
                this._index++;
            else if (char === this.nextChar) {
                this._index += 2;
                continue;
            } else {
                this._index++;
                break;
            }

        }
        return this.data.substring(start, this._index - 1);
    }
    get isWhiteSpace() { return whitespaces[this.char]; }
    whitespace() {
        while (this.isWhiteSpace) this._index++;
    }
    toJSON<T extends object>(constr: IConstructor<T>) {
        const indexes: number[] = [];
        const names: (keyof T)[] = this.rows[0] as any as (keyof T)[];
        const columnIndex: Record<keyof T, number> = {} as any;
        names.map((v, i) => {
            if (v && (constr.select ? constr.select(v) : true)) {
                indexes.push(i);
                columnIndex[v] = i;
            }
        });
        const rows: Object[] = [];
        let obj: T;
        for (let i = 1; i < this.rows.length; i++) {
            const row = this.rows[i];
            rows.push(obj = constr.ctor ? constr.ctor(row, columnIndex) : <T>{});
            for (let j = 0; j < indexes.length; j++) {
                const k = indexes[j];
                if (constr.set) constr.set(obj, <any>names[k], row[k], k)
                else obj[names[k]] = constr.parse ? constr.parse(obj, <keyof T><any>names[k], row[k] as any, k) : row[k] as any;
            }
            if (constr.finalize) constr.finalize(obj);
        }
        return rows;
    }
}
interface IConstructor<T extends Object> {
    select?<P extends keyof T>(this: IConstructor<T>, name: P): P extends keyof T ? true : false;
    parse?<P extends keyof T>(this: IConstructor<T>, obj: T, name: P, value: T[P], index: number): T[P];
    ctor?(this: IConstructor<T>, data: string[], columnIndex: Record<string, number>): T;
    set?(this: IConstructor<T>, obj: T, name: string, value: string, index: number): void;
    finalize(obj: T): void;
}
export async function parseCSV(url_csv: string) {
    const csvText: string = URL.parse(url_csv) ? await (await fetch(url_csv)).text() : url_csv;
    const csv = new csv2json(csvText, ";", "\n", '"').start();

    return csv.toJSON<any>({
        ctor(data, columnIndex) {
            return {};
        },
        //@ts-ignore
        parse(obj, name: string, value, index) {
            return name.includes('PRIX') ? Number(value) : value;
        }
    });
}
export async function test() {
    const csv = new csv2json(await (await fetch('/.data/products.csv')).text(), ";", "\n", '"');
    csv.start();
    const json = csv.toJSON<any>({
        ctor(data, columnIndex) {
            return {};
        },
        //@ts-ignore
        parse(obj, name: string, value, index) {
            return name.includes('PRIX') ? Number(value) : value;
        }
    });
}
