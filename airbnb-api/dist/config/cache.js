"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCache = exports.invalidateCache = exports.setCache = exports.getCache = void 0;
const cacheStore = new Map();
const getCache = (key) => {
    const entry = cacheStore.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        cacheStore.delete(key);
        return null;
    }
    return entry.data;
};
exports.getCache = getCache;
const setCache = (key, data, ttlSeconds) => {
    cacheStore.set(key, {
        data,
        expiresAt: Date.now() + ttlSeconds * 1000
    });
};
exports.setCache = setCache;
const invalidateCache = (pattern) => {
    const keys = Array.from(cacheStore.keys());
    keys.forEach((key) => {
        if (key.includes(pattern)) {
            cacheStore.delete(key);
        }
    });
};
exports.invalidateCache = invalidateCache;
const clearCache = () => {
    cacheStore.clear();
};
exports.clearCache = clearCache;
