import {
  defineComponent,
  getTemplate,
  components,
  formatDate,
  formatDateTime,
  system
} from '../help/init.js';



export const invoiceCrd = defineComponent({
  name: 'invoiceCard',
  emits: ['select'],
  components,
  props: {
    id: [Number | String],
    invoice: Object,
  },
  setup(props, { emit }) {

    return {
      formatDate, formatDateTime,
      updateTotal(_this, invoice) {
        debugger;
        system.api.updateInvoiceTotal(invoice.id);
      }
    };
  },
  template: getTemplate('invoiceDetails-template')

});