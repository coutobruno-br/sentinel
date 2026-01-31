// Sentinel Landing Page - Internationalization
// Supports: English (en), Spanish (es), Portuguese-BR (pt-BR)

const translations = {
  en: {
    // Navigation
    'nav.features': 'Features',
    'nav.howItWorks': 'How it Works',
    'nav.pricing': 'Pricing',
    'nav.faq': 'FAQ',
    'nav.install': 'Install Free',

    // Hero
    'hero.badge': 'Policy-as-Code for GitHub',
    'hero.title': 'Compliance on <span class="gradient-text">Autopilot</span>',
    'hero.description': 'Automated, continuous compliance auditing for your repositories. Detect security issues, enforce policies, and generate immutable evidence — all without human intervention.',
    'hero.cta': 'Start Free Trial',
    'hero.ctaSecondary': 'See How it Works',
    'hero.stats.rules': 'Built-in Rules',
    'hero.stats.speed': 'Audit Speed',
    'hero.stats.automated': 'Automated',

    // Logos
    'logos.title': 'Works seamlessly with your stack',

    // Features
    'features.title': 'Everything you need for <span class="gradient-text">compliance automation</span>',
    'features.description': 'Sentinel monitors your repositories 24/7, enforcing policies and generating tamper-proof evidence automatically.',
    'features.item1.title': '5 Built-in Rules',
    'features.item1.description': 'Detect direct pushes to main, missing reviews, hardcoded secrets, missing tests, and license issues out of the box.',
    'features.item2.title': 'Immutable Evidence',
    'features.item2.description': 'Every audit generates a cryptographically signed, tamper-proof evidence record you can use for compliance reporting.',
    'features.item3.title': 'Real-time Auditing',
    'features.item3.description': 'Audits run automatically on every push and pull request. No manual triggers, no delays, no forgotten checks.',
    'features.item4.title': 'Zero Configuration',
    'features.item4.description': 'Install the GitHub App and you\'re done. Sentinel works immediately with sensible defaults. Customize later if needed.',
    'features.item5.title': 'Export Reports',
    'features.item5.description': 'Generate JSON and PDF reports for auditors, stakeholders, or compliance frameworks like SOC 2 and ISO 27001.',
    'features.item6.title': 'API Access',
    'features.item6.description': 'Full REST API to query audit results, evidence, and statistics. Integrate with your existing tools and dashboards.',

    // How it Works
    'howItWorks.title': 'How Sentinel <span class="gradient-text">Works</span>',
    'howItWorks.description': 'From installation to compliance report in three simple steps.',
    'howItWorks.step1.title': 'Install the GitHub App',
    'howItWorks.step1.description': 'Click "Install", select your repositories, and authorize. That\'s it — no configuration files, no CI changes, no tokens to manage.',
    'howItWorks.step2.title': 'Push Code as Usual',
    'howItWorks.step2.description': 'Every push and pull request triggers an automatic audit. Sentinel analyzes your code against 5 compliance rules in under a second.',
    'howItWorks.step3.title': 'Get Evidence & Reports',
    'howItWorks.step3.description': 'Access immutable audit evidence via API or download PDF reports. Use them for compliance audits, security reviews, or stakeholder updates.',

    // Rules
    'rules.title': 'Built-in <span class="gradient-text">Compliance Rules</span>',
    'rules.description': 'Five essential rules that cover the most common compliance requirements.',
    'rules.rule1': 'Detects direct pushes to protected branches (main/master). Enforces pull request workflow.',
    'rules.rule2': 'Ensures all merged PRs have at least one approval. Prevents unreviewed code from shipping.',
    'rules.rule3': 'Scans for hardcoded secrets, API keys, tokens, and credentials. 20+ patterns detected.',
    'rules.rule4': 'Checks if code changes include corresponding tests. Supports multiple languages and frameworks.',
    'rules.rule5': 'Verifies repository has a valid OSI-approved license. Essential for open source compliance.',

    // Pricing
    'pricing.title': 'Simple, <span class="gradient-text">Transparent Pricing</span>',
    'pricing.description': 'Start free, upgrade when you need more. No hidden fees, no surprises.',
    'pricing.period': '/month',
    'pricing.free.name': 'Free',
    'pricing.free.description': 'Perfect for trying Sentinel',
    'pricing.free.feature1': '50 executions/month',
    'pricing.free.feature2': 'Up to 3 repositories',
    'pricing.free.feature3': '7-day evidence retention',
    'pricing.free.feature4': 'All 5 built-in rules',
    'pricing.free.feature5': 'API access',
    'pricing.free.cta': 'Start Free',
    'pricing.pro.name': 'Pro',
    'pricing.pro.badge': 'Most Popular',
    'pricing.pro.description': 'For teams serious about compliance',
    'pricing.pro.feature1': '1,000 executions/month',
    'pricing.pro.feature2': 'Up to 25 repositories',
    'pricing.pro.feature3': '30-day evidence retention',
    'pricing.pro.feature4': 'PDF reports',
    'pricing.pro.feature5': 'Custom rules',
    'pricing.pro.feature6': 'Webhook notifications',
    'pricing.pro.cta': 'Start 14-day Trial',
    'pricing.enterprise.name': 'Enterprise',
    'pricing.enterprise.description': 'For large organizations',
    'pricing.enterprise.feature1': 'Unlimited executions',
    'pricing.enterprise.feature2': 'Unlimited repositories',
    'pricing.enterprise.feature3': '1-year evidence retention',
    'pricing.enterprise.feature4': 'Priority support',
    'pricing.enterprise.feature5': 'SSO / SAML (coming soon)',
    'pricing.enterprise.feature6': 'Dedicated account manager',
    'pricing.enterprise.cta': 'Contact Sales',

    // FAQ
    'faq.title': 'Frequently Asked <span class="gradient-text">Questions</span>',
    'faq.q1.question': 'What permissions does Sentinel need?',
    'faq.q1.answer': 'Sentinel only requires read access to your code and metadata, plus write access to create check runs and commit statuses. We never store your source code — only audit metadata and evidence hashes.',
    'faq.q2.question': 'Can I use Sentinel with private repositories?',
    'faq.q2.answer': 'Yes! Sentinel works with both public and private repositories. Your code stays private — we only process webhook events and never clone or store your repository contents.',
    'faq.q3.question': 'How long does an audit take?',
    'faq.q3.answer': 'Most audits complete in under 1 second. Sentinel processes webhook events in real-time, so you get immediate feedback on every push and pull request.',
    'faq.q4.question': 'Can I add custom rules?',
    'faq.q4.answer': 'Yes, on Pro and Enterprise plans. You can write custom rules in JavaScript/TypeScript to enforce organization-specific policies and compliance requirements.',
    'faq.q5.question': 'What happens if I exceed my plan limits?',
    'faq.q5.answer': 'We\'ll notify you when you\'re approaching your limit. If you exceed it, audits will pause until the next billing cycle or you upgrade. We\'ll never charge you unexpectedly.',
    'faq.q6.question': 'Is there a trial period?',
    'faq.q6.answer': 'Yes! Every new installation gets a 14-day trial with Pro features. No credit card required. After the trial, you can continue with the Free plan or upgrade.',

    // CTA
    'cta.title': 'Ready to automate your compliance?',
    'cta.description': 'Join teams who trust Sentinel to keep their repositories compliant. Start your free trial today.',
    'cta.button': 'Install Sentinel Free',

    // Footer
    'footer.tagline': 'Policy-as-Code Audit Engine',
    'footer.product': 'Product',
    'footer.resources': 'Resources',
    'footer.company': 'Company',
    'footer.documentation': 'Documentation',
    'footer.github': 'GitHub',
    'footer.api': 'API Reference',
    'footer.contact': 'Contact',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.copyright': '© 2024 Sentinel Engine. All rights reserved.'
  },

  es: {
    // Navigation
    'nav.features': 'Características',
    'nav.howItWorks': 'Cómo Funciona',
    'nav.pricing': 'Precios',
    'nav.faq': 'FAQ',
    'nav.install': 'Instalar Gratis',

    // Hero
    'hero.badge': 'Policy-as-Code para GitHub',
    'hero.title': 'Cumplimiento en <span class="gradient-text">Piloto Automático</span>',
    'hero.description': 'Auditoría de cumplimiento automatizada y continua para tus repositorios. Detecta problemas de seguridad, aplica políticas y genera evidencia inmutable — todo sin intervención humana.',
    'hero.cta': 'Prueba Gratis',
    'hero.ctaSecondary': 'Ver Cómo Funciona',
    'hero.stats.rules': 'Reglas Incluidas',
    'hero.stats.speed': 'Velocidad',
    'hero.stats.automated': 'Automatizado',

    // Logos
    'logos.title': 'Funciona perfectamente con tu stack',

    // Features
    'features.title': 'Todo lo que necesitas para <span class="gradient-text">automatizar el cumplimiento</span>',
    'features.description': 'Sentinel monitorea tus repositorios 24/7, aplicando políticas y generando evidencia a prueba de manipulación automáticamente.',
    'features.item1.title': '5 Reglas Incluidas',
    'features.item1.description': 'Detecta pushes directos a main, reviews faltantes, secretos hardcodeados, tests faltantes y problemas de licencia.',
    'features.item2.title': 'Evidencia Inmutable',
    'features.item2.description': 'Cada auditoría genera un registro de evidencia firmado criptográficamente que puedes usar para reportes de cumplimiento.',
    'features.item3.title': 'Auditoría en Tiempo Real',
    'features.item3.description': 'Las auditorías se ejecutan automáticamente en cada push y pull request. Sin triggers manuales, sin demoras.',
    'features.item4.title': 'Cero Configuración',
    'features.item4.description': 'Instala la GitHub App y listo. Sentinel funciona inmediatamente con configuraciones sensatas. Personaliza después si lo necesitas.',
    'features.item5.title': 'Exportar Reportes',
    'features.item5.description': 'Genera reportes JSON y PDF para auditores, stakeholders o frameworks de cumplimiento como SOC 2 e ISO 27001.',
    'features.item6.title': 'Acceso API',
    'features.item6.description': 'API REST completa para consultar resultados de auditoría, evidencia y estadísticas. Integra con tus herramientas existentes.',

    // How it Works
    'howItWorks.title': 'Cómo <span class="gradient-text">Funciona</span> Sentinel',
    'howItWorks.description': 'De la instalación al reporte de cumplimiento en tres simples pasos.',
    'howItWorks.step1.title': 'Instala la GitHub App',
    'howItWorks.step1.description': 'Haz clic en "Instalar", selecciona tus repositorios y autoriza. Eso es todo — sin archivos de configuración, sin cambios de CI, sin tokens que manejar.',
    'howItWorks.step2.title': 'Haz Push Como Siempre',
    'howItWorks.step2.description': 'Cada push y pull request activa una auditoría automática. Sentinel analiza tu código contra 5 reglas de cumplimiento en menos de un segundo.',
    'howItWorks.step3.title': 'Obtén Evidencia y Reportes',
    'howItWorks.step3.description': 'Accede a evidencia de auditoría inmutable vía API o descarga reportes PDF. Úsalos para auditorías de cumplimiento o revisiones de seguridad.',

    // Rules
    'rules.title': 'Reglas de <span class="gradient-text">Cumplimiento</span> Incluidas',
    'rules.description': 'Cinco reglas esenciales que cubren los requisitos de cumplimiento más comunes.',
    'rules.rule1': 'Detecta pushes directos a branches protegidos (main/master). Aplica el flujo de pull request.',
    'rules.rule2': 'Asegura que todos los PRs mergeados tengan al menos una aprobación. Previene código sin revisar.',
    'rules.rule3': 'Escanea secretos hardcodeados, API keys, tokens y credenciales. 20+ patrones detectados.',
    'rules.rule4': 'Verifica si los cambios de código incluyen tests correspondientes. Soporta múltiples lenguajes.',
    'rules.rule5': 'Verifica que el repositorio tenga una licencia OSI válida. Esencial para cumplimiento open source.',

    // Pricing
    'pricing.title': 'Precios <span class="gradient-text">Simples y Transparentes</span>',
    'pricing.description': 'Comienza gratis, actualiza cuando necesites más. Sin tarifas ocultas, sin sorpresas.',
    'pricing.period': '/mes',
    'pricing.free.name': 'Gratis',
    'pricing.free.description': 'Perfecto para probar Sentinel',
    'pricing.free.feature1': '50 ejecuciones/mes',
    'pricing.free.feature2': 'Hasta 3 repositorios',
    'pricing.free.feature3': '7 días de retención',
    'pricing.free.feature4': 'Las 5 reglas incluidas',
    'pricing.free.feature5': 'Acceso API',
    'pricing.free.cta': 'Comenzar Gratis',
    'pricing.pro.name': 'Pro',
    'pricing.pro.badge': 'Más Popular',
    'pricing.pro.description': 'Para equipos serios sobre cumplimiento',
    'pricing.pro.feature1': '1,000 ejecuciones/mes',
    'pricing.pro.feature2': 'Hasta 25 repositorios',
    'pricing.pro.feature3': '30 días de retención',
    'pricing.pro.feature4': 'Reportes PDF',
    'pricing.pro.feature5': 'Reglas personalizadas',
    'pricing.pro.feature6': 'Notificaciones webhook',
    'pricing.pro.cta': 'Prueba 14 Días',
    'pricing.enterprise.name': 'Enterprise',
    'pricing.enterprise.description': 'Para grandes organizaciones',
    'pricing.enterprise.feature1': 'Ejecuciones ilimitadas',
    'pricing.enterprise.feature2': 'Repositorios ilimitados',
    'pricing.enterprise.feature3': '1 año de retención',
    'pricing.enterprise.feature4': 'Soporte prioritario',
    'pricing.enterprise.feature5': 'SSO / SAML (próximamente)',
    'pricing.enterprise.feature6': 'Account manager dedicado',
    'pricing.enterprise.cta': 'Contactar Ventas',

    // FAQ
    'faq.title': 'Preguntas <span class="gradient-text">Frecuentes</span>',
    'faq.q1.question': '¿Qué permisos necesita Sentinel?',
    'faq.q1.answer': 'Sentinel solo requiere acceso de lectura a tu código y metadata, más acceso de escritura para crear check runs y estados de commit. Nunca almacenamos tu código fuente — solo metadata de auditoría y hashes de evidencia.',
    'faq.q2.question': '¿Puedo usar Sentinel con repositorios privados?',
    'faq.q2.answer': '¡Sí! Sentinel funciona con repositorios públicos y privados. Tu código permanece privado — solo procesamos eventos webhook y nunca clonamos o almacenamos el contenido de tu repositorio.',
    'faq.q3.question': '¿Cuánto tiempo toma una auditoría?',
    'faq.q3.answer': 'La mayoría de las auditorías se completan en menos de 1 segundo. Sentinel procesa eventos webhook en tiempo real, así que obtienes feedback inmediato en cada push y pull request.',
    'faq.q4.question': '¿Puedo agregar reglas personalizadas?',
    'faq.q4.answer': 'Sí, en los planes Pro y Enterprise. Puedes escribir reglas personalizadas en JavaScript/TypeScript para aplicar políticas específicas de tu organización.',
    'faq.q5.question': '¿Qué pasa si excedo los límites de mi plan?',
    'faq.q5.answer': 'Te notificaremos cuando te acerques a tu límite. Si lo excedes, las auditorías se pausarán hasta el siguiente ciclo de facturación o actualices. Nunca te cobraremos inesperadamente.',
    'faq.q6.question': '¿Hay período de prueba?',
    'faq.q6.answer': '¡Sí! Cada nueva instalación obtiene una prueba de 14 días con características Pro. Sin tarjeta de crédito. Después de la prueba, puedes continuar con el plan Gratis o actualizar.',

    // CTA
    'cta.title': '¿Listo para automatizar tu cumplimiento?',
    'cta.description': 'Únete a los equipos que confían en Sentinel para mantener sus repositorios en cumplimiento. Comienza tu prueba gratis hoy.',
    'cta.button': 'Instalar Sentinel Gratis',

    // Footer
    'footer.tagline': 'Motor de Auditoría Policy-as-Code',
    'footer.product': 'Producto',
    'footer.resources': 'Recursos',
    'footer.company': 'Compañía',
    'footer.documentation': 'Documentación',
    'footer.github': 'GitHub',
    'footer.api': 'Referencia API',
    'footer.contact': 'Contacto',
    'footer.privacy': 'Política de Privacidad',
    'footer.terms': 'Términos de Servicio',
    'footer.copyright': '© 2024 Sentinel Engine. Todos los derechos reservados.'
  },

  'pt-BR': {
    // Navigation
    'nav.features': 'Recursos',
    'nav.howItWorks': 'Como Funciona',
    'nav.pricing': 'Preços',
    'nav.faq': 'FAQ',
    'nav.install': 'Instalar Grátis',

    // Hero
    'hero.badge': 'Policy-as-Code para GitHub',
    'hero.title': 'Compliance no <span class="gradient-text">Piloto Automático</span>',
    'hero.description': 'Auditoria de compliance automatizada e contínua para seus repositórios. Detecte problemas de segurança, aplique políticas e gere evidências imutáveis — tudo sem intervenção humana.',
    'hero.cta': 'Testar Grátis',
    'hero.ctaSecondary': 'Ver Como Funciona',
    'hero.stats.rules': 'Regras Incluídas',
    'hero.stats.speed': 'Velocidade',
    'hero.stats.automated': 'Automatizado',

    // Logos
    'logos.title': 'Funciona perfeitamente com sua stack',

    // Features
    'features.title': 'Tudo que você precisa para <span class="gradient-text">automatizar compliance</span>',
    'features.description': 'Sentinel monitora seus repositórios 24/7, aplicando políticas e gerando evidências à prova de adulteração automaticamente.',
    'features.item1.title': '5 Regras Incluídas',
    'features.item1.description': 'Detecte pushes diretos na main, reviews faltando, secrets hardcoded, testes faltando e problemas de licença.',
    'features.item2.title': 'Evidência Imutável',
    'features.item2.description': 'Cada auditoria gera um registro de evidência assinado criptograficamente que você pode usar para relatórios de compliance.',
    'features.item3.title': 'Auditoria em Tempo Real',
    'features.item3.description': 'As auditorias executam automaticamente em cada push e pull request. Sem triggers manuais, sem atrasos.',
    'features.item4.title': 'Zero Configuração',
    'features.item4.description': 'Instale o GitHub App e pronto. Sentinel funciona imediatamente com configurações sensatas. Personalize depois se precisar.',
    'features.item5.title': 'Exportar Relatórios',
    'features.item5.description': 'Gere relatórios JSON e PDF para auditores, stakeholders ou frameworks de compliance como SOC 2 e ISO 27001.',
    'features.item6.title': 'Acesso API',
    'features.item6.description': 'API REST completa para consultar resultados de auditoria, evidências e estatísticas. Integre com suas ferramentas existentes.',

    // How it Works
    'howItWorks.title': 'Como o Sentinel <span class="gradient-text">Funciona</span>',
    'howItWorks.description': 'Da instalação ao relatório de compliance em três passos simples.',
    'howItWorks.step1.title': 'Instale o GitHub App',
    'howItWorks.step1.description': 'Clique em "Instalar", selecione seus repositórios e autorize. É isso — sem arquivos de configuração, sem mudanças de CI, sem tokens para gerenciar.',
    'howItWorks.step2.title': 'Faça Push Normalmente',
    'howItWorks.step2.description': 'Cada push e pull request dispara uma auditoria automática. Sentinel analisa seu código contra 5 regras de compliance em menos de um segundo.',
    'howItWorks.step3.title': 'Obtenha Evidências e Relatórios',
    'howItWorks.step3.description': 'Acesse evidências de auditoria imutáveis via API ou baixe relatórios PDF. Use-os para auditorias de compliance ou revisões de segurança.',

    // Rules
    'rules.title': 'Regras de <span class="gradient-text">Compliance</span> Incluídas',
    'rules.description': 'Cinco regras essenciais que cobrem os requisitos de compliance mais comuns.',
    'rules.rule1': 'Detecta pushes diretos em branches protegidos (main/master). Aplica o fluxo de pull request.',
    'rules.rule2': 'Garante que todos os PRs mergeados tenham pelo menos uma aprovação. Previne código não revisado.',
    'rules.rule3': 'Escaneia secrets hardcoded, API keys, tokens e credenciais. 20+ padrões detectados.',
    'rules.rule4': 'Verifica se as mudanças de código incluem testes correspondentes. Suporta múltiplas linguagens.',
    'rules.rule5': 'Verifica se o repositório tem uma licença OSI válida. Essencial para compliance open source.',

    // Pricing
    'pricing.title': 'Preços <span class="gradient-text">Simples e Transparentes</span>',
    'pricing.description': 'Comece grátis, faça upgrade quando precisar. Sem taxas ocultas, sem surpresas.',
    'pricing.period': '/mês',
    'pricing.free.name': 'Grátis',
    'pricing.free.description': 'Perfeito para testar o Sentinel',
    'pricing.free.feature1': '50 execuções/mês',
    'pricing.free.feature2': 'Até 3 repositórios',
    'pricing.free.feature3': '7 dias de retenção',
    'pricing.free.feature4': 'Todas as 5 regras incluídas',
    'pricing.free.feature5': 'Acesso API',
    'pricing.free.cta': 'Começar Grátis',
    'pricing.pro.name': 'Pro',
    'pricing.pro.badge': 'Mais Popular',
    'pricing.pro.description': 'Para times sérios sobre compliance',
    'pricing.pro.feature1': '1.000 execuções/mês',
    'pricing.pro.feature2': 'Até 25 repositórios',
    'pricing.pro.feature3': '30 dias de retenção',
    'pricing.pro.feature4': 'Relatórios PDF',
    'pricing.pro.feature5': 'Regras personalizadas',
    'pricing.pro.feature6': 'Notificações webhook',
    'pricing.pro.cta': 'Testar 14 Dias',
    'pricing.enterprise.name': 'Enterprise',
    'pricing.enterprise.description': 'Para grandes organizações',
    'pricing.enterprise.feature1': 'Execuções ilimitadas',
    'pricing.enterprise.feature2': 'Repositórios ilimitados',
    'pricing.enterprise.feature3': '1 ano de retenção',
    'pricing.enterprise.feature4': 'Suporte prioritário',
    'pricing.enterprise.feature5': 'SSO / SAML (em breve)',
    'pricing.enterprise.feature6': 'Account manager dedicado',
    'pricing.enterprise.cta': 'Falar com Vendas',

    // FAQ
    'faq.title': 'Perguntas <span class="gradient-text">Frequentes</span>',
    'faq.q1.question': 'Quais permissões o Sentinel precisa?',
    'faq.q1.answer': 'Sentinel só requer acesso de leitura ao seu código e metadata, mais acesso de escrita para criar check runs e status de commit. Nunca armazenamos seu código fonte — apenas metadata de auditoria e hashes de evidência.',
    'faq.q2.question': 'Posso usar o Sentinel com repositórios privados?',
    'faq.q2.answer': 'Sim! Sentinel funciona com repositórios públicos e privados. Seu código permanece privado — só processamos eventos de webhook e nunca clonamos ou armazenamos o conteúdo do seu repositório.',
    'faq.q3.question': 'Quanto tempo leva uma auditoria?',
    'faq.q3.answer': 'A maioria das auditorias completa em menos de 1 segundo. Sentinel processa eventos de webhook em tempo real, então você recebe feedback imediato em cada push e pull request.',
    'faq.q4.question': 'Posso adicionar regras personalizadas?',
    'faq.q4.answer': 'Sim, nos planos Pro e Enterprise. Você pode escrever regras personalizadas em JavaScript/TypeScript para aplicar políticas específicas da sua organização.',
    'faq.q5.question': 'O que acontece se eu exceder os limites do meu plano?',
    'faq.q5.answer': 'Vamos notificá-lo quando você estiver se aproximando do seu limite. Se exceder, as auditorias serão pausadas até o próximo ciclo de cobrança ou você fazer upgrade. Nunca vamos cobrar você inesperadamente.',
    'faq.q6.question': 'Existe período de teste?',
    'faq.q6.answer': 'Sim! Cada nova instalação ganha um teste de 14 dias com recursos Pro. Sem cartão de crédito. Após o teste, você pode continuar com o plano Grátis ou fazer upgrade.',

    // CTA
    'cta.title': 'Pronto para automatizar seu compliance?',
    'cta.description': 'Junte-se aos times que confiam no Sentinel para manter seus repositórios em conformidade. Comece seu teste grátis hoje.',
    'cta.button': 'Instalar Sentinel Grátis',

    // Footer
    'footer.tagline': 'Motor de Auditoria Policy-as-Code',
    'footer.product': 'Produto',
    'footer.resources': 'Recursos',
    'footer.company': 'Empresa',
    'footer.documentation': 'Documentação',
    'footer.github': 'GitHub',
    'footer.api': 'Referência API',
    'footer.contact': 'Contato',
    'footer.privacy': 'Política de Privacidade',
    'footer.terms': 'Termos de Serviço',
    'footer.copyright': '© 2024 Sentinel Engine. Todos os direitos reservados.'
  }
};

// i18n Module
const i18n = {
  currentLang: 'en',

  init() {
    // Get language from URL, localStorage, or browser
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    const storedLang = localStorage.getItem('sentinel-lang');
    const browserLang = navigator.language;

    let lang = 'en';

    if (urlLang && translations[urlLang]) {
      lang = urlLang;
    } else if (storedLang && translations[storedLang]) {
      lang = storedLang;
    } else if (browserLang.startsWith('pt')) {
      lang = 'pt-BR';
    } else if (browserLang.startsWith('es')) {
      lang = 'es';
    }

    this.setLanguage(lang);
  },

  setLanguage(lang) {
    if (!translations[lang]) {
      console.warn(`Language ${lang} not found, falling back to English`);
      lang = 'en';
    }

    this.currentLang = lang;
    localStorage.setItem('sentinel-lang', lang);

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Update all translatable elements
    this.updateAllTranslations();

    // Update language selector UI
    this.updateLanguageSelector();
  },

  t(key) {
    const value = translations[this.currentLang]?.[key] || translations.en[key] || key;
    return value;
  },

  updateAllTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);

      // Check if translation contains HTML
      if (translation.includes('<')) {
        el.innerHTML = translation;
      } else {
        el.textContent = translation;
      }
    });
  },

  updateLanguageSelector() {
    const langBtn = document.getElementById('langBtn');
    const langOptions = document.querySelectorAll('.lang-option');

    if (langBtn) {
      const langCode = this.currentLang === 'pt-BR' ? 'PT' : this.currentLang.toUpperCase();
      langBtn.querySelector('.lang-code').textContent = langCode;

      const flags = { en: '🇺🇸', es: '🇪🇸', 'pt-BR': '🇧🇷' };
      langBtn.querySelector('.lang-flag').textContent = flags[this.currentLang] || '🌐';
    }

    langOptions.forEach(option => {
      const optionLang = option.getAttribute('data-lang');
      option.classList.toggle('active', optionLang === this.currentLang);
    });
  }
};

// Export for use in app.js
window.i18n = i18n;
