// Online: se o portal pedir a palavra-passe da sala (cookie em falta), volta ao ecrã «Entrar».
(() => {
  const original = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const r = await original(...args);
    if (r.status === 401 && r.headers.get("x-sala") === "1")
      location.replace(`/entrar?volta=${encodeURIComponent(location.pathname + location.search)}`);
    return r;
  };
})();
