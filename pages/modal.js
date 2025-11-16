

import { h, createApp, modalPortal, components, coms } from '../help/global.js';





/** 
 * @typedef {object} modalArgs
 * @property {component} component 
 * @property {string} title 
 * @property {Object} bypass 
 * @property {Array<{ id: String, name: String, title: String, icon: String, color: String,execute(e:{ bypass,show, close, dispose}):void }>} buttons 
 * @property {Boolean} resusable 
 */

/**
 * @template {Object} T
 * @typedef {object} modalOutput
 * @property {T} bypass
 * @property {object} events
 * @property {()=>Promise<{code:'error'|'close',reason:string}>} show
 * @property {()=>void}  close
*  @property {()=>void}  dispose
 */

/**
 * @argument T
 * @param {modalArgs} e
 * @param {modalOutput} output
 * @returns {modalOutput}
 */
export function createModal(e, output, onSearch) {
  function close(e1) {
    if (!e.resusable) {
      disposed = true;
      app.unmount();
    }
    container.remove();
    res(e1);
  }
  async function show() {
    if (disposed) throw new Error("modal is disposed");

    let parent = modalPortal.value;
    const p = new Promise((_res, _rej) => { res = _res });
    if (disposed) return res({ code: 'error', reason: 'not open ' }), p;
    if (parent instanceof HTMLElement)
      parent.appendChild(container);
    else if (parent && (parent = parent.$el))
      (parent = modalPortal.value.$el).appendChild(container);
    else return res({ code: 'error', reason: 'not open ' }), p;
    return p;
  }
  function execute(event, buttonId, props, context) {
    let g = e.buttons.find(v => v.id === buttonId);
    if (typeof g.execute === 'function') g.execute(output)
  }
  const container = document.createElement('div');
  let res;
  let disposed = false;
  const app = createApp({
    components,
    render() {
      return h(coms.modalComponent, {
        component: e.component,
        title: e.title,
        bypass: e.bypass,
        events: e.events,
        buttons: e.buttons,
        categories: e.categories,
        onSearch,
        close,
        show,
        execute
      });
    }
  });
  // Mount it inside the transition  
  app.mount(container);
  Object.assign(output, {
    bypass: e.bypass, events: e.events,
    show, close, dispose() {
      if (disposed) return;
      resusable = false;
      close({ code: 'close', reason: 'dispose' });
    }
  });
  return output;
}