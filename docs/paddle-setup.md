# Paddle Setup Guide

Este guia explica como configurar o Paddle para processar pagamentos no Sentinel Engine.

## Índice

1. [Criar Conta Sandbox](#1-criar-conta-sandbox)
2. [Gerar API Key](#2-gerar-api-key)
3. [Gerar Client Token](#3-gerar-client-token)
4. [Criar Produtos](#4-criar-produtos)
5. [Criar Preços](#5-criar-preços)
6. [Configurar Webhooks](#6-configurar-webhooks)
7. [Testar Integração](#7-testar-integração)
8. [Migrar para Produção](#8-migrar-para-produção)

---

## 1. Criar Conta Sandbox

O Paddle Sandbox permite testar toda a integração sem processar pagamentos reais.

1. Acesse: **https://sandbox-vendors.paddle.com/signup**
2. Preencha os dados da conta
3. Confirme o email
4. Faça login no dashboard

> **Nota**: O Sandbox é completamente separado da produção. Você precisará criar uma conta de produção separada depois.

---

## 2. Gerar API Key

A API Key é usada no **backend** para operações server-side (criar checkouts, gerenciar subscriptions, etc).

### Caminho
```
Dashboard → Developer Tools → Authentication → API Keys
```

### Passos

1. No menu lateral, clique em **Developer Tools**
2. Clique em **Authentication**
3. Na seção **API Keys**, clique em **+ Generate API Key**
4. Configure os campos:

| Campo | Valor | Descrição |
|-------|-------|-----------|
| **Name** | `Sentinel Backend` | Nome identificador da chave |
| **Description** | `API key for Sentinel Engine backend` | Descrição opcional |

### Permissions (Permissões)

Selecione as permissões necessárias para cada recurso:

| Recurso | READ | WRITE | Motivo |
|---------|------|-------|--------|
| **Products** | ✅ | ❌ | Consultar produtos |
| **Prices** | ✅ | ❌ | Consultar preços |
| **Customers** | ✅ | ✅ | Criar e consultar clientes |
| **Transactions** | ✅ | ✅ | Criar checkouts e consultar transações |
| **Subscriptions** | ✅ | ✅ | Gerenciar assinaturas (cancelar, pausar, etc) |
| **Adjustments** | ✅ | ❌ | Consultar reembolsos |
| **Discounts** | ✅ | ❌ | Consultar descontos (se usar cupons) |
| **Reports** | ❌ | ❌ | Não necessário |
| **Notification settings** | ❌ | ❌ | Não necessário |
| **Event types** | ✅ | ❌ | Consultar tipos de eventos |

### Resumo de Permissões Mínimas

```
✅ READ:  Products, Prices, Customers, Transactions, Subscriptions, Adjustments, Event types
✅ WRITE: Customers, Transactions, Subscriptions
```

5. Clique em **Generate**
6. **IMPORTANTE**: Copie a chave imediatamente (ela não será mostrada novamente)

### Formato da Chave
```
pdl_sdbx_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Configuração
```env
# .env.development
PADDLE_API_KEY=pdl_sdbx_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 3. Gerar Client Token

O Client Token é usado no **frontend** para inicializar o Paddle.js e abrir o modal de checkout.

### Caminho
```
Dashboard → Developer Tools → Authentication → Client-side tokens
```

### Passos

1. Na página de **Authentication** (mesma da API Key)
2. Role até a seção **Client-side tokens**
3. Clique em **+ Generate client-side token**
4. Configure:

| Campo | Valor |
|-------|-------|
| **Name** | `Sentinel Frontend` |
| **Description** | `Token for Paddle.js checkout modal` |

5. Clique em **Generate**
6. Copie o token

### Formato do Token
```
test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Configuração
```env
# .env.development
PADDLE_CLIENT_TOKEN=test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 4. Criar Produtos

Produtos representam o que você está vendendo (os planos do Sentinel).

### Caminho
```
Dashboard → Catalog → Products
```

### Criar Produto: Sentinel Pro

1. Clique em **+ New product**
2. Preencha:

| Campo | Valor |
|-------|-------|
| **Name** | `Sentinel Pro` |
| **Description** | `For teams serious about compliance. 1,000 executions/month, 25 repositories, PDF reports, custom rules, and webhook notifications.` |
| **Tax category** | `saas` |
| **Image** | (opcional) Upload do logo |

3. Em **Custom data** (JSON), adicione:
```json
{
  "plan_id": "pro",
  "tier": "paid"
}
```

4. Clique em **Save**

### Criar Produto: Sentinel Enterprise

Repita o processo com:

| Campo | Valor |
|-------|-------|
| **Name** | `Sentinel Enterprise` |
| **Description** | `For large organizations. Unlimited executions, unlimited repositories, 1-year evidence retention, priority support, and dedicated account manager.` |
| **Tax category** | `saas` |

Custom data:
```json
{
  "plan_id": "enterprise",
  "tier": "paid"
}
```

---

## 5. Criar Preços

Cada produto precisa de pelo menos um preço. Vamos criar preços mensais e anuais.

### Caminho
```
Dashboard → Catalog → Products → [Produto] → Prices
```

### Preços do Sentinel Pro

#### Preço Mensal
1. Abra o produto **Sentinel Pro**
2. Vá na aba **Prices**
3. Clique em **+ Add price**
4. Configure:

| Campo | Valor |
|-------|-------|
| **Description** | `Monthly subscription` |
| **Amount** | `29.00` |
| **Currency** | `USD` |
| **Billing cycle** | `Monthly` |
| **Trial period** | `14 days` |

5. Em **Custom data**:
```json
{
  "plan_id": "pro",
  "billing": "monthly"
}
```

6. Clique em **Save**
7. **Copie o Price ID** (ex: `pri_01abc123...`)

#### Preço Anual (opcional)
Repita com:

| Campo | Valor |
|-------|-------|
| **Description** | `Annual subscription (save 17%)` |
| **Amount** | `290.00` |
| **Currency** | `USD` |
| **Billing cycle** | `Yearly` |
| **Trial period** | `14 days` |

### Preços do Sentinel Enterprise

Repita o processo para Enterprise:

| Tipo | Amount | Billing |
|------|--------|---------|
| Mensal | `99.00` USD | Monthly |
| Anual | `990.00` USD | Yearly |

### Configuração

Após criar os preços, copie os Price IDs mensais:

```env
# .env.development
PADDLE_PRICE_ID_PRO=pri_01xxxxxxxxxxxxxxxxxxxxxx
PADDLE_PRICE_ID_ENTERPRISE=pri_01yyyyyyyyyyyyyyyyyyyyyy
```

---

## 6. Configurar Webhooks

Webhooks notificam seu backend sobre eventos (nova assinatura, cancelamento, pagamento, etc).

### Caminho
```
Dashboard → Developer Tools → Notifications
```

### Criar Webhook

1. Clique em **+ New destination**
2. Configure:

| Campo | Valor |
|-------|-------|
| **Type** | `Webhook` |
| **Description** | `Sentinel Engine Webhooks` |
| **URL** | `https://seu-dominio.com/webhook/paddle` |

> **Para testes locais**: Use https://webhook.site ou ngrok para obter uma URL pública temporária.

### Selecionar Eventos

Marque os seguintes eventos:

#### Subscription Events
- [x] `subscription.created`
- [x] `subscription.updated`
- [x] `subscription.canceled`
- [x] `subscription.paused`
- [x] `subscription.resumed`
- [x] `subscription.activated`
- [x] `subscription.past_due`
- [x] `subscription.trialing`

#### Transaction Events
- [x] `transaction.created`
- [x] `transaction.completed`
- [x] `transaction.canceled`
- [x] `transaction.payment_failed`
- [x] `transaction.updated`

#### Customer Events (opcional)
- [x] `customer.created`
- [x] `customer.updated`

3. Clique em **Save**

### Obter Webhook Secret

1. Após criar, clique no webhook na lista
2. Na página de detalhes, encontre **Secret key**
3. Clique para revelar e copie

### Formato do Secret
```
pdl_ntfset_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Configuração
```env
# .env.development
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 7. Testar Integração

### Verificar Configuração

1. Inicie o servidor:
```bash
npm run dev
```

2. Verifique a configuração:
```bash
curl http://localhost:3000/config
```

Resposta esperada:
```json
{
  "env": "development",
  "paddle": {
    "configured": true,
    "environment": "sandbox",
    "clientToken": "test_xxx..."
  }
}
```

### Testar Checkout

1. Acesse a landing page: http://localhost:8080
2. Clique em um botão de plano pago (Pro ou Enterprise)
3. Preencha o email no modal
4. O checkout do Paddle deve abrir

### Cartões de Teste

No Sandbox, use estes cartões de teste:

| Cenário | Número do Cartão | CVV | Validade |
|---------|------------------|-----|----------|
| Pagamento bem-sucedido | `4242 4242 4242 4242` | Qualquer 3 dígitos | Qualquer data futura |
| Pagamento recusado | `4000 0000 0000 0002` | Qualquer | Qualquer |
| Requer autenticação | `4000 0025 0000 3155` | Qualquer | Qualquer |

### Verificar Webhooks

1. Faça uma compra de teste
2. Verifique os logs do servidor:
```
[Paddle] Received webhook: subscription.created
[Paddle] Subscription created: account_123 -> pro
```

3. Ou verifique no Paddle Dashboard:
```
Developer Tools → Notifications → [Webhook] → Events
```

---

## 8. Migrar para Produção

Quando estiver pronto para produção:

### 1. Criar Conta de Produção

1. Acesse: https://vendors.paddle.com/signup
2. Complete a verificação do negócio (pode levar alguns dias)
3. Aguarde aprovação

### 2. Recriar Configurações

Na conta de produção, repita os passos:
- Gerar API Key (mesmas permissões)
- Gerar Client Token
- Criar Produtos e Preços
- Configurar Webhooks

### 3. Atualizar Variáveis de Ambiente

No `.env.production`:

```env
PADDLE_ENVIRONMENT=production
PADDLE_API_KEY=pdl_live_xxxxxxxx...
PADDLE_CLIENT_TOKEN=live_xxxxxxxx...
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxxxxx...
PADDLE_PRICE_ID_PRO=pri_01xxxxxx...
PADDLE_PRICE_ID_ENTERPRISE=pri_01yyyyyy...
```

### 4. Deploy

```bash
# Railway
railway up

# Fly.io
fly deploy
```

---

## Resumo das Variáveis

```env
# Paddle Configuration
PADDLE_ENVIRONMENT=sandbox                    # sandbox ou production
PADDLE_API_KEY=pdl_sdbx_xxx                  # API Key (backend)
PADDLE_CLIENT_TOKEN=test_xxx                  # Client Token (frontend)
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx          # Webhook Secret
PADDLE_PRICE_ID_PRO=pri_xxx                   # Price ID do plano Pro
PADDLE_PRICE_ID_ENTERPRISE=pri_xxx            # Price ID do plano Enterprise
```

---

## Troubleshooting

### "Payment system not configured"

Verifique se todas as variáveis estão definidas:
```bash
curl http://localhost:3000/billing/paddle/config
```

### Webhooks não chegam

1. Verifique a URL do webhook no Paddle Dashboard
2. Para teste local, use ngrok:
   ```bash
   ngrok http 3000
   ```
3. Atualize a URL do webhook para a URL do ngrok

### Checkout não abre

1. Verifique o console do navegador (F12)
2. Confirme que `PADDLE_CLIENT_TOKEN` está configurado
3. Verifique se os Price IDs existem

### Signature verification failed

Verifique se `PADDLE_WEBHOOK_SECRET` está correto e atualizado.

---

## Links Úteis

- [Paddle Sandbox Dashboard](https://sandbox-vendors.paddle.com)
- [Paddle Production Dashboard](https://vendors.paddle.com)
- [Paddle API Documentation](https://developer.paddle.com/api-reference)
- [Paddle.js Documentation](https://developer.paddle.com/paddlejs)
- [Webhook Events Reference](https://developer.paddle.com/webhooks/overview)
