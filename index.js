/// <reference path="./def/index.d.ts" />
/** @typedef {import('./def/index.js').product} product */

import { list, products, selectedInvoice } from './help/global.js';
import {
  createApp,
  global,
  components,
  FloatButtons,
  system
} from './help/init.js';
import { reactive, watch } from './libs/vue2.js';


import { handleButtonClick } from './pages/app.js';
import { showQteEdit } from './pages/qteEdit.js';
const floatButtons = reactive(FloatButtons.products);
watch(() => selectedInvoice.value, (n) => {
  floatButtons[1].hide = !n;
});

console.log(components);
const App = {
  components,
  setup() {
    return {
      ...global,
      handleButtonClick,
      onSearch(_this, e) {        
        list.products.query = e.query;
      },
      handleAddToInvoice(a, b) {
        const product = products.value.get(a);
        if (selectedInvoice.value && product)
          showQteEdit(product.selected, selectedInvoice.value, product);

      },
      handleLogin(e){
        debugger;
        system.api.login(e)
      },
      floatButtons
    };
  }
};

createApp(App).mount('#app');

