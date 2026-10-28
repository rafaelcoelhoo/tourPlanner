# Aplicação «Horários»

**Gestão do horário mensal de guias turísticos**

Versão 1.0 · Outubro de 2026 · Preparado para a Take Free Tours · Disponível em Português, Inglês e Espanhol

---

## 1. O que é

A aplicação «Horários» serve para **preparar, rever, publicar e confirmar o horário mensal dos guias**. O horário é uma grelha: as linhas são os tours (hora, tour e idioma) e as colunas são os dias do mês.

**Principais vantagens**

- Horário gerado automaticamente e revisto pelo administrador antes de ser publicado.
- Os guias consultam o seu horário no telemóvel.
- Os tours são distribuídos de forma equilibrada, conforme a disponibilidade de cada guia.
- Avisos claros quando uma atribuição não cumpre uma regra. A decisão final é sempre do administrador.
- Vê-se de imediato que tours têm guias em falta.
- Cada guia confirma a presença e o administrador vê quem já confirmou.

## 2. Perfis de utilizador

| Perfil | O que faz |
|---|---|
| **Administrador** | Gere cidades, tours, slots, guias, necessidades, horário e confirmações diárias. |
| **Guia** | Vê o seu horário, confirma presença e gere o seu perfil (tours que sabe fazer, indisponibilidades e restrições). |

Cada guia pertence a uma cidade e só vê o horário dessa cidade. Cada cidade tem os seus próprios tours, slots, guias e horários.

---

## 3. Como funciona, em 5 passos

1. **Configurar:** o administrador define cidades, tours e slots, e convida os guias.
2. **Perfil dos guias:** cada guia indica os tours e idiomas que sabe fazer e as suas indisponibilidades.
3. **Matriz:** o administrador define quantos guias são necessários por tour e por dia, e confirma.
4. **Gerar e rever:** a aplicação gera o rascunho do mês, e o administrador ajusta o que for preciso.
5. **Publicar:** o horário fica visível para os guias, que confirmam a presença antes de cada tour.

---

## 4. Acesso

- **Início de sessão** com email e palavra-passe.
- **Convite:** o guia recebe um link, define a palavra-passe e entra (link válido 7 dias).
- **Recuperação de palavra-passe:** o guia pede um link por email. O administrador também pode gerar um link de redefinição (válido 1 hora).
- **Alterar palavra-passe:** disponível para guias e administrador.
- **Idioma:** Português, English ou Español, escolhido no cabeçalho.
- **Telemóvel:** menu lateral e vistas adaptadas ao ecrã pequeno.

---

## 5. Área do administrador

### 5.1 Horário

Mostra o horário do mês, com o estado **Sem rascunho**, **Rascunho** ou **Publicado**.

- **Vista Tabela:** grelha de slots por dias, por mês ou por semana.
- **Vista Agenda:** faixa de dias no topo e cartões com os tours do dia selecionado. Foi pensada para telemóvel.
- **Gerar rascunho:** cria as atribuições do mês com base na matriz confirmada.
  - **Atenção:** se o mês já tinha atribuições, **todas são apagadas e geradas de novo, incluindo as feitas à mão**, as retiradas e as confirmações dos guias e da agência. Os tours marcados como NT e as notas mantêm-se. Não é guardada nenhuma cópia da versão anterior.
  - A aplicação pede confirmação antes de gerar e não permite gerar um mês já publicado (é preciso despublicar primeiro).
- **Publicar / Despublicar:** torna o mês visível (ou não) para os guias. Antes de publicar, a aplicação mostra um resumo de avisos e vagas por preencher para o administrador decidir.
- **Resumo:** indica se todos os slots estão completos ou quantos guias faltam.

**Editar um tour** (clicar na célula ou no cartão):

- Adicionar um guia. A lista mostra os guias que podem fazer o tour.
- Escolher um guia que não cumpre uma regra, com aviso e confirmação do administrador.
- **Retirar** um guia: o nome fica riscado (na Tabela, na Agenda e na janela de edição; na vista Dia aparece entre parênteses), o registo mantém-se e o guia deixa de contar para a carga. Usa-se quando um guia sai de um tour e se quer deixar rasto disso. Com **Repor** volta a ser colocado.
- **Remover** um guia: apaga a atribuição por completo, sem registo e sem forma de a repor. Usa-se para corrigir um engano, por exemplo um guia atribuído por erro.
- Alterar o número de guias necessários.
- Escrever uma nota (até 300 caracteres).
- Marcar o tour como **NT** (sem procura) ou reativá-lo.
- Confirmar o tour.

### 5.2 Dia (confirmação diária)

Mostra por defeito o **dia seguinte**, com um cartão por tour: guias atribuídos face aos necessários, quem já confirmou e notas. Aqui o administrador pode:

- marcar NT, escrever notas e retirar ou adicionar guias;
- **confirmar cada tour** ou **todos os tours do dia** de uma só vez.

### 5.3 Matriz (necessidades do mês)

Tabela com os slots nas linhas e os dias nas colunas, onde se define quantos guias são necessários em cada tour.

- Vem pré-preenchida com o modelo semanal de cada slot.
- Valores de 0 a 50. **0 ou vazio** significa que o tour não corre nesse dia.
- **Guardar** ou **Guardar e confirmar**. A confirmação permite gerar o horário.

### 5.4 Carga

Mostra, para cada guia, o número de tours do mês por tour, o total, os dias disponíveis e o rácio. Permite ver se a distribuição está equilibrada.

### 5.5 Guias

- **Convidar** (nome, email, telefone, cidade) e copiar o link de ativação.
- **Lista** com o estado de cada guia: Convidado, Ativo ou Desativado.
- **Ações:** novo link de convite, link de redefinição, desativar e reativar.
  - **Desativar** um guia impede-o de entrar, termina as suas sessões e **remove as suas atribuições a partir de hoje**. Os tours afetados ficam com guias em falta e têm de ser reatribuídos. Reativar volta a permitir o acesso, mas não repõe as atribuições.
- **Por tour** e **Por idioma:** quem está qualificado para quê.
- **Tours no mês:** a vista da Carga.
- **Perfil do guia:** o administrador edita qualificações, indisponibilidades e restrições, e pode mudar o guia de cidade.
  - **Mudar um guia de cidade** exige confirmação e **apaga as suas qualificações, as indisponibilidades por slot e as atribuições futuras**. O guia tem de voltar a indicar os tours que sabe fazer na nova cidade.

### 5.6 Slots

- **Cidades:** criar novas cidades.
- **Tours:** criar tours e definir se são primários ou secundários.
- **Slots:** combinação de tour, idioma, hora, duração, dias da semana e guias por defeito. Cada slot pode ser ativado ou desativado.
- **Regras gerais:**

| Regra | Valor por defeito |
|---|---|
| Início da tarde | 13:00 |
| Intervalo mínimo entre tours | 60 min |
| Máximo de tours por dia | 2 |
| Duração por defeito de um slot | 150 min |
| Confirmação do guia (horas antes) | 3 h |

### 5.7 Conta

Alterar a palavra-passe do administrador.

---

## 6. Área do guia

### 6.1 Horário

O guia vê apenas os seus tours publicados, em duas vistas:

- **Lista:** tours agrupados por dia, com colegas, notas e etiquetas de estado.
- **Calendário:** mês em semanas, com cores por estado.

Em cada tour o guia vê a hora, o tour, o idioma, os colegas e a nota. Também vê as etiquetas **Confirmado pela agência**, **Confirmado por mim** e **NT – sem procura**.

**Confirmar presença:** a partir de X horas antes do tour (3 por defeito), o guia carrega em **Confirmar presença**. Pode anular enquanto a janela estiver aberta. Os tours a confirmar aparecem em destaque.

### 6.2 Perfil

- **Tours e idiomas que sabe fazer:** um botão por tour e idioma, guardado de imediato.
- **Indisponibilidades:** por dia ou intervalo de datas, com período (dia inteiro, manhã, tarde, antes ou depois de uma hora) e slot opcional.
  - **O guia não pode adicionar nem remover indisponibilidades que toquem num mês já publicado.** Aparece o aviso «O horário deste mês já foi publicado. Contacte o administrador para alterar disponibilidades.». O administrador pode sempre fazê-lo no perfil do guia.
  - Uma indisponibilidade nova não altera atribuições já feitas: o conflito fica assinalado no horário (nome a vermelho e contorno laranja).
- **Restrições semanais:** regras que se repetem todas as semanas (por exemplo, «às segundas não trabalho de manhã»).
- **Alterar palavra-passe.**

---

## 7. Regras de atribuição

O horário é gerado dia a dia. Só são atribuídos guias que:

- têm o tour e o idioma marcados no perfil;
- estão disponíveis (indisponibilidades e restrições semanais);
- não excedem o máximo de tours por dia;
- fazem no máximo um tour de manhã e um de tarde;
- têm o intervalo mínimo entre tours;
- estão em tours que não são NT.

Entre os guias possíveis, a aplicação escolhe quem tem menos tours em proporção aos dias disponíveis. Se não houver guias suficientes, o tour fica marcado com «falta N» e o resto do horário é gerado normalmente.

Nas atribuições manuais, as mesmas regras aparecem como **avisos**. O administrador pode sempre decidir manter a atribuição.

---

## 8. Legenda de cores e marcas

| Marca | Significado |
|---|---|
| Fundo verde | Tour completo |
| Fundo vermelho | Faltam guias |
| Fundo azul | Tour confirmado pela agência |
| Fundo cinzento («NT») | Tour sem procura |
| Fundo às riscas | O tour não corre nesse dia |
| Contorno laranja | Existe uma atribuição com aviso |
| Nome a vermelho | Atribuição que não cumpre uma regra |
| Nome riscado | Guia retirado do tour (fica o registo) |
| ✓ antes do nome | O guia confirmou a presença |
| ○ antes do nome | A confirmação está aberta e o guia ainda não confirmou |

---

## 9. Resumo por perfil

| Funcionalidade | Administrador | Guia |
|---|:---:|:---:|
| Ver o horário completo da cidade | ✓ | — |
| Ver o seu horário publicado | — | ✓ |
| Gerar, editar e publicar horários | ✓ | — |
| Definir a matriz de necessidades | ✓ | — |
| Convidar e gerir guias | ✓ | — |
| Gerir tours, slots e regras | ✓ | — |
| Definir qualificações | ✓ (qualquer guia) | ✓ (as suas) |
| Registar indisponibilidades | ✓ (qualquer mês) | ✓ (exceto em meses já publicados) |
| Registar restrições semanais | ✓ | ✓ |
| Marcar NT e escrever notas | ✓ | — |
| Confirmar tours (azul) | ✓ | — |
| Confirmar presença | — | ✓ |
| Alterar a própria palavra-passe | ✓ | ✓ |

---

## 10. Segurança

- Os guias só entram por convite do administrador.
- Cada guia só vê dados da sua cidade.
- Palavra-passe com mínimo de 8 caracteres.
- A sessão expira ao fim de 30 dias sem utilização.
- Limite de tentativas repetidas de início de sessão e de recuperação de palavra-passe.
- Os links de convite e de redefinição são de uso único.
- Ao alterar ou redefinir a palavra-passe, as outras sessões são terminadas.