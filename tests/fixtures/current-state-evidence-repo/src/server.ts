const app = { get(_path: string, _handler: unknown) {} };

app.get('/health', () => ({ ok: true }));
