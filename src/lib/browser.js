const api = globalThis.browser ?? globalThis.chrome;

if (typeof module !== 'undefined') module.exports = api;
else (globalThis.IWC ??= {}).api = api;
