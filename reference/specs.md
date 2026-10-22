# Medidas e regras da App Store (conferidas em 22/out/2026)

Apple muda isso sem aviso. Antes de cada trabalho, confira ao vivo:

```bash
asc screenshots sizes --all --output table          # tipos de tela e dimensões aceitas
asc asset-library specs --output json > /tmp/specs.json   # header, search result, vídeo
```

Para ler as specs de header e search result do JSON:

```bash
python3 - /tmp/specs.json <<'EOF'
import json,sys
a=json.load(open(sys.argv[1]))['data'][0]['attributes']
for s in a['imageSpecs']:
    if any(p in ('PRODUCT_PAGE_HEADER_ASSET','APP_STORE_SEARCH_RESULTS_ASSET') for p in s['compatiblePlacementTypes']):
        print(s['compatiblePlacementTypes'], s['dimensions'], s['aspectRatio'], s['fileExtensions'], 'alpha', s['alphaAllowed'])
EOF
```

## Screenshots

| Display type (asc) | Tela | Dimensões aceitas (retrato) |
|---|---|---|
| `APP_IPHONE_67` e `APP_IPHONE_69` | 6.9" | 1320×2868, 1290×2796, 1260×2736 |
| `APP_IPHONE_65` | 6.5" | 1284×2778, 1242×2688 |
| `APP_IPHONE_61` | 6.3"/6.1" | 1206×2622, 1179×2556 |
| `APP_IPAD_PRO_3GEN_129` | iPad 13" | 2064×2752, 2048×2732 |

- O asc marca `APP_IPHONE_65` e iPad 13" como obrigatórios. Na prática um conjunto 6.9" (1320×2868) cobre o iPhone: a loja reduz para os tamanhos menores.
- iPad só se o app roda em iPad: `TARGETED_DEVICE_FAMILY` no `project.pbxproj` contém `2`. Se for `1`, ignore o aviso `screenshots.required.ipad_unverified` do `asc validate`.
- De 1 a 10 por conjunto. As 3 primeiras aparecem sem rolar e decidem a maior parte das instalações.
- PNG ou JPEG, RGB, sem canal alfa, sem cantos transparentes.
- Os conjuntos `IMESSAGE_APP_*` só valem para app com extensão de iMessage. Imagem de app comum caída ali não aparece na loja.
- Screenshots são por versão: trocar na versão em `PREPARE_FOR_SUBMISSION` não mexe na versão que está no ar.

## Product page header (`PRODUCT_PAGE_HEADER_ASSET`)

- Imagem: **3840×1646 PNG** (21:9), sem alfa. Também aceita a universal 5244×2950 PNG (16:9), que serve para header e search result ao mesmo tempo.
- Vídeo também é aceito (MP4, em loop, mudo). Esta skill faz imagem parada; para animado, use o MCP `appdesigns` (`get_design_guide` asset `header`, depois `create_design`).
- O iPhone mostra só x 0,161 a 0,839 (os 2606 px do meio, altura toda). As faixas laterais aparecem só em iPad e Mac.
- Área segura da Apple: x 0,286 a 0,714, y 0,3 a 0,701 (em pixels: x 1098 a 2742, y 494 a 1154). Arte principal e qualquer texto ficam aí.
- A barra de status e os botões de voltar e compartilhar ficam sobre o topo: nada de texto ou detalhe pequeno nos 38% de cima (y < 625) ao lado da área segura.
- A loja mostra nome e ícone do app logo abaixo do header. A arte não precisa repetir.

## Search result (`APP_STORE_SEARCH_RESULTS_ASSET`)

- Imagem: **3:2**, de 1920×1280 a **3840×2560**, PNG ou JPEG, sem alfa. Ou a universal 5244×2950.
- Área segura: x 0,218 a 0,782, y 0,299 a 0,701 (em 3840×2560: x 837 a 3003, y 765 a 1795).
- Aparece com uns 370 pt de largura. Título com 180 px no canvas de 3840 lê como ~17 pt.

## Onde cada coisa sobe

| O quê | Comando | Categoria / grupo |
|---|---|---|
| Screenshots | `asc screenshots upload --version-localization LOC --path DIR --device-type IPHONE_67` | display type |
| Header | `asc asset-library images upload` + `asc localizations placements create --placement-type PRODUCT_PAGE_HEADER_ASSET` | `CREATIVE_ASSETS`, grupo `DEFAULT_PROFILE` |
| Search result | idem, `--placement-type APP_STORE_SEARCH_RESULTS_ASSET` | `CREATIVE_ASSETS`, grupo `DEFAULT_PROFILE` |

- O id da Asset Library é o próprio app id (`asc asset-library view --app APP_ID`).
- Um header e um search result por localização (`maxCount 1`). Para trocar, use `asc localizations placements swap` ou `delete` + `create`.
- Na primeira versão do app, header e search result vão para revisão junto com a versão. Depois de uma versão aprovada, podem ir para revisão sozinhos (`asc review items add --item-type appAssetLibraryImages`).

## Regras de conteúdo que reprovam

- **2.3.3:** screenshot mostra o app em uso. Tela de título, splash ou login sozinhos não servem.
- **2.3.7:** nada de preço, termo de outra loja, nome de app concorrente ou marca de terceiro para atrair busca.
- **2.3.10:** nada de outras plataformas (Android, outras lojas).
- **2.3.14 e boas práticas de asset:** em header e search result, nada de preço, desconto, URL, ©, prêmio da Apple, nome de outra loja nem afirmação que ninguém confere ("best", "#1", "the only").
- Conteúdo do screenshot tem que bater com o app desta versão: números, rótulos e telas reais. Se a versão muda um número que aparece na arte (total de questões, preço), refaça a arte.
- Barra de status limpa: 9:41, bateria cheia, sinal cheio (`xcrun simctl status_bar ... override`).
