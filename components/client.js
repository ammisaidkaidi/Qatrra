 import { defineComponent, ref } from './init.js';

export const ClientCard = defineComponent({
  name: 'ClientCard',
  props: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true }
  },
  template: `
    <div class="bg-white shadow-md rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
      <h3 class="text-lg font-bold text-gray-900">{{ name }}</h3>
      <p class="mt-2 text-sm text-gray-600">Email: {{ email }}</p>
      <p class="text-sm text-gray-600">Phone: {{ phone }}</p>
      <p class="text-sm text-gray-600">Address: {{ address }}</p>
    </div>
  `
});

export default {
ClientCard
};