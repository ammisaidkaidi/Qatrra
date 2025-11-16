import {
  components,
  defineComponent,
  global, 
  getTemplate
} from './../help/init.js';

export const modalComponent = defineComponent({
  name: 'ModalComponent',
  template: getTemplate('modal-template'),
  components,
  emit: ['close', 'resume', 'open', 'executeFn', 'keydown'],
  props: {
    component: {
      type: [Object, Function], // Accepts Modal instance or Vue component
      required: true
    },
    title: String,
    close: Function,
    execute: Function,
    bypass: { type: Object, 'default': () => ({}) },
    buttons: { type: Array, 'default': () => { [] } },
    categories: { type: Array, 'default': () => { [""] } },
    onSearch: { type: Function, default: undefined },
    events: Object

  },
  setup(props, context) {
    const { emit } = context;
    function close() {

      emit('close', { event: 'close', props, context });
      props.close();
    };
    function handleButtonClick(buttonId) {

      props.execute('execute', buttonId, props, context);
      emit('execute', { event: 'execute', buttonId, props, context });
    }
    return {
      global,
      close,
      handleButtonClick,
      onkeydown(a, b) {
        this.$emit('keydown', this);
        arguments;

      },
      xnSearch($event) {
        this.onSearch && this.onSearch(this, $event);
        this.$emit('on-search', { modal: this, ...$event });
      }
    };
  }
});
