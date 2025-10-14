# Guia de Configuração Efí Pay

Este documento contém as instruções completas para configurar o Efí Pay na plataforma.

## 📋 Pré-requisitos

1. Conta ativa no Efí Pay (antigo Gerencianet)
2. Credenciais de API (Client ID e Client Secret)
3. Certificado PIX (.p12) para ambiente de produção
4. Chave PIX cadastrada no Efí Pay

## 🔑 Passo 1: Adicionar Credenciais

As credenciais do Efí Pay devem ser adicionadas como secrets no backend:

1. **EFI_CLIENT_ID**: ID do cliente fornecido pelo Efí Pay
2. **EFI_CLIENT_SECRET**: Secret do cliente fornecido pelo Efí Pay

Para adicionar os secrets:
1. Acesse o painel administrativo
2. Navegue até Gateway de Pagamento
3. As credenciais já foram configuradas automaticamente como variáveis de ambiente

## ⚙️ Passo 2: Configurar no Painel Admin

Acesse o painel administrativo em `/admin/payment-gateway` e configure:

### Gateway Ativo
- Selecione "Efí Pay" no dropdown de Gateway Ativo
- Isso desativará automaticamente o Stripe

### Configurações PIX
1. **Chave PIX**: Insira a chave PIX cadastrada no Efí
2. **Tipo de Chave**: Selecione o tipo (CPF, CNPJ, Email, Telefone ou Aleatória)
3. **Certificado PIX**: Faça upload do arquivo .p12 fornecido pelo Efí
4. **Desconto PIX**: Configure um desconto opcional para pagamentos via PIX (%)
5. **Tempo de Vencimento**: Defina quantas horas o PIX ficará válido (padrão: 24h)
6. **Validar mTLS**: Ative para validação mTLS (requerido pelo Banco Central)

### Configurações Cartão de Crédito
1. **Desconto Cartão**: Configure um desconto opcional para pagamentos via cartão (%)

## 🔗 Passo 3: Configurar Webhooks no Efí Pay

Para receber notificações de pagamentos, você precisa configurar o webhook no painel do Efí Pay:

### URL do Webhook PIX
```
https://bvjulkcmzfzyfwobwlnx.supabase.co/functions/v1/efi-webhook
```

### URL do Webhook Cobranças (Cartão)
```
https://bvjulkcmzfzyfwobwlnx.supabase.co/functions/v1/efi-webhook
```

### Configuração mTLS (PIX)

Para configurar o mTLS no seu servidor (requerido pelo Banco Central):

1. Baixe o certificado público do Efí Pay:
   - **Produção**: https://certificados.efipay.com.br/webhooks/certificate-chain-prod.crt
   - **Sandbox**: https://certificados.efipay.com.br/webhooks/certificate-chain-homolog.crt

2. Configure seu servidor para aceitar conexões com este certificado

## 📡 Endpoints Disponíveis

### Criar Cobrança PIX
- **Função**: `efi-create-pix-charge`
- **Autenticação**: Requerida
- **Resposta**: QR Code e código PIX copia e cola

### Criar Cobrança Cartão
- **Função**: `efi-create-card-charge`
- **Autenticação**: Requerida
- **Resposta**: Status da transação

### Webhook
- **Função**: `efi-webhook`
- **Autenticação**: Não requerida (validação via certificado)
- **Ação**: Atualiza status de pagamentos automaticamente

## 🧪 Testes

### Testar PIX
1. No checkout, selecione PIX
2. Preencha os dados do cliente
3. Clique em "Gerar QR Code PIX"
4. Escaneie o QR Code ou use o código copia e cola
5. Realize o pagamento no app do seu banco
6. O webhook atualizará automaticamente o status

### Testar Cartão
1. No checkout, selecione Cartão de Crédito
2. Preencha os dados do cliente e do cartão
3. Selecione o número de parcelas
4. Clique em "Pagar com Cartão"
5. Aguarde a confirmação

## 📊 Monitoramento

Para monitorar os pagamentos:

1. Acesse os logs das edge functions no painel do Supabase
2. Verifique os logs de:
   - `efi-create-pix-charge`
   - `efi-create-card-charge`
   - `efi-webhook`

## 🔄 Alternando entre Stripe e Efí Pay

Para voltar ao Stripe:
1. Acesse `/admin/payment-gateway`
2. Selecione "Stripe" no dropdown de Gateway Ativo
3. Salve as configurações

**Importante**: Apenas um gateway pode estar ativo por vez. Quando você ativa um, o outro é automaticamente desativado.

## 🆘 Suporte

Para dúvidas ou problemas:
- Documentação Técnica: https://dev.efipay.com.br
- Suporte Efí Pay: suporte@sejaefi.com.br
- Telefone: (31) 3031-6300

## ⚠️ Avisos Importantes

1. **Certificado PIX**: O arquivo .p12 deve ser mantido em segurança e não deve ser compartilhado
2. **Credenciais**: Nunca exponha suas credenciais (Client ID e Secret) em código público
3. **mTLS**: A validação mTLS é obrigatória para webhooks PIX por determinação do Banco Central
4. **Ambiente**: Esta integração está configurada para ambiente de **PRODUÇÃO**
5. **Descontos**: Os descontos configurados são aplicados automaticamente no momento da geração da cobrança

## 📝 Checklist de Configuração

- [ ] Credenciais EFI_CLIENT_ID e EFI_CLIENT_SECRET adicionadas
- [ ] Chave PIX inserida no painel admin
- [ ] Certificado .p12 enviado
- [ ] Webhook configurado no painel Efí Pay
- [ ] mTLS configurado (se aplicável)
- [ ] Gateway Efí Pay ativado no painel admin
- [ ] Testes realizados com PIX
- [ ] Testes realizados com Cartão
