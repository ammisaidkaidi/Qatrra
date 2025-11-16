import { defineComponent, getTemplate, ref,formatDate,formatDateTime } from './init.js';

export const InvoiceStatusBadge = defineComponent({
  name: 'InvoiceStatusBadge',
  props: {
    status: { required: ! true }
  },
  setup(props) {
    const getStatusClasses = (status) => {
      const classes = {
        'draft': 'bg-yellow-100 text-yellow-800',
        'sent': 'bg-blue-100 text-blue-800',
        'paid': 'bg-green-100 text-green-800',
        'overdue': 'bg-red-100 text-red-800'
      };
      return classes[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusLabel = (status) => {
      const labels = {
        'draft': 'Draft',
        'sent': 'Sent',
        'paid': 'Paid',
        'overdue': 'Overdue'
      };
      return labels[status] || status;
    };

    return { getStatusClasses, getStatusLabel };
  },
  template: `
    <span
      :class="getStatusClasses(status)"
      class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
    >
      {{ getStatusLabel(status) }}
    </span>
  `
});

export const InvoiceInfoCard = defineComponent({
  name: 'invoiceInfoCard',
  props: {
    invoiceNumber: String,
    status: String,
    total: Number,
    observation: {  default:'no there no' },
    createdAt: {  required: true },
    client: String
  },
  setup(props) {   

    return { formatDate, formatDateTime };
  },
  template: getTemplate('invoiceCard-template')
});

// 4. InvoiceItemCard: Displays a single invoice item
export const InvoiceItemCard = defineComponent({
  name: 'InvoiceItemCard',
  props: {
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  },
  template: `
    <div class="bg-white shadow-md rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors duration-200">
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-900">{{ productName }}</p>
        <p class="text-sm text-gray-600">Quantity: {{ quantity }}</p>
      </div>
      <div class="text-sm text-gray-600">
        <p>Unit Price: $ {{ unitPrice }}</p>
        <p class="font-semibold text-gray-900">Subtotal: $ {{ subtotal }}</p>
      </div>
    </div>
  `
});

export default {
InvoiceStatusBadge,
InvoiceItemCard,
InvoiceInfoCard

};



