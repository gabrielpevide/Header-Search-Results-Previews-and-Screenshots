# App Store visuals: screenshots, Header and Search Results

A skill for **Claude Code** and **OpenAI Codex** that makes the images on an App Store product page and uploads them to App Store Connect:

- **Screenshots** for iPhone and iPad: a real simulator capture inside an iPhone frame, with a caption, rendered at the exact size App Store Connect accepts (1320×2868, 1284×2778 and others).
- **Product page header**: 3840×1646.
- **Search result**: 3840×2560.

The skill carries the sizes, the safe areas and the review rules that get these images rejected. It renders PNGs with no alpha channel, checks each file before upload, replaces the screenshot set with the `asc` CLI and assigns the header and search result to their slots. It does not submit anything for review.

The instructions in `SKILL.md` are written in Portuguese. Claude and Codex follow them whatever language you write to them in.

[Português abaixo](#português)

## Requirements

- macOS with Xcode and an iOS simulator. A Pro Max simulator captures at 1320×2868, the size of the main screenshot set.
- Node.js 18 or later, and Playwright with Chromium (renders the HTML templates to PNG):
  ```bash
  npm install -g playwright
  npx playwright install chromium
  ```
- The App Store Connect CLI ([asccli.sh](https://asccli.sh)), signed in with an API key:
  ```bash
  brew install asc
  asc auth login
  ```
- Optional: [AXe](https://github.com/cameroncooke/axe), to read and tap the simulator UI from the terminal:
  ```bash
  brew install cameroncooke/axe/axe
  ```

## Install

### Claude Code

For all your projects:

```bash
git clone https://github.com/gabrielpevide/Header-Search-Results-Previews-and-Screenshots.git ~/.claude/skills/app-store-visuals
```

For one project, clone into `.claude/skills/app-store-visuals` at the project root instead. If `~/.claude/skills` did not exist when your session started, start a new session.

### OpenAI Codex (CLI, IDE extension and Codex app)

For all your projects:

```bash
git clone https://github.com/gabrielpevide/Header-Search-Results-Previews-and-Screenshots.git ~/.agents/skills/app-store-visuals
```

For one repository, clone into `.agents/skills/app-store-visuals` at the repository root. If the skill does not show up in `/skills`, restart Codex.

### Update

```bash
git -C ~/.claude/skills/app-store-visuals pull    # or ~/.agents/skills/app-store-visuals
```

## Use

Open your iOS project and ask for what you need:

- "Redo the App Store screenshots for version 1.4."
- "Make a product page header and a search result image for my app."
- "The new version changes the home screen. Update the screenshots that show it."

To call the skill by name, type `/app-store-visuals` in Claude Code, or `$app-store-visuals` in Codex (or pick it from `/skills`).

Tell the agent which app (App Store ID or name) and which version. The version has to be in **Prepare for Submission** in App Store Connect. From there the skill:

1. Downloads the current screenshots and lists what the new version made wrong: counts, labels, screens that changed.
2. Writes the shot list and captions, reusing old captions that are still true.
3. Builds the app, runs it in the simulator with demo data and captures each screen. Any code it changes to reach a state is marked `// TEMP-SCREENSHOT` and reverted afterwards.
4. Renders each screenshot from `shots.json` and checks size, alpha and color space.
5. For the header and search result, draws the art with the safe areas overlaid, then renders the final PNGs.
6. Runs a dry run, replaces the screenshot set, uploads the header and search result and assigns them, then runs `asc validate`.

## What is in the repository

| Path | What it does |
|---|---|
| `SKILL.md` | The workflow the agent follows. |
| `reference/specs.md` | Sizes, safe areas, display types, where each asset is uploaded, and the review rules that reject them. |
| `scripts/render.mjs` | Renders an HTML page to a PNG at an exact size, RGB with no alpha. Optional safe-area guides. |
| `scripts/check.sh` | Checks size, alpha and color space before upload. |
| `templates/screenshot.html` | Data-driven screenshot: pill, eyebrow, headline, subtitle and the capture in an iPhone frame. The headline shrinks to fit the lines you wrote. |
| `templates/header.html`, `templates/search-result.html` | Starting points with the safe areas marked in comments. |
| `examples/certly-1.3/` | A set that shipped: `shots.json`, header, search result, and the temporary seed used for demo data. |

## Using the scripts without an agent

```bash
# One screenshot from shots.json (paths inside shots.json are relative to it)
node scripts/render.mjs templates/screenshot.html 1320 2868 out/01-home.png --data shots.json --index 0

# Header with Apple's areas drawn on top, for checking only
node scripts/render.mjs header.html 3840 1646 /tmp/header-guides.png --guides header

# Check before upload
zsh scripts/check.sh 1320x2868 out/*.png
```

`shots.json` looks like this:

```json
{
  "canvas": { "width": 1320, "height": 2868 },
  "font": { "family": "Plus Jakarta Sans", "css": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=block" },
  "theme": { "bg": "#F3F4F7", "ink": "#101217", "muted": "#5B6070", "accent": "#F2542D", "eyebrowColor": "#B23A1B",
             "headlineWeight": 800, "headlineTracking": "-0.035em", "frame": "#101217" },
  "shots": [
    { "out": "01-home.png", "image": "raw/01-home.png", "pill": "Practice for all four exams",
      "headline": "Know your score\nbefore exam day.", "sub": "One line that adds a fact.", "deviceTop": 780 }
  ]
}
```

## Limits

- Sizes and safe areas were checked against App Store Connect in October 2026. Apple changes them, so the skill reads them again with `asc screenshots sizes --all` and `asc asset-library specs` before each job.
- Still images only. Animated headers and app preview videos are not covered.
- The capture flow is written for SwiftUI apps on the iOS simulator. The templates and scripts work for any app.

## License

MIT. See [LICENSE](LICENSE).

---

## Português

Skill para **Claude Code** e **OpenAI Codex** que cria e sobe as imagens da página do app na App Store: screenshots de iPhone e iPad (captura real do simulador numa moldura de iPhone, com legenda), o Header (3840×1646) e o Search Results (3840×2560). Ela conhece as medidas, as áreas seguras e as regras de revisão, gera PNG sem transparência, confere cada arquivo e sobe tudo pelo `asc`. Não envia nada para revisão.

**Pré-requisitos:** macOS com Xcode e simulador, Node.js 18+ com Playwright (`npm install -g playwright` e `npx playwright install chromium`), o `asc` (`brew install asc` e `asc auth login`) e, se quiser, o AXe (`brew install cameroncooke/axe/axe`).

**Instalar no Claude Code:**

```bash
git clone https://github.com/gabrielpevide/Header-Search-Results-Previews-and-Screenshots.git ~/.claude/skills/app-store-visuals
```

**Instalar no Codex:**

```bash
git clone https://github.com/gabrielpevide/Header-Search-Results-Previews-and-Screenshots.git ~/.agents/skills/app-store-visuals
```

Para um projeto só, clone em `.claude/skills/app-store-visuals` (Claude Code) ou `.agents/skills/app-store-visuals` (Codex) dentro do projeto.

**Usar:** no projeto do app, peça "refaz os screenshots da versão 1.4" ou "cria o header e o search result do meu app". Para chamar pelo nome: `/app-store-visuals` no Claude Code, `$app-store-visuals` no Codex. Diga qual app e qual versão; a versão precisa estar em **Prepare for Submission** no App Store Connect.
