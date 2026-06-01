import '@testing-library/jest-dom'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'

// Initialize i18n for test environment (Option C from RESEARCH.md §Test Setup).
// i18next v26 removed initImmediate — init is synchronous by default without an async backend plugin.
// This keeps all existing tests green: t('study.filterByTag') returns 'Filter by tag',
// not the key string. Individual test files can override with their own vi.mock if needed.
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
})
