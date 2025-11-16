import { IndexedArray,createIndexedArray } from "./IndexedArray.js";
import { ref, watch } from "./init.js";
/**
 * @typedef {import("../def/index.js").IListFilter<T>} XListFilter
 * @template {Object} T
 */
/**
 * @typedef {import("../def/index.js").Ref} Ref
 * @template {Object} T
 */
/**
 * @template {Object} T
 * @extends {XListFilter<T>}
 */
export class ListFilter {
  /** @implements {import("../def/index.js").IListFilter<T>} */
  /**
   * @type {Ref<IndexedArray<T>>}
   */
  output;
  /**
   * List of available categories.
   * @type {Array}
   */
  categories;
  _query = "";
  searchCategory;
  #filterFn;
  /**
   * @param {import("../def/index.js").ListFilterParams<T>} params 
   */
  constructor({ keyPath, toString, categories, filter = ListFilter.filter }) {
    this.input = ref([]);
    this.output = ref(new IndexedArray(keyPath));
    this.#filterFn = filter;
    this.categories = ref(categories || []);
    this._toString = toString;
    this.update();
    watch(() => this.input.value, (a, b, c) => {
      this.update();
    }, { deep: true });
  }
  get Output() { return this.output.value; }
  get query() {
    return this._query;
  }

  set query(value) {
    this.update(value);
  }

  set category(v) {
    this.searchCategory = v;
    this.update(this._query);
  }
  get category() {
    return this.searchCategory;
  }

  /**
   * @param {T} item 
   * @param {string[]} searchTerms 
   * @param {ListFilter<T>} sender 
   * @returns {boolean}
   */
  static filter(item, searchTerms, sender) {
    const x = sender._toString(item).toLowerCase();
    for (const term of searchTerms)
      if (!x.includes(term))
        return false;
    return true;
  }
  update(query) {
    const results = [];
    const oQuery = String(this.query || '').toLowerCase();
    this._query = query = String(arguments.length ? query || '' : this._query || '').toLowerCase();
    const terms = query.split(' ');
    const items = arguments.length === 1 && query.includes(oQuery) ? this.output.value : this.input.value;
    for (const item of items) {
      if (this.#filterFn(item, terms, this))
        results.push(item);
    }
    this.output.value.replaceItemsBy(results);
  }
}
/**
 * @type {ListFilter<import("../def/index.js").product>}
 */
