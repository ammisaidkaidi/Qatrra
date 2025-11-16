// ✅ Fully valid approach
export * as DB from "../libs/idb.js";
export * as SB from 'https://esm.sh/@supabase/supabase-js@2';
export * from './database.js';
export * from './FilterArray.js';
export * from "./IndexedArray.js";

import * as Vue from '../libs/vue2.js';
import { System } from "./database.js";

// Re-export manually
const vueCreateApp = Vue.createApp;
export const watch = Vue.watch;
/**
 * @type {{products:Array,invoices:Array,invoice:Array,qteEdit:[]}}
 */
export const FloatButtons = await (await fetch('../res/floatButtons.json')).json();
/**
 * @template T
 * @typedef {Object} Ref
 * @property {T} value
 */
/**
 * @template T
 * @param {T} value
 * @returns {Ref<any>}
 */
/**
 * @template {Object} T
 * @type {<T>(value:T)=>import('../def/index.js').Ref<T>}
 */
export const ref = Vue.ref;
export const h = Vue.h;
export const nextTick = Vue.nextTick;
export const computed = Vue.computed;
export const system = new System();
window.system=system;
export const components = {};
export const global = {};
function injectComponents(config) {
  if (config.components) {
    if (config.components !== components) Object.setPrototypeOf(config.components, components);
  } else config.components = components;
}


export function createApp(app) {
  injectComponents(app);
  return vueCreateApp.apply(undefined, arguments);
}
export function defineComponent(options) {
  injectComponents(options);
  const r = Vue.defineComponent(options);
  components[r.name] = r;
  return r;
}

export const templates = await (async function parseHtml() {
  // Fetch the templates.html file
  const templatesHtml = await fetch('./res/templates.html')
    .then(res => res.text())
    .catch(() => '');

  // Parse the HTML string
  const parser = new DOMParser();
  const doc = parser.parseFromString(templatesHtml, 'text/html');

  // Get all <template> elements
  const templateNodes = doc.querySelectorAll('template');

  // Convert NodeList to an object: { templateName: innerHTML }
  const templatesObj = {};
  templateNodes.forEach((node) => {
    const name = node.getAttribute('id') || node.getAttribute('name') || `template_${Math.random().toString(36).substr(2, 5)}`;
    templatesObj[name] = node.innerHTML.trim();
  });

  return templatesObj;
})();
export function getTemplate(name) {
  return templates[name];
}
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('fr-fr', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};