# Sentinel — Glossary

Este glossário define termos canônicos usados no projeto Sentinel. Os termos abaixo são normativos. Ambiguidade semântica é considerada erro de projeto.

---

## Asset

Unidade técnica monitorada e faturável pelo Sentinel.

Exemplos:

* Repositório Git
* Organização Git
* (Futuro) Smart contract

Um asset possui ciclo de vida próprio e plano associado.

---

## Audit Execution

Execução única do motor Sentinel iniciada por um evento.

Características:

* Determinística
* Idempotente
* Versionada
* Gera evidência obrigatória

---

## Policy

Regra técnica expressa como código declarativo.

Características:

* Avaliável automaticamente
* Não executa IO
* Não possui estado
* Produz resultado binário (pass/fail)

---

## Policy-as-Code

Abordagem onde regras técnicas, operacionais ou regulatórias são expressas como código executável e versionável.

No Sentinel, Policy-as-Code é declarativo, determinístico e auditável.

---

## Rule

Implementação concreta de uma Policy no motor Sentinel.

Uma Rule:

* Implementa uma interface fixa
* Avalia um contexto
* Retorna um resultado puro

---

## Execution Context

Conjunto de dados imutáveis usados por uma Rule durante uma execução.

Inclui:

* Metadados do repositório
* Informações de commit
* Arquivos analisáveis
* Configuração de policies

---

## Violation

Resultado negativo da avaliação de uma Policy.

Toda Violation:

* Possui severidade
* Possui evidência associada
* É persistida
* É reportável

---

## Severity

Classificação do impacto de uma Violation.

Níveis canônicos:

* low
* medium
* high
* critical

---

## Evidence

Prova técnica gerada durante uma Audit Execution.

Características:

* Reprodutível
* Hashável
* Não opinativa
* Associada a uma Violation

---

## Evidence Hash

Hash criptográfico da evidência gerada.

Usado para:

* Garantir integridade
* Provar imutabilidade lógica
* Correlacionar relatórios

---

## Enforcement

Aplicação técnica de uma decisão do Sentinel.

Exemplos:

* Bloqueio de execução
* Suspensão do asset
* Interrupção por inadimplência

Enforcement não depende de contrato humano.

---

## Billing

Sistema de medição, cobrança e suspensão automática.

No Sentinel:

* Baseado em uso
* Acoplado ao execution pipeline
* Imediato

---

## Trial

Período inicial de uso limitado.

Características:

* Número fixo de execuções
* Expiração automática
* Conversão implícita para plano pago

---

## Idempotency

Garantia de que múltiplas execuções do mesmo evento produzem o mesmo resultado sem efeitos colaterais adicionais.

---

## Determinism

Propriedade onde a mesma entrada sempre gera a mesma saída.

No Sentinel, determinismo é obrigatório.

---

## Report

Artefato final gerado por uma Audit Execution.

Formatos:

* JSON (canônico)
* PDF (renderização)

Relatórios são versionados e verificáveis.

---

## Webhook

Mecanismo de entrada baseado em eventos externos.

No Sentinel, webhooks:

* São validados
* São idempotentes
* Disparam Audit Executions

---

## Engine

Núcleo do Sentinel responsável por executar policies.

Não possui:

* UI
* Estado persistente
* Dependência externa

---

## Marketplace

Canal de distribuição automatizado do Sentinel.

Exemplo:

* GitHub Marketplace

Responsável por:

* Descoberta
* Instalação
* Billing primário

---

## Sentinel

Produto que materializa todos os conceitos acima.

Sentinel

Produto que materializa todos os conceitos acima.

Sentinel não é uma ferramenta. É uma propriedade operacional do sistema auditado.
