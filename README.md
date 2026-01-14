
# Sentinel

**Sentinel — Policy-as-Code Audit Engine**

Sentinel é um motor de auditoria contínua orientado a eventos que transforma compliance, segurança e governança em propriedades automáticas do sistema.

Não há dashboards. Não há operação humana contínua. Apenas execução determinística, enforcement técnico e evidência auditável.

---

## What Sentinel Does

* Audita repositórios de código continuamente
* Executa regras técnicas como Policy-as-Code
* Detecta violações automaticamente
* Gera evidência técnica verificável
* Aplica enforcement sem intervenção humana

Sentinel roda sempre que o sistema muda.

---

## Core Concepts

* **Asset**: unidade técnica monitorada (ex: repositório)
* **Policy**: regra declarativa executável
* **Execution**: auditoria disparada por evento
* **Violation**: falha detectada
* **Evidence**: prova técnica gerada

Todos os conceitos são determinísticos e versionáveis.

---

## How It Works

1. Um evento ocorre no repositório (push, PR, merge)
2. O webhook do Sentinel é acionado
3. O motor executa as policies configuradas
4. Violações são detectadas
5. Evidência é gerada e armazenada
6. O uso é contabilizado automaticamente

Nenhuma etapa depende de ação humana.

---

## Supported Policies (MVP)

* Commit direto em branch protegida
* Pull request sem aprovação mínima
* Secrets hardcoded
* Ausência de testes automatizados
* Licença ausente ou inválida

---

## Installation

Sentinel é distribuído como um **GitHub App**.

1. Instale o app Sentinel Audit
2. Selecione a organização ou repositório
3. Conceda as permissões mínimas solicitadas

A auditoria inicia automaticamente.

---

## Configuration (Optional)

Crie um arquivo `policy.yml` no repositório:

```yaml
version: 1
policies:
  - id: no-direct-main
    enabled: true
  - id: secrets-scan
    enabled: true
```

Na ausência do arquivo, as políticas padrão são aplicadas.

---

## Reports

Cada execução gera um relatório:

* **JSON**: formato canônico
* **PDF**: renderização para auditoria

Relatórios:

* são versionados
* possuem hash de evidência
* são reproduzíveis

---

## Billing Model

* Cobrança recorrente por asset monitorado
* Trial automático com limite de execuções
* Suspensão técnica em caso de inadimplência

Billing é parte do pipeline, não um processo externo.

---

## Security Model

* Princípio do menor privilégio
* Nenhum código-fonte é armazenado
* Regras puras, sem execução arbitrária
* Logs estruturados sem dados sensíveis

---

## Failure Model

* Nenhuma falha é silenciosa
* Execuções são idempotentes
* Retentativas automáticas com backoff
* Evidência sempre precede resultado

---

## What Sentinel Is Not

* Não é ferramenta de gestão
* Não é dashboard de métricas
* Não é consultoria
* Não é auditor humano automatizado

---

## Philosophy

Compliance não é um processo.

É uma propriedade do sistema.

Sentinel existe para garantir isso.

--------------------------

sentinel-engine/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
│
├── src/
│   ├── sentinel/
│   │   ├── engine/
│   │   │   ├── SentinelEngine.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── rules/
│   │   │   ├── noDirectMainRule.ts
│   │   │   ├── prReviewRequiredRule.ts
│   │   │   ├── secretsScanRule.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── webhook/
│   │   │   ├── githubWebhook.ts
│   │   │   └── verifySignature.ts
│   │   │
│   │   ├── execution/
│   │   │   ├── pipeline.ts
│   │   │   └── contextBuilder.ts
│   │   │
│   │   ├── persistence/
│   │   │   ├── executionRepository.ts
│   │   │   ├── violationRepository.ts
│   │   │   └── assetRepository.ts
│   │   │
│   │   ├── billing/
│   │   │   ├── metering.ts
│   │   │   ├── plans.ts
│   │   │   └── enforcement.ts
│   │   │
│   │   ├── reporting/
│   │   │   ├── reportBuilder.ts
│   │   │   ├── pdfRenderer.ts
│   │   │   └── hashEvidence.ts
│   │   │
│   │   └── config/
│   │       ├── defaultPolicies.ts
│   │       └── policyLoader.ts
│   │
│   └── server.ts
│
├── tests/
│   ├── engine.test.ts
│   ├── rules.test.ts
│   └── webhook.test.ts
│
└── docs/
    ├── architecture.md
    ├── policy-schema.md
    └── execution-flow.md
