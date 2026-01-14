# Sentinel — Project Charter

## 1. Identificação do Projeto

**Nome do Projeto:** Sentinel
**Produto:** Sentinel — Policy-as-Code Audit Engine
**Tipo:** Produto de infraestrutura (B2B / B2I)
**Modelo:** SaaS recorrente, cobrança por ativo monitorado

---

## 2. Justificativa do Projeto

A crescente automação de software, a pressão regulatória e a redução de times operacionais criaram uma lacuna estrutural:

Sistemas críticos evoluem rapidamente, mas os mecanismos de controle continuam manuais, tardios e frágeis.

Sentinel nasce para substituir controles humanos por **enforcement técnico contínuo**, reduzindo risco operacional, custo de auditoria e falhas de compliance.

---

## 3. Objetivo Geral

Construir e operar um motor de auditoria contínua baseado em Policy-as-Code que:

* execute automaticamente por eventos
* gere evidência auditável
* aplique enforcement técnico
* produza receita recorrente previsível

---

## 4. Objetivos Específicos

* Auditar repositórios Git de forma contínua
* Detectar violações técnicas automaticamente
* Gerar relatórios versionados e verificáveis
* Cobrar recorrência por ativo sem interação humana
* Operar com manutenção mínima

---

## 5. Escopo do Projeto

### Dentro do Escopo (MVP)

* GitHub App
* Motor de regras determinístico
* Policies em YAML
* Relatórios JSON e PDF
* Billing e enforcement automático

### Fora do Escopo

* Dashboards complexos
* Consultoria ou serviços humanos
* Customizações específicas por cliente
* Gestão manual de compliance

---

## 6. Stakeholders

* **Sponsor:** Fundador / Owner do produto
* **Usuários indiretos:** Sistemas, repositórios, pipelines
* **Compradores:** Organizações de software
* **Plataformas:** GitHub, provedores cloud

---

## 7. Premissas

* Integ
