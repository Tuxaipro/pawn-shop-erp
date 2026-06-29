import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en/common.json';
import enCustomer from './en/customer.json';
import enLoan from './en/loan.json';
import enMasters from './en/masters.json';
import enSettings from './en/settings.json';
import enPartPayment from './en/partPayment.json';
import enBankLoan from './en/bankLoan.json';
import enRenewal from './en/renewal.json';
import enInventory from './en/inventory.json';
import enHelp from './en/help.json';
import enAccounts from './en/accounts.json';
import enReports from './en/reports.json';
import enGl from './en/gl.json';
import ta from './ta/common.json';
import taCustomer from './ta/customer.json';
import taLoan from './ta/loan.json';
import taMasters from './ta/masters.json';
import taSettings from './ta/settings.json';
import taPartPayment from './ta/partPayment.json';
import taBankLoan from './ta/bankLoan.json';
import taRenewal from './ta/renewal.json';
import taInventory from './ta/inventory.json';
import taHelp from './ta/help.json';
import taAccounts from './ta/accounts.json';
import taReports from './ta/reports.json';
import taGl from './ta/gl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: en,
        customer: enCustomer,
        loan: enLoan,
        masters: enMasters,
        settings: enSettings,
        partPayment: enPartPayment,
        bankLoan: enBankLoan,
        renewal: enRenewal,
        inventory: enInventory,
        help: enHelp,
        accounts: enAccounts,
        reports: enReports,
        gl: enGl,
      },
      ta: {
        common: ta,
        customer: taCustomer,
        loan: taLoan,
        masters: taMasters,
        settings: taSettings,
        partPayment: taPartPayment,
        bankLoan: taBankLoan,
        renewal: taRenewal,
        inventory: taInventory,
        help: taHelp,
        accounts: taAccounts,
        reports: taReports,
        gl: taGl,
      },
    },
    ns: ['common', 'customer', 'loan', 'masters', 'settings', 'partPayment', 'bankLoan', 'renewal', 'inventory', 'help', 'accounts', 'reports', 'gl'],
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: ['en', 'ta'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
