# RFC 001 — Oponentes, locais e partidas verificadas

**Status:** implementada nas fases 1 e 2, com o modelo de conta substituído
**Autor:** discussão com Lucas, agosto de 2026

> **Superseded em parte.** Este documento descreve a conta como **anônima** e o
> vínculo como **convite por código ou QR**. Nenhum dos dois existe mais: a
> conta passou a ser **e-mail, apelido e senha**, e o vínculo virou **pedido de
> amizade** por apelido ou e-mail. A troca foi feita porque o modelo anônimo
> saía caro para a próxima coisa que se quer construir — organizar campeonatos,
> que precisa de identidade estável e recuperável.
>
> Continua valendo: oponente local sem conta, antifraude por confirmação dos
> dois lados, base compartilhada de locais e a regra de nunca guardar quem
> jogou contra quem na base de meta. O esquema novo está em
> [`supabase/schema_accounts.sql`](../supabase/schema_accounts.sql).

## O que se quer

1. Saber **quem** foi o oponente, não só qual deck ele jogava.
2. Cadastrar oponentes só pelo apelido, sem exigir nada deles.
3. Um convite (link ou QR) que amarra aquele apelido a uma pessoa real do app.
4. **Antifraude:** só partida confirmada pelos dois lados entra na base de meta.
5. Saber **onde** a partida aconteceu, para ler o meta por loja e por campeonato.
6. Achar oponentes e locais por proximidade.

## A tensão que precisa ser dita antes de tudo

Hoje o app promete, na primeira tela: *sem nuvem, sem contas, sem assinatura*.

Confirmação mútua entre dois aparelhos exige três coisas que essa promessa exclui:

- **identidade que sobrevive à reinstalação** — senão o apelido vinculado quebra e o histórico de confronto se perde;
- **um servidor que entregue o pedido de confirmação** do aparelho A para o B;
- **estado compartilhado** entre pessoas que não se conhecem pelo aparelho.

Isso é conta. Dá para chamar de outro nome, mas é conta.

Não é motivo para não fazer — é motivo para **decidir conscientemente** e reescrever o texto do onboarding junto, como já foi feito quando a telemetria entrou. O que dá para preservar é o que realmente importa na promessa: **a IA continua 100% local** e **quem não quiser a parte social continua com um app inteiro sem ela**.

Proposta: as funções sociais são **opt-in explícito**. Sem elas, nada muda.

## Identidade

### Opção recomendada: conta anônima do Supabase

`supabase.auth.signInAnonymously()` devolve um `user.id` estável e um JWT, sem pedir e-mail nem senha. Depois, se a pessoa quiser não perder os vínculos ao trocar de aparelho, ela **promove** a conta para e-mail ou OAuth — a mesma conta, sem migração.

- Custo de implementação baixo, e é código de terceiro testado.
- Dá RLS de verdade: cada linha sabe de quem é.
- Reinstalar sem promover a conta perde os vínculos. Isso precisa estar escrito na tela, não escondido.

### Opção descartada: par de chaves gerado no aparelho

Identidade criptográfica própria (Ed25519, `player_id` público + segredo local, frase de recuperação) soa mais alinhada ao espírito do app e evita o termo "conta".

Descartada porque significa escrever à mão recuperação de conta, rotação de chave e revogação — o tipo de código em que errar é silencioso e caro. Não vale para um app de registrar partida de Magic.

## Vincular oponentes

Três estados para um oponente, e os três são úteis:

| Estado | Como nasce | Serve para |
|---|---|---|
| **Local** | você digita um apelido | histórico de confronto pessoal. Nunca sai do aparelho |
| **Convidado** | você gerou um convite, ninguém aceitou ainda | nada além do local, até aceitarem |
| **Vinculado** | a outra pessoa aceitou | confirmar partidas dos dois lados |

Fluxo do convite:

1. Você toca em *vincular* num oponente local. O app cria um código curto com validade (24 h, uso único).
2. O app mostra **QR e link**. Na mesa, QR resolve em dois segundos; o link serve para quem não está junto.
3. A outra pessoa abre → o app dela chama `redeem_invite(code)` → nasce o vínculo mútuo e ela vê *"Lucas quer registrar partidas com você"*.
4. Do lado dela, você entra como oponente com **o apelido que ela escolher** — não o que você usou. O apelido é seu, o vínculo é mútuo.

Deep link: `mtgtracker://link/<code>`, com fallback `https://mtg-tracker-livid.vercel.app/link/<code>` para quem ainda não instalou.

## Partida verificada

```
Você salva a partida
        │
        ├── oponente não vinculado ──→ fica local. Sobe anônima (como hoje), marcada verified = false
        │
        └── oponente vinculado ─────→ cria uma reivindicação pendente
                                              │
                    ┌─────────────────────────┼──────────────────────┐
                    │                         │                      │
              ele confirma              ele contesta          ninguém responde
                    │                         │                   (7 dias)
                    ↓                         ↓                      ↓
          sobe com verified = true      fica só local          fica só local
```

A partida **sempre** existe no seu aparelho. A confirmação decide apenas se ela entra na base de meta como verificada.

### Duas decisões finas aqui

**Não jogue fora o dado não verificado.** Você disse "só partidas de 2 pessoas sobem". Entendo o motivo — evitar quem infla o win rate do próprio deck. Mas isso descarta de saída todo o histórico atual e todo mundo que joga com quem não tem o app, que no começo é quase todo mundo. Sugestão: **sobe tudo, com a coluna `verified`**, e as views de meta filtram. Você decide o corte na análise, não na coleta — e ainda pode medir o quanto os dois conjuntos divergem, que por si só diz se a fraude é um problema real.

**Partida verificada não é anônima.** Ela nasce de dois ids conhecidos. Guardar esses ids na tabela de meta transforma a base analítica em base de relacionamento entre pessoas. Sugestão: no `ingest`, gravar apenas `verified = true` e um **hash com sal do par ordenado**, que serve para deduplicar quando os dois reportarem, e descartar os ids. A base de meta segue sem saber quem é quem.

## Locais

```ts
interface Venue {
  id: string;
  name: string;
  kind: 'loja' | 'evento' | 'casa' | 'online';
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  source: 'usuario' | 'osm';
}
```

**Local do tipo `casa` nunca sai do aparelho.** É endereço residencial de alguém. Fica na base local, entra nas suas estatísticas, e não vai para a tabela compartilhada. Essa linha não é negociável e deve estar no código, não só na política.

### De onde vem a base de lojas

**Raspar o site da Wizards: não.** Fere os termos de uso, quebra a cada mudança de layout e envelhece sem aviso.

**Alternativa melhor: OpenStreetMap.** POIs com `shop=games` cobrem boa parte das lojas do mundo, a licença ODbL permite uso com atribuição, e a consulta é uma chamada à Overpass API — sem raspagem, sem risco jurídico. Serve como semente; o que faltar, o usuário cria.

**Crescimento orgânico** por cima: ao registrar um local que não existe, ele nasce na base compartilhada e fica disponível para todos. Deduplicação por nome parecido dentro de um raio — sem isso a base vira dez "Loja do Zé" em três meses.

## Achar oponentes por proximidade

**Não expor localização de pessoa.** "Fulano está a 200 m de você" é um risco de segurança, e o público de Magic inclui menores.

Alternativa que entrega o mesmo benefício sem essa superfície: **check-in no local**. Você chega na loja e marca presença. Quem também marcou presença **naquele local, naquele dia, e optou por ficar visível** aparece por apelido. Fora do local e do dia, ninguém aparece. A localização é usada para achar o *local*, nunca a *pessoa*.

## Fases

| Fase | Entrega | Precisa de conta? |
|---|---|---|
| **1** | Oponentes locais por apelido · local na partida · estatística por local · tabela compartilhada de locais públicos | não |
| **2** | Conta anônima · convite por QR e link · confirmação mútua · coluna `verified` | sim |
| **3** | Check-in em local · achar oponentes presentes · favoritos | sim |

A fase 1 já entrega "meta por loja", que é metade do valor pedido, sem tocar na promessa de nada de conta. Ela também produz o dado que diz se a fase 2 vale o custo: dá para medir quantas partidas são contra oponentes recorrentes antes de construir a máquina de confirmação.

## Perguntas em aberto

1. O app passa a ter conta anônima opcional, ou isso é linha vermelha?
2. Base de meta: sobe tudo com coluna `verified`, ou só verificada?
3. Semente de lojas: OpenStreetMap com atribuição, ou 100% orgânica?
4. Começar pela fase 1 já?
