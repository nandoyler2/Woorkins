import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um nome completo seguindo as regras:
 * - Primeira letra maiúscula de cada palavra
 * - "de", "da", "do", "dos", "das" ficam em minúsculo
 */
export function formatFullName(name: string | null | undefined): string {
  if (!name) return '';
  
  const lowercaseWords = ['de', 'da', 'do', 'dos', 'das'];
  
  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => {
      if (lowercaseWords.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Retorna o nome curto (Nome + Sobrenome)
 * Se o primeiro sobrenome for "de" ou "da", inclui também o próximo sobrenome
 */
export function formatShortName(name: string | null | undefined): string {
  if (!name) return '';
  
  const formatted = formatFullName(name);
  const parts = formatted.split(' ').filter(word => word.length > 0);
  
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  
  const firstName = parts[0];
  const firstLastName = parts[1];
  
  // Se o primeiro sobrenome for "de" ou "da", inclui o próximo também
  if ((firstLastName === 'de' || firstLastName === 'da') && parts.length > 2) {
    return `${firstName} ${firstLastName} ${parts[2]}`;
  }
  
  return `${firstName} ${firstLastName}`;
}

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

/**
 * Formata uma data para o timezone de São Paulo (America/Sao_Paulo)
 */
export function formatDateTimeSaoPaulo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Formata apenas a hora para o timezone de São Paulo
 */
export function formatTimeSaoPaulo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}
