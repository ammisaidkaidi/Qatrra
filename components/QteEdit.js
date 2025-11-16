import { defineComponent, getTemplate, ref } from './init.js';

export const qteEdit = defineComponent({
    name: 'qteEdit',
    emits: ['close'],
    props: {
        info: { type: Object, required: true },
    },
    template: getTemplate('qteEdit-template'),
    setup() {
        /**
         * @type {import('./init.js').Ref<HTMLInputElement>}
         */
        const qte = ref();
        return {
            onQteChanged(e) {
                if (this.info.product?.selected)
                    this.info.product.selected.qte = Number(qte.value.value);
                else {
                    
                }
            }, qte
        };
    }
});

export default {
    qteEdit: qteEdit,
};




