import { showSelectedInvoice } from "../pages/invoice.js";
import { showInvoices } from "../pages/invoices.js";

export function closeModel() { }

export async function handleButtonClick(buttonId) {
  
  switch (buttonId) {
    case 'invoices':
      await showInvoices();
      break;
    case 'invoice':
      showSelectedInvoice();
      break;
    case 'search':     
    
      break;
    case 'client':
      break;
    default:
      
      break;
  }
}