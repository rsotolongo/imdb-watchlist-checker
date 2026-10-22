(() => {
  const { api } = globalThis.IWC;
  const $ = (id) => document.getElementById(id);
  const when = (ts) => (ts ? new Date(ts).toLocaleString() : 'never');

  async function render() {
    const state = await api.runtime.sendMessage({ type: 'state' });
    $('count').textContent = `${state.ids.length} titles in Watchlist`;
    $('synced').textContent = `Last synced: ${when(state.lastSynced)}`;
    const messages = { 'signed-out': 'Sign in to IMDb', failed: 'Last sync failed' };
    $('status').textContent = messages[state.lastError] ?? '';
    $('status').className = state.lastError ? 'error' : '';
  }

  $('sync').addEventListener('click', async () => {
    $('sync').disabled = true;
    await api.runtime.sendMessage({ type: 'sync' });
    $('sync').disabled = false;
    render();
  });

  render();
})();
