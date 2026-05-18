import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';

/**
 * Emotion cache configured for RTL.
 * Used by <CacheProvider> to flip MUI styles for Arabic.
 */
const rtlCache = createCache({
  key: 'mui-rtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

export default rtlCache;
