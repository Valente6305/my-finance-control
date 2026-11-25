# My Finance Control

Aplicação financeira **local-first** com importação de snapshots bancários `.mfc` encriptados no próprio navegador.

## Fonte dos dados

- `finance-core.js` é o motor partilhado de reconciliação usado por **Overview**, **Contas bancárias** e **Financial Intelligence v7**.
- O estado do utilizador continua exclusivamente em `localStorage`, na chave `finance-control-public-v2`.
- Os saldos das contas correntes/poupança são somados apenas se classificados como `current` ou `savings`; o cartão de crédito nunca entra no dinheiro disponível.
- O estado do Credibom é **estimado** a partir de saldo/data de referência e pagamentos posteriores. Não é um saldo contratual confirmado pela financeira.

## Caixa Classic — confirmar a semântica uma vez por conta identificada

O ficheiro `.mfc` pode conter apenas um campo genérico `balance.amount`, sem indicar se representa dívida ou crédito disponível. Por segurança, esse valor **não é automaticamente** interpretado.

1. Em **Mais → Contas bancárias**, importar o snapshot `.mfc` mais recente.
2. Classificar corretamente a conta CGD corrente e a conta CGD Caixa Classic, guardando a classificação.
3. Na secção **Caixa Classic · semântica do saldo**, validar o limite contratual (atualmente **2.500 €**) e confirmar que o saldo da conta Caixa Classic representa **crédito disponível**.
4. Selecionar **Confirmar semântica e reconciliar cartão**.

Depois de confirmada para o identificador de conta exato, a regra é:

```text
Crédito utilizado = max(0, limite contratual − crédito disponível)
```

- Crédito disponível de **2.500 €** → **0 € de utilização**, sem prestação futura simulada do cartão.
- Crédito disponível de **2.100 €** → **400 € de utilização**.
- Valor ambíguo ou novo identificador de conta após reautorização → **por validar**, sem assumir liquidação.
- O cartão pode permanecer aberto mesmo quando a utilização é zero; novas compras podem reabrir a dívida.
- A regra não substitui o extrato contratual quando existirem operações pendentes, juros, comissões ou diferenças entre tipos de saldo.

**Atenção:** a classificação e a confirmação são específicas de `bank|account_ref`; não são transferidas automaticamente entre contas por posição/ordem.

## Importação e conservação de dados

- A importação do mesmo `.mfc` não duplica movimentos com o mesmo identificador.
- Um snapshot com data anterior à do último snapshot guardado é rejeitado.
- O histórico de movimentos e as referências de dívida são preservados.
- Não são enviados saldos, dados bancários ou palavras-passe para o GitHub.

## Testes

```bash
node tests/finance-core.test.js
node tests/verify-pages.test.js
```

O conjunto de testes cobre liquidação confirmada, utilização parcial, saldo ambíguo, deduplicação, coerência entre módulos, projeções sem prestação de cartão e persistência, além de rejeição de snapshots antigos e mudança de identificador bancário. Os testes estruturais validam a sintaxe das páginas e a dependência do mesmo motor. O GitHub Actions executa estes testes em alterações relevantes.

## Limitações

O saldo atual do Caixa Classic só pode ser considerado **confirmado pela semântica do utilizador e pelo snapshot observado** quando a aplicação recebe um saldo com a interpretação validada. O `.mfc` não garante por si só o significado do campo genérico de saldo. A ligação Open Banking não confirma automaticamente saldo contratual do Credibom.
