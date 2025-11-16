import { selectedInvoice, coms } from '../help/global.js';
import { createModal } from '../pages/modal.js';

import { FloatButtons, system } from '../help/init.js';
import { reactive, ref } from '../libs/vue2.js';
import { invoiceCrd } from '../components/invoice.js';

export async function showInvoice(invoice) {
    const output = {};
    Object.assign(invoice, await system.api.getInvoice(invoice.id));
    if (!_invoiceModal)
        _invoiceModal = createModal(
            {
                component: coms.invoiceCrd, title: 'invoice', bypass: reactive({ invoice: invoice }),
                categories: ['1', '0'],
                buttons, resusable: true
            }, output);

    _invoiceModal.bypass.invoice = invoice;
    return await _invoiceModal.show();
}
/**
 * @type {import('../pages/modal.js').modalOutput<{invoice:import('../def/index.js').invoice>}}
 */
let _invoiceModal;
export async function showSelectedInvoice() {
    return  showInvoice(selectedInvoice.value);
}
/**
 * @type {import('../pages/modal.js').modalOutput}
 */


const modalInvoice = {};
const buttons = [
    {
        id: 'search', name: 'search', title: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', color: 'bg-indigo-600',
        execute({ props, context, bypass, show, close, dispose }) { }
    },
    {
        id: 'open', name: 'open', title: 'open', icon: 'M4.5 12.75l6 6 9-13.5', color: 'bg-green-600',
        execute({ show, close, dispose, bypass }) {
            selectedInvoice.value = bypass.invoice;
            close({ code: 'close', reason: 'validated' });
        }
    },
    {
        id: 'close', name: 'close', title: 'close', icon: 'M6 18L18 6M6 6l12 12', color: 'bg-red-600',
        execute(e) { e.close({ code: 'close', reason: 'close' }); }
    }
];