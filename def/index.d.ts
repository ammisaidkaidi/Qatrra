/// <reference path="../help/FilterArray.js" />
export interface List {
    products: FilreArra
}

export interface product {
    id: number;
    ref: string;
    name: string;
    description: string;
    qte: number;
    price: number;
    description: string;
    category_id: number;
    category: string;
}
export interface invoice {
    id: number;
    ref: string;
    client_id: number;
    created_at: Date;
    updated_at: Date;
    total: number;
    observation: string;
    items: invoiceItem[];
}
export interface invoiceItem {
    id: number;
    invoice_id: number;
    product_id: number;
    product: string;
    observation: string;
    qte: number;
    price: number;
}
export interface client {
    name: string;
    ref: string;
    email: string;
    mobile: string;
    observation: string;

}

export interface Ref<T> {
    value: T
}

export interface ListFilterParams<T> {
    keyPath: string;
    toString: (item: T) => string;
    categories: Object[];
    filter?: (item: T, searchTerms: string[], sender: ListFilter<T>) => boolean;
}

export interface IListFilter<T> {
    output: ref<IndexedArray<T>>;
    input: rf<T[]>;
    categories: rf<Object[]>;
    searchCategory: any;
    query: string;
    category: Object;
    Output: IndexedArray<T>;
    update(query?: string): void;
    new(params: ListFilterParams<T>);
    constructor(params: ListFilterParams<T>);
}