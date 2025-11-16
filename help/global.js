export * from "./init.js";
export * as coms from "../components/index.js";
import { ref, watch, IndexedArray, system, ListFilter, global, components } from './init.js';



// ====================
// State variables
// ====================

/**
 * @template T
 * @typedef {Object} Ref
 * @property {T} value
 */
/** * @type {Ref<boolean>} */
export const isAuthenticated = ref(false);
/** * @type {Ref<boolean>} */
export const loading = ref(false);
export const modalPortal = ref(undefined);
/** * @type {Ref<string>} */
export const error = ref('');
/** * @type {Ref<boolean>} */
export const isSearchMode = ref(false);
/** * @type {Ref<boolean>} */
export const showInvoicesModal = ref(false);
/** * @type {Ref<boolean>} */
export const showInvoiceDetailsModal = ref(false);
/**
 * @type {Ref< import("../def/index.js").invoice>}
 */
export const selectedInvoice = ref(null);
/** * @type {Ref<string>} */
export const selectedCategory = ref('all');


/**
 * @type {{
 * products:ListFilter<import("../index.js").product>,
 *  invoices:ListFilter<import("../index.js").invoice>,
 *  invoiceItems:ListFilter<import("../index.js").invoiceItems>
 * }}
 */
export const list = {
  products: new ListFilter({ keyPath: "id", toString: (x) => x.name + ' ' + x.ref + ' ' + x.description }),
  invoices: new ListFilter({ keyPath: 'id', toString: i => i.client + ' ' + i.ref }),
  invoiceItems: new ListFilter({ keyPath: 'id', toString: i => i.product + ' ' + i.ref })
};

/** * @type {Ref<IndexedArray<import("../index.js").product>>} */
export const products = list.products.output;// ref(createIndexedArray());
/** * @type {Ref<IndexedArray<import("../def/index.js").invoice>>} */
export const invoices = list.invoices.output;// ref(createIndexedArray());
window['list'] = list;

watch(selectedInvoice, (n, o) => {
  if (o)
    o.selected = false;

  if (n)
    n.selected = true;
});
watch(() => {
  list.products.input.value;
  return selectedInvoice.value?.items;
}, (items, old) => {
  /**     * @type {Array<{ id:string}>}     */
  const _products = list.products.input.value;
  for (const p of _products) {
    p.selected = undefined;
  }

  items?.forEach(i => {
    const product = _products.find(v => v.id === i.product_id);
    if (product) product.selected = i;
  });
}, { deep: true });

// ====================
// Global object
// ====================
Object.assign(global,
  {
    //floatButtons,
    modalPortal,
    isAuthenticated,
    products,
    loading,
    error,


    isSearchMode,
    showInvoicesModal,
    showInvoiceDetailsModal,
    invoices,

    selectedInvoice
  });

(async () => {
  loading.value = true;
  error.value = 'Initializing ...';
  await system.initialize();
  error.value = 'Loging ...';
  const user = await system.autoLogin();
  if (user === true) {
    isAuthenticated.value = true;
    error.value = 'Loading DATA ...';
    await system.loadAll();
    list.products.input.value = (system.memory.getTable('products').rows);
    list.invoices.input.value = (system.memory.getTable('invoices').rows);
    loading.value = false;
    error.value = '';
  } else {

    error.value = 'Authentification ERROR';
    setTimeout(() => {
      loading.value = false;
      error.value = '';
    }, 200);
    isAuthenticated.value = false;
  }
})();