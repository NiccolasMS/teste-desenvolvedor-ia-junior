/**
 * Ponto de entrada da aplicação Node.js executado pelo comando `npm start` (Questão 4).
 * Utiliza o módulo `http` nativo do Node.js para manter o projeto leve e sem dependências desnecessárias.
 */

const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      status: 'OK',
      message: 'Aplicação Node.js em execução com sucesso via npm start (Questão 4)!',
      timestamp: new Date().toISOString(),
    })
  );
});

server.listen(PORT, () => {
  console.log(`[Server] Aplicação Node.js rodando na porta ${PORT}`);
});

// Tratamento de desligamento gracioso (Graceful Shutdown) ao receber sinais do Docker (SIGTERM / SIGINT)
process.on('SIGTERM', () => {
  console.log('[Server] Recebido SIGTERM. Encerrando servidor com segurança...');
  server.close(() => process.exit(0));
});
