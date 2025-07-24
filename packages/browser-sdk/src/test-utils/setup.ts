// Setup file for Jest tests
import 'fake-indexeddb/auto';
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder/TextDecoder polyfills for jsdom
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;