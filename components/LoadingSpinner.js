 import { defineComponent, ref } from './init.js';

export const LoadingSpinner = defineComponent({
  name: 'LoadingSpinner',
  props: {
    message: { type: String, default: 'Loading...' }
  },
  template: `
    <div class="flex justify-center items-center py-16 z-[50000]">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p class="mt-4 text-gray-600">{{ message }}</p>
      </div>
    </div>
  `
});
export default {
LoadingSpinner 
};