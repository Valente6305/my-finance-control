# Auditoria técnica e plano de evolução — My Finance Control

Data: 2026-11-24 | Âmbito: `finance-core.js`, `index.html`, `bank-accounts.html`, `financial-intelligence.html`, testes e workflow.

## Diagnóstico fundamentado no código

| Código/área | Evidência observada | Risco | Resolução |
|---|---|---|---|
| Importação `.mfc` | A importação aceitava transações e saldos sem validação estrutural sistemática | Dados inconsistentes | `validateSnapshot` valida formato, data, estrutura, saldos e movimentos |
| Importação subsequente | Guardava o snapshot mais recente sem relatório comparativo | Alterações não auditáveis | `snapshotDiff` e `lastImportReport`, com histórico limitado a 24 importações |
| Categorias | Correção de transações importadas não estava disponível no Overview | Orçamento e Intelligence com categorias incorretas | Correção direta por movimento e precedência persistente de `categoryOverrides` |
| Caixa Classic | Campo genérico de saldo não indica necessariamente dívida | Passivo incorreto | Confirmação explícita da semântica do crédito disponível; motor partilhado |
| Dados bancários por reconciliar | Recurso a saldo legado quando faltava conta de caixa classificada | Liquidez potencialmente desatualizada | Estado `unreconciled` sem apresentar saldo legado como dinheiro disponível |
| Exportação JSON | Backup de texto legível sem aviso suficientemente explícito | Exposição acidental de dados financeiros | Aviso visível e confirmação antes de exportar |
| Auditoria de alterações | Testes do motor financeiro e da estrutura já existiam | Regressões | Acrescentados testes de validação e reconciliação |

## Matriz de prioridades

| Trabalho | Impacto | Esforço estimado | Risco de mudança | Situação |
|---|---|---|---|---|
| WP1: Validação, comparação e relatório de importações | Muito alto | Médio | Baixo-médio | Implementado parcialmente |
| WP2: Correção manual de categorias persistente | Alto | Médio | Médio | Implementado; sugestões automáticas por comerciante pendentes |
| WP8: Segurança na exportação de dados | Alto | Baixo | Baixo | Implementado |
| WP9: Regressão de `.mfc` e saldos | Alto | Médio | Baixo | Testes sintéticos acrescentados; Safari real pendente |
| WP3: Previsão 30/90/180/365 dias com intervalos de incerteza | Alto | Alto | Alto | Pendente de histórico e backtesting |
| WP4: Estimativa contratual Credibom e amortização | Alto | Médio-alto | Alto | Mantido modelo conservador; saldo contratual exige fonte validada |
| WP5: Ligação entre objetivos e poupança observada | Médio | Médio | Médio | Pendente |
| WP6: Financial Intelligence v8 | Médio-alto | Alto | Médio-alto | Proposta; v7 preservada |
| WP7: Auditoria móvel Safari/PWA e acessibilidade | Alto | Médio | Médio | Testes reais em dispositivo pendentes |
| WP8: IndexedDB e migração de esquemas | Médio | Alto | Alto | Não migrar sem cópia de segurança, teste de recuperação e plano de rollback |
| Financial Decision Assistant | Médio | Alto | Alto | Pendente; recomendações só com dados qualificados |

## Integridade e semântica financeira

- A conta Caixa Classic apenas é tratada como crédito disponível após confirmação explícita associada a `bank|account_ref`. Limite disponível não é dinheiro.
- Credibom continua a ser **estimado** se não houver saldo contratual confirmado.
- A variação entre dois saldos bancários é **diferença de snapshot**, nunca receita nem despesa automaticamente.
- As correções manuais de categorias não alteram o montante nem a descrição bancária originais.
- O relatório de importação é guardado apenas no armazenamento local do dispositivo, não no repositório GitHub.
- O campo `snapshot.generated_at` corresponde ao momento de geração do ficheiro; não garante atualização instantânea de todas as transações.

## Trabalho e verificação

1. Motor financeiro central continua partilhado nas três páginas.
2. Adicionadas validações prévias à persistência de novo `.mfc`.
3. Registadas variações de saldo e contagens de duplicados sem eliminar histórico.
4. Criada correção manual de categorias no ecrã Movimentos.
5. Priorizadas correções em importações subsequentes e no Intelligence.
6. Evitado fallback financeiro para saldo legado com snapshot por reconciliar.
7. Salvaguardada a exportação JSON com aviso de ausência de encriptação.
8. Os testes financeiros sintéticos foram executados e passaram no ambiente de avaliação. A validação end-to-end em Safari/iPhone e a execução do CI do GitHub ainda precisam de confirmação independente.

## Limitações e decisões de não implementação

- Não se deve declarar que todas as contas estão reconciliadas sem observar o `localStorage` do dispositivo e o último snapshot.
- Importações não devem permitir que dados mais antigos substituam dados recentes.
- Modelos ML, Monte Carlo e decisões de investimento ficam adiados até existir histórico suficiente e validação retrospectiva.
- Não foram realizados pagamentos, transferências, ligações bancárias adicionais ou operações no dispositivo.
- Não foram alteradas credenciais, segredos ou dados bancários reais.
- A estimativa do Credibom requer extrato contratual para verificar juros, comissões e capital em dívida.
- O código-fonte estático não substitui testes reais de acessibilidade, desempenho em Safari e fluxo de backup/restauro.

## Próxima fase recomendada

1. Executar no iPhone uma importação validada e verificar o novo Relatório de Reconciliação.
2. Testar classificação de 3 movimentos e confirmar resultados em Overview/Intelligence.
3. Testar backup encriptado, restauro em ambiente separado e atualização entre PWA e Safari.
4. Reunir 3–6 meses de dados para avaliar previsões e incerteza de tesouraria.
5. Só depois desenvolver a versão 8, sem retirar a versão 7 antes de testes comparativos.
