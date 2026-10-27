const TITLE_ID = /^tt\d+$/;

const validators = {
  has: (msg) => Array.isArray(msg.ids) && msg.ids.every((id) => typeof id === 'string' && TITLE_ID.test(id)),
  set: (msg) => typeof msg.id === 'string' && TITLE_ID.test(msg.id) && typeof msg.present === 'boolean',
  sync: () => true,
  state: () => true,
};

function validateMessage(msg) {
  return Object.hasOwn(validators, msg?.type) && validators[msg.type](msg);
}

if (typeof module !== 'undefined') module.exports = { validateMessage };
else (globalThis.IWC ??= {}).validateMessage = validateMessage;
