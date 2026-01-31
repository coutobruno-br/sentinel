# GitHub App Setup Guide

Este guia explica como criar e configurar o GitHub App para o Sentinel Engine.

## Pré-requisitos

- Conta GitHub (pessoal ou organização)
- Servidor Sentinel rodando e acessível publicamente (ou ngrok para desenvolvimento)
- Node.js 18+ instalado

## 1. Criar o GitHub App

### Via Interface Web

1. Acesse [GitHub Settings > Developer settings > GitHub Apps](https://github.com/settings/apps)
2. Clique em **New GitHub App**
3. Preencha os campos:

| Campo | Valor |
|-------|-------|
| **GitHub App name** | `Sentinel Engine` (ou nome único) |
| **Homepage URL** | URL do seu servidor ou repositório |
| **Webhook URL** | `https://seu-dominio.com/webhook/github-app` |
| **Webhook secret** | Gere uma string aleatória segura |

### Permissões

Configure as permissões mínimas necessárias:

**Repository permissions:**
| Permissão | Nível | Motivo |
|-----------|-------|--------|
| Contents | Read | Ler arquivos para análise |
| Metadata | Read | Informações básicas do repo |
| Pull requests | Read | Analisar PRs |
| Checks | Write | Criar check runs com resultados |
| Commit statuses | Write | Reportar status em commits |

**Organization permissions:**
| Permissão | Nível | Motivo |
|-----------|-------|--------|
| Members | Read | (Opcional) Identificar reviewers |

### Eventos

Selecione os eventos para webhook:

- [x] Push
- [x] Pull request
- [x] Pull request review
- [x] Check run
- [x] Check suite

### Onde pode ser instalado?

- **Any account** - Para distribuição pública
- **Only on this account** - Para uso interno

4. Clique em **Create GitHub App**

## 2. Gerar Private Key

1. Na página do App criado, role até **Private keys**
2. Clique em **Generate a private key**
3. Salve o arquivo `.pem` baixado em local seguro

## 3. Configurar Variáveis de Ambiente

Copie o `env.example` para `.env` e configure:

```bash
cp env.example .env
```

Edite o `.env`:

```env
# GitHub App
GITHUB_APP_ID=123456                    # ID numérico do App
GITHUB_WEBHOOK_SECRET=your-secret-here  # Secret do webhook

# Private key (opção 1: path do arquivo)
GITHUB_PRIVATE_KEY_PATH=./private-key.pem

# Private key (opção 2: conteúdo base64)
GITHUB_PRIVATE_KEY=LS0tLS1CRUdJTi...
```

### Converter PEM para Base64

```bash
# Linux/Mac
base64 -w 0 private-key.pem

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("private-key.pem"))
```

## 4. Instalar o App

### Em Repositório Pessoal

1. Acesse a página do App: `https://github.com/apps/seu-app-name`
2. Clique em **Install**
3. Selecione repositórios (todos ou específicos)
4. Clique em **Install**

### Em Organização

1. Acesse Settings da organização
2. Vá em **Developer settings > GitHub Apps**
3. Clique em **Install** no seu App
4. Selecione repositórios
5. Clique em **Install**

## 5. Verificar Instalação

Após instalar, verifique se o webhook está funcionando:

```bash
# Ver logs do servidor
tail -f logs/sentinel.log

# Testar endpoint de stats
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://seu-dominio.com/stats
```

Resposta esperada:
```json
{
  "installations": {
    "totalInstallations": 1,
    "activeInstallations": 1,
    "totalRepositories": 5
  }
}
```

## 6. Testar Webhook

Faça um push em um repositório com o App instalado:

```bash
git commit --allow-empty -m "Test Sentinel webhook"
git push
```

Verifique os logs para ver a execução:
```
[Sentinel] Webhook received: push (abc123)
[Sentinel] Execution exec_xxx: 4/5 passed
```

## Desenvolvimento Local

Para desenvolvimento local, use ngrok:

```bash
# Iniciar ngrok
ngrok http 3000

# Usar URL gerada no webhook
# Exemplo: https://abc123.ngrok.io/webhook/github-app
```

## Troubleshooting

### Webhook não chega

1. Verifique se o servidor está acessível publicamente
2. Confira o Webhook secret no `.env`
3. Veja os logs de entrega em: App Settings > Advanced > Recent Deliveries

### Erro de assinatura

```
[Sentinel] Invalid webhook signature
```

- Verifique se `GITHUB_WEBHOOK_SECRET` está correto
- Confira se não há espaços extras na variável

### Erro de autenticação JWT

```
Failed to get installation token: 401
```

- Verifique se `GITHUB_APP_ID` está correto
- Confira se a private key está no formato correto
- A key pode ter expirado (gere uma nova)

## Próximos Passos

- [Configurar Billing](./billing-setup.md)
- [Publicar no Marketplace](./marketplace-setup.md)
- [Regras Customizadas](./custom-rules.md)
