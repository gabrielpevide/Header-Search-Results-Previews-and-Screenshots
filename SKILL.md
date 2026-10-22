---
name: app-store-visuals
description: Cria e sobe as imagens da página de qualquer app na App Store - screenshots de iPhone e iPad, Header (product page header) e Search Results - com as medidas certas, captura real no simulador, render em tamanho exato e upload pelo asc. Use quando o usuário pedir screenshots novos ou refeitos, "imagens da loja", header, search result, creative assets, arte da App Store, ou quando uma versão nova muda algo que aparece nas imagens atuais (número de itens, tela redesenhada, ícone novo).
---

# Imagens da App Store: screenshots, Header e Search Results

Vale para todos os apps do usuário. Nada aqui é de um app só: cores, fontes, textos e telas vêm do projeto da vez.

Arquivos desta skill:
- `reference/specs.md`: medidas, áreas seguras, tipos de tela, onde cada coisa sobe e as regras que reprovam. Leia antes de desenhar.
- `scripts/render.mjs`: HTML para PNG no tamanho exato, RGB sem alfa, com guias opcionais e checagem de fonte e imagem.
- `scripts/check.sh`: confere tamanho, alfa e espaço de cor antes do upload.
- `templates/screenshot.html`: legenda em cima, captura real numa moldura de iPhone embaixo, guiado por um `shots.json`.
- `templates/header.html`, `templates/search-result.html`: esqueletos com as áreas seguras comentadas.
- `examples/certly-1.3/`: um conjunto que foi para a loja: `shots.json`, `header.html`, `search-result.html` e `ScreenshotSeed.swift.txt` (o seed temporário de dados de demonstração e as ligações que ele precisou). Os caminhos de imagem do `shots.json` apontam para o projeto do Certly; é referência, não para rodar daqui.

`SKILL=~/.claude/skills/app-store-visuals` nos comandos abaixo.

## 0. Levantar o contexto

1. **App e versão editável.** O app id está no `~/CLAUDE.md` (tabela de links) ou em `asc apps list`. A versão precisa estar em `PREPARE_FOR_SUBMISSION`:
   ```bash
   asc versions list --app APP_ID --output table
   asc localizations list --version VERSION_ID --output table   # id da localização en-US
   ```
2. **O que está no ar hoje.** Baixe as miniaturas e olhe cada uma (Read no PNG). Anote o que ficou falso nesta versão: números, rótulos, telas que mudaram, respostas que o conteúdo corrigiu.
   ```bash
   asc screenshots list --version-localization LOC_ID --output json > /tmp/shots.json
   python3 - /tmp/shots.json <<'EOF'
   import json,sys,urllib.request,os
   raw=open(sys.argv[1]).read(); d=json.loads(raw[raw.index('{'):])
   os.makedirs('/tmp/current-shots',exist_ok=True)
   for s in d['sets']:
       t=s['set']['attributes']['screenshotDisplayType']
       for i,x in enumerate(s.get('screenshots',[])):
           u=x['attributes']['imageAsset']['templateUrl'].replace('{w}x{h}bb.{f}','400x870bb.png')
           urllib.request.urlretrieve(u,f'/tmp/current-shots/{t}-{i}.png'); print(t,i,x['attributes']['fileName'])
   EOF
   ```
3. **Marca.** Cores e fontes do arquivo de tokens do app (a tabela do `~/CLAUDE.md` diz qual é), e o ícone atual. A arte usa só a paleta do app.
4. **O que a versão traz.** Leia o What's New e o diff. Feature nova que muda a decisão de instalar ganha uma tela.

## 1. Roteiro

- 5 ou 6 telas. A 1ª responde "o que é e por que eu quero". As 3 primeiras aparecem sem rolar.
- Uma ideia por tela, mostrada no app real. Legenda com no máximo umas 7 palavras; subtítulo opcional de uma linha.
- Legenda é texto de loja: passe pela skill `no-ai-slop`, sem travessão, sem "best"/"#1", sem preço.
- Reaproveite legendas antigas que continuam verdadeiras: o usuário já aprovou aquele tom.
- Se o usuário só pediu "refaz" ou "atualiza", siga com o roteiro e mostre o resultado. Se é o primeiro conjunto do app, mostre telas e legendas numa mensagem antes de capturar.

## 2. Captura no simulador

Use um simulador cuja tela nativa já é 6.9" (Pro Max, 1320×2868): a captura entra na moldura sem perder nitidez.

```bash
UDID=$(xcrun simctl list devices available | grep -m1 "Pro Max" | grep -oE '[0-9A-F-]{36}')
xcrun simctl boot $UDID 2>/dev/null; open -a Simulator
xcrun simctl status_bar $UDID override --time 9:41 --batteryState discharging --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork wifi   # "charged" desenha um raio na bateria
xcrun simctl ui $UDID appearance light        # ou dark, se a tela for mostrada no escuro
xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath /tmp/shots-dd build CODE_SIGNING_ALLOWED=NO
xcrun simctl install $UDID /tmp/shots-dd/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch $UDID BUNDLE_ID
xcrun simctl io $UDID screenshot raw/01-home.png
```

**Dados de demonstração.** Tela vazia vende mal; dado inventado que o app não mostraria é proibido. O dado é de demonstração, mas cada número na tela tem que sair da lógica real do app. Para chegar a um estado (histórico, nota, resultado de simulado):
- Primeiro tente o caminho real: usar o app no simulador.
- Quando o caminho real é longo demais, edite o código temporariamente: faça `cp` de cada arquivo antes, marque cada linha com `// TEMP-SCREENSHOT`, capture, restaure do `cp`, apague arquivos novos, e confirme que `grep -rn TEMP-SCREENSHOT` volta vazio e que `git status` só mostra o que já estava lá.
- Padrão que funcionou (Certly 1.3):
  - Um arquivo `ScreenshotSeed.swift` que grava no `UserDefaults` o que os services leem no `init` (progresso, sequência, exame escolhido, onboarding concluído).
  - O seed roda antes do estado do app nascer: troque `@State private var appState = AppState()` por `@State private var appState: AppState` e um `init() { ScreenshotSeed.run(); _appState = State(wrappedValue: AppState()) }`. Valor padrão de propriedade é avaliado antes do corpo do `init`.
  - Datas relativas a `Date()`, para "hoje" e "vencido" baterem com a hora da captura.
  - Estado alternativo por argumento de lançamento (`xcrun simctl launch $UDID BUNDLE -screenshotFirstRun`, lido com `CommandLine.arguments`) em vez de outro build.
  - Fila embaralhada: ordene os itens escolhidos primeiro. Fluxo longo (simulado de 60 questões): pré-preencha as respostas e deixe o app calcular a nota.
  - Desligue temporariamente o pedido de rastreamento (ATT) e o início do SDK de anúncios: alerta do sistema e banner não entram em screenshot.
- Não use `simctl spawn defaults write` para forçar estado: o `cfprefsd` do simulador serve valor velho ao app.

**Navegar.** `axe describe-ui --udid $UDID` lista botões com `AXLabel` e `frame` em pontos (o Pro Max tem 440×956 pt). Para tocar, o MCP do simulador (`tap` com x, y) foi confiável; `axe tap -x -y` às vezes não registra. Botão fora da tela: role com `swipe` e leia o `frame` de novo.

**Olhe cada captura** (Read no PNG) antes de compor:
- Espere 1 a 2 s depois de navegar: animação de entrada pega no meio parece bug.
- Teclado aberto, alerta, spinner ou texto cortado: capture de novo.
- Trate a captura como QA. Gráfico vazio com número cheio, contagem que não bate, texto que a versão corrigiu: é bug do app. Corrija no código (correção de verdade, sem marcação TEMP), recapture, e avise o usuário de que a build na loja precisa da correção.
- `xcrun simctl io screenshot` não desenha a ilha dinâmica; o template desenha.

## 3. Compor e renderizar os screenshots

Guarde tudo no repositório do app, para a próxima versão só trocar captura e legenda:

```
aso/screenshots/<versão>/shots.json
aso/screenshots/<versão>/raw/*.png        capturas do simulador
aso/screenshots/<versão>/1320x2868/*.png  saída que sobe
```

`shots.json` (caminhos relativos a ele):

```json
{
  "canvas": { "width": 1320, "height": 2868 },
  "font": { "family": "Inter Tight", "css": "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;700&display=block" },
  "theme": { "bg": "#F6F6F4", "ink": "#121213", "muted": "#78786F", "accent": "#3B4EE0", "frame": "#1D1D1F",
             "darkBg": "#121213", "darkInk": "#F1F1EE", "darkMuted": "#8E8E88" },
  "shots": [
    { "out": "01-home.png", "image": "raw/01-home.png", "headline": "Ready, or just\nconfident?",
      "sub": "One line that adds a fact.", "dark": true, "chips": ["4 EXAMS", "920 QUESTIONS"], "deviceTop": 900 }
  ]
}
```

Campos de cada tela, de cima para baixo:
- `pill`: rótulo arredondado com um ponto na cor de acento (bom para a 1ª tela).
- `eyebrow`: chamada curta em caixa alta na cor `eyebrowColor` ("MISSED QUESTIONS").
- `tick`: traço de acento, só aparece quando não há `pill` nem `eyebrow`; `tick: false` tira.
- `headline`: use `\n` para quebrar; o tamanho diminui sozinho até a linha mais longa caber. `headlineSize` muda o ponto de partida (padrão 112).
- `sub`: uma ou duas linhas, quebra balanceada.
- `chips`: faixa de rótulos em mono.
- `dark`, `background`, `deviceTop` e `deviceWidth` (px num canvas de 1320; padrão 700 e 1000), `island: false` se a captura já tiver a ilha.

Campos do `theme`: `bg`, `ink`, `muted`, `accent`, `frame`, `eyebrowColor`, `surface` (fundo da pílula), `line`, `headlineWeight` (padrão 700), `headlineTracking` (padrão −0,015em), `punctuationPull` (padrão −0,06em: aproxima `.` e `,` da letra) e as versões `dark*`.

**Igualar ao site do app.** Quando o app tem site, copie dele: cor de fundo, cor do texto, acento, fonte, peso e espaçamento do título, e a cor das chamadas. Reaproveite o título principal do site na 1ª tela. Exemplo em `examples/certly-1.3/shots.json`, que segue o site do Certly: Plus Jakarta Sans 800, −0,035em, fundo `#F3F4F7`, chamadas `#B23A1B`.

`deviceTop` que funcionou: 600 a 640 com chamada e título de 2 linhas, 760 a 800 com subtítulo, 900 com subtítulo e chips. A moldura passa da borda de baixo de propósito.

**Outros tamanhos.** O mesmo `shots.json` renderiza em 1284×2778 trocando só o `canvas`; o layout escala junto. Faça isso quando a versão tiver um conjunto 6.5" (ou um conjunto antigo de 1284 para trocar).

```bash
cd aso/screenshots/<versão>; mkdir -p 1320x2868
n=$(python3 -c "import json;print(len(json.load(open('shots.json'))['shots']))")
for i in $(seq 0 $((n-1))); do
  out=$(python3 -c "import json;print(json.load(open('shots.json'))['shots'][$i]['out'])")
  node $SKILL/scripts/render.mjs $SKILL/templates/screenshot.html 1320 2868 1320x2868/$out --data shots.json --index $i
done
zsh $SKILL/scripts/check.sh 1320x2868 1320x2868/*.png
```

Para revisar, reduza (`sips -Z 900 arquivo --out /tmp/x.png`) e olhe cada uma. Confira: legenda não encosta na moldura, nenhum número contradiz a descrição da versão, o dado de demonstração parece de uso real.

Se um app pede outro layout (paisagem, sem moldura, legenda embaixo), copie o template para a pasta da versão e edite a cópia. Mantenha o formato do `shots.json`.

## 4. Header e Search Results

1. Copie `templates/header.html` e `templates/search-result.html` para `aso/creative/<versão>/`.
2. Troque cores, fonte e a arte do `.focal` pelo motivo do app (o desenho do ícone funciona bem: liga a arte ao ícone que aparece logo abaixo). Use os SVGs do ícone quando existirem.
3. Search result leva título de até 6 palavras, concreto (uma contagem, um formato). Header normalmente vai sem texto.
4. Renderize com guias e olhe:
   ```bash
   node $SKILL/scripts/render.mjs header.html 3840 1646 /tmp/header-guides.png --guides header
   node $SKILL/scripts/render.mjs search-result.html 3840 2560 /tmp/search-guides.png --guides search
   sips -Z 1600 /tmp/header-guides.png --out /tmp/h.png; sips -Z 1600 /tmp/search-guides.png --out /tmp/s.png
   ```
   Amarelo é a área segura (arte e texto dentro); verde, no header, é a faixa de cima que a barra de status cobre; ciano, o que o iPhone mostra.
5. Renderize sem guias e confira:
   ```bash
   node $SKILL/scripts/render.mjs header.html 3840 1646 header-3840x1646.png
   node $SKILL/scripts/render.mjs search-result.html 3840 2560 search-result-3840x2560.png
   zsh $SKILL/scripts/check.sh 3840x1646 header-3840x1646.png
   zsh $SKILL/scripts/check.sh 3840x2560 search-result-3840x2560.png
   ```

## 5. Upload

Só na versão em `PREPARE_FOR_SUBMISSION`. Nunca envie para revisão sem o ok explícito do usuário.

**Screenshots.** Rode o dry-run, leia o que vai ser apagado, depois rode de verdade. A ordem na loja é a ordem dos nomes de arquivo. Use o `--device-type` do conjunto que já existe na versão (`asc screenshots list` mostra `APP_IPHONE_67` ou `APP_IPHONE_69`): o `--replace` só mexe nesse conjunto.
```bash
asc screenshots upload --version-localization LOC_ID --path 1320x2868 --device-type IPHONE_67 --replace --dry-run
asc screenshots upload --version-localization LOC_ID --path 1320x2868 --device-type IPHONE_67 --replace --confirm
```

**Header e Search Results.** O id da Asset Library é o app id.
```bash
asc asset-library images upload --library-id APP_ID --file header-3840x1646.png --category CREATIVE_ASSETS
asc asset-library images upload --library-id APP_ID --file search-result-3840x2560.png --category CREATIVE_ASSETS
asc localizations placements list --localization-id LOC_ID --output json   # já existe um? use swap
asc localizations placements create --localization-id LOC_ID --image-id IMG_ID --placement-type PRODUCT_PAGE_HEADER_ASSET --placement-group DEFAULT_PROFILE
asc localizations placements create --localization-id LOC_ID --image-id IMG_ID --placement-type APP_STORE_SEARCH_RESULTS_ASSET --placement-group DEFAULT_PROFILE
```
O placement volta com `"state":"ACTIVE"` quando deu certo.

## 6. Validar

```bash
asc validate --app APP_ID --version-id VERSION_ID --output table
```

Meta: 0 bloqueios. O que já apareceu:
- `age_rating.missing_field` `socialMedia` / `socialMediaAgeRestricted`: perguntas novas da Apple. App sem rede social: `asc age-rating edit --app-info-id APP_INFO_ID --social-media false --social-media-age-restricted false`. Aproveite e confira `advertising` contra o app (banner de AdMob conta).
- `screenshots.required.ipad_unverified`: ignore se `TARGETED_DEVICE_FAMILY = 1`.
- `privacy.publish_state.unverified`: a API não lê. Peça ao usuário para conferir o App Privacy no site, principalmente se a versão passou a coletar algo novo.

Termine dizendo ao usuário: o que subiu (com ids), o que não deu para verificar (como a arte fica na loja real só aparece depois da aprovação) e o que ficou para ele.

## Armadilhas já vistas

- **Fonte:** o Google Fonts declara uma face por subconjunto Unicode e só carrega os usados; `render.mjs` só avisa quando nenhuma face da família carregou.
- **Ponto final em título grande** fica solto da palavra em fontes de display como a Plus Jakarta Sans. O template de screenshot já puxa `.` e `,` para perto (`punctuationPull`). No search result, que não tem esse ajuste, tire os pontos.
- **Espaçamento do título depende da fonte:** Inter Tight com −0,025em gruda as palavras curtas ("orjust"), use −0,015em; Plus Jakarta Sans 800 aguenta −0,035em.
- **Ajuste automático do título:** compare largura inteira com largura inteira (`scrollWidth > clientWidth`). Com um limite em ponto flutuante, o arredondamento em 1284×2778 fazia o título encolher até o mínimo.
- **Botão desabilitado no iOS 26** (`.disabled`) esmaece o rótulo, inclusive o da resposta certa depois de corrigir. É o app de verdade; não maquie, anote para o redesign.
- **Alfa:** screenshot de página opaca no Chromium já sai RGB sem alfa. O `check.sh` confirma.
- **Moldura:** `asc screenshots frame` exige Koubou 0.18.1 exato. O template desenha a moldura em CSS e a ilha dinâmica por cima (captura de simulador não tem ilha).
- **Conjuntos `IMESSAGE_APP_*`** em app sem extensão de iMessage: não aparecem na loja; não confunda com o conjunto `APP_IPHONE_67`.
- **Conteúdo corrigido:** se a versão corrigiu uma questão, resposta ou número, procure esse conteúdo nos screenshots antigos antes de reaproveitar uma captura.
