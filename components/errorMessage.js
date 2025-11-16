 import { defineComponent, ref } from './init.js';

export const ErrorMessage = defineComponent({
  name: 'ErrorMessage',
  props: {
    message: { type: String, required: true },
    actionText: { type: String, default: '' }
  },
  emits: ['action'],
  template: `
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div class="flex justify-center">
        <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <h3 class="mt-2 text-lg font-medium text-red-800">{{ message }}</h3>
      <div v-if="actionText" class="mt-6">
        <button
          @click="$emit('action')"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {{ actionText }}
        </button>
      </div>
    </div>
  `
});

export default {
ErrorMessage 
};