import { FloatButtons, system, selectedInvoice, coms } from '../help/global.js';
import { createModal } from '../pages/modal.js';
import { reactive } from '../libs/vue2.js';

let modalQte;
/**
 * 
 * @param {import('../def/index.js').invoice} invoice 
 * @param {import('../index.js').product} product 
 * @param {import('../def/index.js').invoiceItem} item 
 * @returns 
 */
export async function showQteEdit(item, invoice, product) {
    if (!invoice) throw new Error('invoice not selected');
    if (!item && !product) throw new Error("fatal error");

    if (!item && !(item = invoice.items.find(v => v.product_id === product.id))) {
        if (product.selected)
            item = product.selected;
        else
            item = {
                invoice_id: invoice.id,
                product_id: product.id,
                product: product.name,
                qte: 1, price: product.price
            };
    }
    if (!product) {
        product = system.api.getRow('products', item.product_id);
    }
    if (!item.name) item.product = product.name;
    if (!item.price) item.price = product.price;

    const output = {};
    if (!modalQte) {
        modalQte = (modalQte || (modalQte = createModal(
            {
                component: coms.qteEdit, title: 'Adding ...', bypass: { info: reactive({ product, item, invoice }) },
                buttons: FloatButtons.qteEdit, resusable: true
            }, output)));
    } else {
        Object.assign(modalQte.bypass.info, { product, invoice, item });
    }

    return await modalQte.show();
}
/**
 * 
 * @param {import('../pages/modal.js').modalOutput< { info: {product:import('../def/index.js').product,item:import('../def/index.js').invoiceItem, invoice:import('../def/index.js').invoice}}>} e 
 */
FloatButtons.qteEdit[0].execute = async function execute({ close, bypass }) {
    debugger;
    const { invoice, product, item } = bypass.info;
    const x = await system.api.updateInvoiceItem(item);
    product.selected = item;
    debugger;
    close();
    debugger;
};

FloatButtons.qteEdit[1].execute = async function execute() {

};


