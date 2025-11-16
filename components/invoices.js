import {
  defineComponent,
  getTemplate,
  components
} from '../help/init.js';



export const invoicesCard = defineComponent({
  name: 'invoicesCard',
  emits: ['select','open'],
  components,
  props: {
    invoices: Array
  },
  setup(props, { emit }) {
    return {
      viewInvoice(invoice) {
        emit('select', { invoice });
      },
      openInvoice(invoice){
        emit('open', { invoice });
      }
    }
  },
  template: getTemplate('invoices-template')

});

export default {
  invoicesCard
};