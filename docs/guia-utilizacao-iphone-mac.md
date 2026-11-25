# Guia rápido — My Finance Control (iPhone e Mac)

## 1. Importar e reconciliar

1. Abre **Mais → Contas bancárias**.
2. Seleciona o ficheiro `.mfc` mais recente e introduz a palavra-passe **no dispositivo**, não no repositório.
3. Confirma a opção de guardar o snapshot.
4. Verifica as contas CGD e Revolut e a classificação de cada conta.
5. No **Relatório de reconciliação bancária**, confirma a data, as contas, os movimentos novos, os duplicados e as variações de saldo.

A diferença de saldo entre duas importações **não significa necessariamente rendimento ou despesa**: pode incluir transferências, compras do cartão, pagamentos, juros ou operações ainda não classificadas.

Um snapshot anterior ao guardado é rejeitado. A mesma importação não duplica transações já reconhecidas.

## 2. Caixa Classic

Se o campo apresentado para a conta Caixa Classic for **crédito disponível**, confirma esse significado e o limite de 2.500 € em Contas Bancárias.

Exemplos: 2.500 € disponíveis = 0 € de crédito utilizado; 2.100 € disponíveis = 400 € utilizados. **O limite não é dinheiro em conta.**

A confirmação tem de ser repetida caso a conta seja reautorizada e receba novo identificador. Verifica os valores contratualmente na app/extrato da CGD.

## 3. Rever e corrigir categorias

1. No **Overview → Movimentos**, localiza a transação.
2. Altera a categoria no seletor da linha.
3. A correção é guardada automaticamente neste navegador/dispositivo.
4. Reabre **Intelligence v7** para confirmar a atualização.

A correção não muda o montante ou a descrição original e deve ser respeitada em importações posteriores. A informação não sincroniza automaticamente com outro navegador ou dispositivo.

## 4. Origem dos indicadores

- **Banco (.mfc):** saldos e transações disponibilizados.
- **Calculado:** resultados obtidos de dados identificados, com fórmulas auditáveis.
- **Estimado:** dívida Credibom e previsão, quando dependem de referências ou pressupostos.
- **Manual:** orçamento, reserva, objetivos, taxas, outros ativos.

Se o estado for **Por reconciliar**, valida primeiro os tipos das contas; não interpretes o número legado como saldo disponível.

## 5. Backups e segurança

- Dá preferência ao **backup encriptado do Intelligence v7**.
- O backup JSON do Overview é **texto legível**, contém dados financeiros e exige agora confirmação explícita.
- Conserva a palavra-passe fora do ficheiro e não partilhes documentos de dados bancários em repositórios públicos.
- Antes de usar qualquer opção de limpeza/manutenção, cria um backup e valida a recuperação.
- Não limpes dados do Safari/PWA sem um backup verificado.

## 6. Limitações

- O navegador guarda os dados localmente; importar no Mac não garante que apareçam no iPhone.
- O ficheiro `.mfc` é um snapshot; não há sincronização bancária em tempo real dentro da PWA.
- Os saldos de dívida do Credibom baseados apenas em pagamentos são **estimativas**, não confirmações contratuais.
- O cartão pode voltar a ter dívida se for utilizado após uma liquidação.
