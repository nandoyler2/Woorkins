export const translations = {
  pt: {
    // Navigation
    home: 'Início',
    discover: 'Descobrir',
    feed: 'Feed',
    messages: 'Mensagens',
    profile: 'Perfil',
    login: 'Entrar',
    signup: 'Cadastrar',
    logout: 'Sair',
    
    // Hero
    hero_title: 'Conecte. Trabalhe. Confie.',
    hero_subtitle: 'A plataforma profissional que une consumidores e empresas em um ecossistema de credibilidade',
    hero_cta: 'Comece Agora',
    hero_cta_business: 'Sou Empresa',
    
    // Features
    features_title: 'Como Funciona',
    feature_evaluate: 'Avalie',
    feature_evaluate_desc: 'Elogios, reclamações e sugestões com total transparência',
    feature_connect: 'Conecte',
    feature_connect_desc: 'Siga empresas, veja stories e portfólios profissionais',
    feature_negotiate: 'Negocie',
    feature_negotiate_desc: 'Chat seguro, propostas e acordos com registro',
    
    // For Business
    business_title: 'Para Empresas',
    business_desc: 'Crie seu perfil profissional, mostre seu trabalho e construa confiança',
    
    // Auth
    email: 'E-mail',
    password: 'Senha',
    full_name: 'Nome Completo',
    already_have_account: 'Já tem conta?',
    dont_have_account: 'Não tem conta?',
    sign_in_here: 'Entre aqui',
    sign_up_here: 'Cadastre-se',
  },
  en: {
    // Navigation
    home: 'Home',
    discover: 'Discover',
    feed: 'Feed',
    messages: 'Messages',
    profile: 'Profile',
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
    
    // Hero
    hero_title: 'Connect. Work. Trust.',
    hero_subtitle: 'The professional platform that brings consumers and businesses together in a credibility ecosystem',
    hero_cta: 'Get Started',
    hero_cta_business: "I'm a Business",
    
    // Features
    features_title: 'How It Works',
    feature_evaluate: 'Evaluate',
    feature_evaluate_desc: 'Praise, complaints and suggestions with full transparency',
    feature_connect: 'Connect',
    feature_connect_desc: 'Follow companies, view stories and professional portfolios',
    feature_negotiate: 'Negotiate',
    feature_negotiate_desc: 'Secure chat, proposals and agreements on record',
    
    // For Business
    business_title: 'For Businesses',
    business_desc: 'Create your professional profile, showcase your work and build trust',
    
    // Auth
    email: 'Email',
    password: 'Password',
    full_name: 'Full Name',
    already_have_account: 'Already have an account?',
    dont_have_account: "Don't have an account?",
    sign_in_here: 'Sign in here',
    sign_up_here: 'Sign up',
  },
  es: {
    // Navigation
    home: 'Inicio',
    discover: 'Descubrir',
    feed: 'Feed',
    messages: 'Mensajes',
    profile: 'Perfil',
    login: 'Ingresar',
    signup: 'Registrarse',
    logout: 'Salir',
    
    // Hero
    hero_title: 'Conecta. Trabaja. Confía.',
    hero_subtitle: 'La plataforma profesional que une consumidores y empresas en un ecosistema de credibilidad',
    hero_cta: 'Comenzar Ahora',
    hero_cta_business: 'Soy Empresa',
    
    // Features
    features_title: 'Cómo Funciona',
    feature_evaluate: 'Evalúa',
    feature_evaluate_desc: 'Elogios, quejas y sugerencias con total transparencia',
    feature_connect: 'Conecta',
    feature_connect_desc: 'Sigue empresas, ve historias y portafolios profesionales',
    feature_negotiate: 'Negocia',
    feature_negotiate_desc: 'Chat seguro, propuestas y acuerdos registrados',
    
    // For Business
    business_title: 'Para Empresas',
    business_desc: 'Crea tu perfil profesional, muestra tu trabajo y construye confianza',
    
    // Auth
    email: 'Correo',
    password: 'Contraseña',
    full_name: 'Nombre Completo',
    already_have_account: '¿Ya tienes cuenta?',
    dont_have_account: '¿No tienes cuenta?',
    sign_in_here: 'Ingresa aquí',
    sign_up_here: 'Regístrate',
  }
};

export type Language = 'pt' | 'en' | 'es';
export type TranslationKey = keyof typeof translations.pt;
