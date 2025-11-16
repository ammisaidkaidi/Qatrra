import { defineComponent, getTemplate, ref } from './init.js';

export const ProductItem = defineComponent({
  name: 'ProductItem',
  props: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: 'N/A' }
  },
  emits: ['select'],
  template: getTemplate('productItem-template')
});

export const ProductCard1 = defineComponent({
  name: 'ProductCard1',
  props: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: 'N/A' },
    selected: { type: Boolean, required: false, 'default': false }
  },
  emits: ['add-to-invoice'],
  template: getTemplate('productCard1-template')
});
// components.js
export const ProductCard = defineComponent({
  name: 'ProductCard',
  props: {
    x: { type: Object, required:true },
    background_color: { type: String, default: 'bg-orange-500' },
    selected: { default: false }
  },
  computed: {
    // This value will auto-update whenever this.x.qte changes
    currentQuantity() {
      return this.x.selected?.qte;
    }
  },
  emits: ['add-to-invoice'],
  template: getTemplate("productCard-template")
});
export const ProductsGrid = defineComponent({
  name: 'ProductsGrid',
  components: { ProductCard },
  props: {
    products: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  emits: ['add-to-invoice'],
  template: getTemplate("productGrid-template")
  
});

export default {
  ProductItem,
  ProductCard,
  ProductCard1,
  ProductsGrid

};




