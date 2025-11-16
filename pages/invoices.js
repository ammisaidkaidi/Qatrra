import { selectedInvoice, list, coms, watch, ref, system, FloatButtons } from '../help/global.js';
import { createModal } from '../pages/modal.js';
import { showInvoice } from "./invoice.js";

const invoicesModal = {};
let selected = ref(undefined);
watch(selected, (n, o) => {
  if (o) o.Highlight = false;
  if (n) n.Highlight = true;
});
export async function showInvoices() {
  if (!Object.keys(invoicesModal).length) {
    const f = await createModal({
      component: coms.invoicesCard, title: 'invoices',
      bypass: ({
        invoices: list.invoices.Output,
        onSelect({ invoice }) {
          selected.value = invoice;
        },
        onOpen({ invoice }) {
          _showInvoice(invoice, invoicesModal.close);
        }
      }),
      categories: ["DRAFT", "LIVRED", "PAID", "UnPAID"],
      buttons, resusable: true
    }, invoicesModal, (modal, e) => {
      list.invoices.query = e.query;
    }).show();
  } else await invoicesModal.show();

}

async function _showInvoice(invoice, close) {
  const f = await showInvoice(invoice);
  if (f && f.code === 'close' && f.reason === 'validated') {
    close({ code: 'close', 'reason': 'validated' });
  }
}
const buttons = FloatButtons.invoices;
// open button
buttons[1].execute = async function execute({ show, close, dispose, bypass }) {
  _showInvoice(selected.value, close);
};
// valid button
buttons[2].execute = async function execute({ show, close, dispose, bypass }) {
  if (!selected.value) return;
  selectedInvoice.value = selected.value;
  Object.assign(selectedInvoice.value, await system.api.getInvoice(selected.value.id));
  close({ code: 'close', 'reason': 'validated' });
};
// close button
buttons[3].execute = async function execute(e) { e.close({ code: 'close' }); };