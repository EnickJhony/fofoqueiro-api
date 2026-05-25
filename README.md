# Fofoqueiro API

API de consulta para as noticias salvas no banco de dados PostgreSQL do projeto Fofoqueiro.

O objetivo desta API e expor os registros da tabela `news` de forma simples e segura, sem permitir insercao, alteracao ou exclusao de dados. Ela foi pensada para consumo por painel, dashboard, frontend ou qualquer outro cliente que precise ler as noticias coletadas dos portais da regiao.

## Visao geral

A aplicacao retorna noticias com filtros por:

- noticias mais recentes, com limite maximo de 200 itens
- noticias de hoje
- noticias de um dia especifico
- noticias de um portal especifico, via `source_name`
- paginação opcional na listagem geral e na rota de hoje

Tambem existe uma rota de `health` para validar se a API e o banco estao respondendo corretamente.

## Stack tecnica

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- CORS habilitado para consumo por clientes web
- dotenv para configuracao de ambiente

## Estrutura do projeto

- `src/server.js`: servidor Express e rotas da API
- `src/prisma.js`: instancia compartilhada do Prisma Client
- `prisma/schema.prisma`: schema do banco e modelagem da tabela `news`
- `.env`: variaveis de ambiente, especialmente `DATABASE_URL` e `PORT`

## Modelo de dados

A tabela usada pela API e `news`, com os campos abaixo:

- `id`
- `source_name`
- `source_url`
- `title`
- `link`
- `published_at`
- `collected_at`

## Regras da API

- A API e apenas para leitura
- Nao existem rotas de `POST`, `PUT`, `PATCH` ou `DELETE`
- A listagem padrao considera as noticias mais recentes
- O retorno padrao em `GET /api/news` continua sendo um array com no maximo 200 registros
- Quando `page` for informado em `GET /api/news` ou `GET /api/news/today`, a resposta passa a incluir metadados de paginacao

## Variaveis de ambiente

Crie um arquivo `.env` na raiz do projeto com este conteudo:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"
PORT=3333
```

## Como rodar

### 1. Instalar dependencias

```bash
npm install
```

### 2. Gerar o Prisma Client

```bash
npm run prisma:generate
```

### 3. Subir a API

```bash
npm start
```

Em modo desenvolvimento:

```bash
npm run dev
```

## Rotas

### `GET /`

Retorna uma mensagem simples de boas-vindas.

Exemplo:

```bash
curl.exe http://localhost:3333/
```

Resposta:

```json
{
  "message": "Bem vindo à API fofoqueiro."
}
```

### `GET /health`

Verifica se a API esta no ar e se o banco esta acessivel.

Exemplo:

```bash
curl.exe -i http://localhost:3333/health
```

Resposta esperada quando o banco responde corretamente:

```json
{
  "ok": true,
  "db": true
}
```

### `GET /api/news`

Retorna as noticias mais recentes.

Query params aceitos:

- `limit`: quantidade de registros desejada, com maximo de 200
- `date`: filtra por dia especifico no formato `YYYY-MM-DD`
- `source_name`: filtra pelo nome do portal
- `page`: numero da pagina, maior que 0. Quando informado, a resposta inclui metadados de paginacao

Comportamento:

- sem `page`: resposta antiga, um array com as noticias
- com `page`: resposta em formato `{ data, pagination }`

Exemplos:

```bash
curl.exe "http://localhost:3333/api/news"
curl.exe "http://localhost:3333/api/news?limit=20"
curl.exe "http://localhost:3333/api/news?page=1&limit=20"
curl.exe "http://localhost:3333/api/news?date=2026-05-25"
curl.exe "http://localhost:3333/api/news?source_name=Portal%20do%20Holanda"
```

### `GET /api/news/today`

Retorna as noticias publicadas no dia atual.

Tambem aceita `page` e `limit` com o mesmo comportamento de `GET /api/news`.

Exemplo:

```bash
curl.exe http://localhost:3333/api/news/today
curl.exe "http://localhost:3333/api/news/today?page=1&limit=20"
```

### `GET /api/news/:id`

Retorna uma noticia especifica pelo `id`.

Exemplo:

```bash
curl.exe http://localhost:3333/api/news/1
```

## Exemplos de uso

### Buscar as 50 noticias mais recentes

```bash
curl.exe "http://localhost:3333/api/news?limit=50"
```

### Buscar a segunda pagina com 20 noticias por pagina

```bash
curl.exe "http://localhost:3333/api/news?page=2&limit=20"
```

### Buscar as noticias de um dia especifico

```bash
curl.exe "http://localhost:3333/api/news?date=2026-05-24"
```

### Buscar noticias de um portal especifico

```bash
curl.exe "http://localhost:3333/api/news?source_name=Portal%20Em%20Tempo"
```

### Buscar noticias de hoje

```bash
curl.exe http://localhost:3333/api/news/today
```

## Observacoes importantes

- A coluna usada para ordenacao e filtro por data e `published_at`
- Se `DATABASE_URL` estiver incorreto, a rota `/health` vai falhar
- Em ambiente Windows, e comum precisar encerrar o processo da porta 3333 antes de regenerar o Prisma Client

## Validao rapida

Se quiser testar rapidamente a API depois de subir o servidor:

```bash
curl.exe http://localhost:3333/
curl.exe -i http://localhost:3333/health
curl.exe -i http://localhost:3333/api/news
```

## Licenca

Projeto interno para consulta de noticias do banco Fofoqueiro.
