// bottomNavbar.js
import {
  defineComponent,
  ref,
  nextTick,
  getTemplate
} from './init.js';

export const BottomNavbar = defineComponent({
  name: 'BottomNavbar',
  props: {
    buttons: {
      type: Array,
      default: () => [/*{
        id: 'search', name: 'search', title: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', color: 'bg-indigo-600'
      },
      {
        id: 'invoice', name: 'invoice', title: 'New Invoice', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', color: 'bg-green-600'
      },
      {
        id: 'invoices', name: 'invoices', title: 'Invoices', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', color: 'bg-blue-600'
      },
      {
        id: 'client', name: 'client', title: 'Client', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'bg-purple-600'
      },
      {
        id: 'settings', name: 'settings', title: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', color: 'bg-yellow-600'
      }*/]
    },
    categories: {
      type: Array,
      default: () => ([])
    }
  },
  watch: {
    isSearchMode(n, o) {
      // emit('toggle-search', n);
    }
  },
  selectedCategory: String,
  emits: ['button-click', 'search-input', 'validate', 'toggle-search'],
  setup(props, { emit }) {
    const searchQuery = ref('');
    const selectedCategory = ref('all');
    const searchInput = ref(null);
    const isSearchMode = ref(false);
    const handleClick = (buttonId, event) => {
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      const button = event.currentTarget;
      const ripple = document.createElement('span');

      const diameter = Math.max(button.clientWidth, button.clientHeight);
      const radius = diameter / 2;
      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
      ripple.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
      ripple.classList.add('absolute', 'bg-white', 'opacity-50', 'rounded-full', 'transform', 'scale-0', 'animate-ripple');
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
      if (buttonId === 'search') {
        searchQuery.value = '';
        selectedCategory.value = 'all';
        emit('search-input', {
          query: '', category: 'all'
        });
        isSearchMode.value = true;
        emit('update:isSearchMode', true)
        emit('toggle-search', true);
        nextTick(() => {
          if (searchInput.value)
            searchInput.value.focus();
        });

      }



      emit('button-click', buttonId);
    };
    const handleSearchInput = async () => {
      emit('search-input',
        {
          query: searchQuery.value,
          category: selectedCategory.value
        });
    };

    const handleCategoryChange = () => {
      emit('search-input', {
        query: searchQuery.value,
        category: selectedCategory.value
      });
      handleSearchInput();
    };
    const handleValidate = () => {

      emit('validate', {
        query: searchQuery.value, category: selectedCategory.value
      });
      isSearchMode.value = false;
      emit('update:isSearchMode', false)
      emit('toggle-search', false);
    };
    const toggleSearchMode = () => {
      emit('search-input', {
        query: '', category: 'all'
      });
      isSearchMode.value = false;
      emit('update:isSearchMode', false)
    };
    const getInputWidthClass = (categoriesArray) => {
      if (categoriesArray && categoriesArray.length) {
        return 'w-2/3';
      }
      return 'w-full';
    }
    return {
      handleClick,
      searchQuery,

      selectedCategory,
      //categories,
      handleSearchInput,

      handleCategoryChange,
      handleValidate,
      toggleSearchMode,
      searchInput, isSearchMode, getInputWidthClass
    };
  },
  template: getTemplate(`bottomNavbar-template`)
});

export default {
  BottomNavbar
};

