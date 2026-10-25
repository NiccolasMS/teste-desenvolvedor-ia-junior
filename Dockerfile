# ==============================================================================
# QUESTÃO 4: Dockerfile mínimo para uma aplicação Node.js que roda `npm start`
# ==============================================================================

# 1. IMAGEM BASE:
# Escolhemos a variante oficial 'alpine' (baseada no Alpine Linux) da versão LTS do Node.js.
# Justificativa: Reduz o tamanho da imagem de ~1 GB para ~50 MB, acelerando o deploy
# e diminuindo drasticamente a superfície de ataque (menos pacotes do SO sujeitos a CVEs).
FROM node:20-alpine

# 2. VARIÁVEL DE AMBIENTE:
# Define explicitamente o ambiente como produção.
# Justificativa: Faz com que frameworks (como Express) ativem cache interno,
# omitam stack traces sensíveis em erros e otimizem o consumo de memória.
ENV NODE_ENV=production

# 3. DIRETÓRIO DE TRABALHO:
# Cria e define o diretório padrão onde os comandos seguintes serão executados.
# Justificativa: Evita misturar arquivos da aplicação com diretórios de sistema da raiz (/).
WORKDIR /usr/src/app

# 4. OTIMIZAÇÃO DE CACHE DE CAMADAS (LAYER CACHING):
# Copiamos PRIMEIRO apenas o package.json e o package-lock.json (usando o wildcard *).
# Justificativa: O Docker constrói imagens em camadas. Se alterarmos apenas o código-fonte (.js)
# e não as dependências, o Docker reaproveitará a camada de instalação abaixo do cache,
# reduzindo o tempo de rebuild de minutos para menos de 1 segundo.
COPY package*.json ./

# 5. INSTALAÇÃO DE DEPENDÊNCIAS DE PRODUÇÃO:
# Instala exclusivamente os pacotes de produção ignorando devDependencies e limpa o cache.
# Justificativa: Mantém a imagem final enxuta sem ferramentas de desenvolvimento/teste.
RUN npm install --omit=dev && npm cache clean --force

# 6. CÓPIA DO CÓDIGO-FONTE E SEGURANÇA (NON-ROOT):
# Copiamos o restante do código já atribuindo permissão ao usuário nativo 'node'.
# Justificativa: Por padrão, o Docker roda como 'root'. Mudar para 'USER node' aplica o
# Princípio do Menor Privilégio: se a aplicação sofrer uma falha de segurança, o invasor
# não terá privilégios administrativos dentro do contêiner.
COPY --chown=node:node . .
USER node

# 7. DOCUMENTAÇÃO DE PORTA:
# Indica que o contêiner escuta na porta 3000 por padrão.
EXPOSE 3000

# 8. COMANDO DE INICIALIZAÇÃO:
# Inicia a aplicação executando 'npm start' usando a sintaxe de array JSON (Exec Form).
# Justificativa: O formato ["npm", "start"] executa o processo diretamente sem criar um
# sub-shell (/bin/sh -c) intermediário, garantindo que sinais do Docker/Kubernetes
# (como SIGTERM e SIGINT para desligamento gracioso) cheguem corretamente à aplicação.
CMD ["npm", "start"]
