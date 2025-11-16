import {
  defineComponent,
  ref,
  watch,
getTemplate
} from './init.js';


export const LoginCard = defineComponent( {
  name: 'LoginCard',
  emits: ['login'],
  setup(props, {
    emit
  }) {
    const phone = ref('');
    const pwd = ref('');

    const submitLogin = () => {
      if (!phone.value || !pwd.value) {
        alert('Please enter both phone and password');
        return;
      }
      emit('login', {
        phone: phone.value, pwd: pwd.value
      });
    };

    return {
      phone,
      pwd,
      submitLogin
    };
  },
  template: getTemplate('login-template')

});

export default {
  LoginCard
};