---
name: app-store-visuals
description: Makes and uploads the images on any app's App Store page - iPhone and iPad screenshots, the product page header and the search result image - at the right sizes, from real simulator captures, rendered at the exact size and uploaded with asc. Use when the user asks for new or redone screenshots, store images, a header, a search result, creative assets or App Store art, or when a new version changes something the current images show (an item count, a redesigned screen, a new icon).
---

# App Store images: screenshots, header and search results

Works for any iOS app. Nothing here belongs to one app: colors, fonts, copy and screens come from the project at hand. It needs macOS with Xcode and a simulator, Node with Playwright (Chromium) and `asc` (the App Store Connect CLI) signed in. AXe is optional, for navigating the simulator.

Files in this skill:
- `reference/specs.md`: sizes, safe areas, display types, where each asset is uploaded and the rules that get images rejected. Read it before designing.
- `scripts/render.mjs`: HTML to PNG at the exact size, RGB with no alpha, with optional guides and font and image checks.
- `scripts/check.sh`: checks size, alpha and color space before upload.
- `templates/screenshot.html`: caption on top, real capture in an iPhone frame below, driven by a `shots.json`.
- `templates/header.html`, `templates/search-result.html`: starting points with the safe areas in comments.
- `examples/certly-1.3/`: a set that shipped: `shots.json`, `header.html`, `search-result.html` and `ScreenshotSeed.swift.txt` (the temporary demo data seed and the hooks it needed). The image paths in `shots.json` point to the Certly project: it is a reference, not something to run from here.

In the commands below, `SKILL` is this skill's folder: `~/.claude/skills/app-store-visuals` in Claude Code, `~/.agents/skills/app-store-visuals` in Codex.

## 0. Gather the context

1. **App and editable version.** The app id comes from the project's `CLAUDE.md` or `AGENTS.md`, when it is written there, or from `asc apps list`. The version has to be in `PREPARE_FOR_SUBMISSION`:
   ```bash
   asc versions list --app APP_ID --output table
   asc localizations list --version VERSION_ID --output table   # the en-US localization id
   ```
2. **What is live today.** Download the thumbnails and look at each one (Read the PNG). Write down what this version made false: numbers, labels, screens that changed, answers the content corrected.
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
3. **Brand.** Colors and fonts from the app's token file (`DesignSystem.swift`, `Color+*.swift`, `Theme.swift` or the CSS of the app's site), and the current icon. The art uses only the app's palette.
4. **What the version brings.** Read the What's New and the diff. A new feature that changes the decision to install gets a screen.

## 1. Shot list

- 5 or 6 screens. The first answers "what is it and why do I want it". The first 3 show without scrolling.
- One idea per screen, shown in the real app. A caption of about 7 words at most, and an optional one-line subtitle.
- A caption is store copy: direct and concrete, no em dash, no "best" or "#1", no price. If a copy-editing skill is installed (for example `no-ai-slop`), run the captions through it.
- Reuse old captions that are still true: the user already approved that tone.
- If the user only asked to redo or update, go ahead with the shot list and show the result. If it is the app's first set, show the screens and captions in a message before capturing.

## 2. Capture in the simulator

Use a simulator whose native screen is already 6.9" (Pro Max, 1320×2868): the capture goes into the frame without losing sharpness.

```bash
UDID=$(xcrun simctl list devices available | grep -m1 "Pro Max" | grep -oE '[0-9A-F-]{36}')
xcrun simctl boot $UDID 2>/dev/null; open -a Simulator
xcrun simctl status_bar $UDID override --time 9:41 --batteryState discharging --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork wifi   # "charged" draws a bolt on the battery
xcrun simctl ui $UDID appearance light        # or dark, if the screen is shown in dark mode
xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath /tmp/shots-dd build CODE_SIGNING_ALLOWED=NO
xcrun simctl install $UDID /tmp/shots-dd/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch $UDID BUNDLE_ID
xcrun simctl io $UDID screenshot raw/01-home.png
```

**Demo data.** An empty screen sells badly, and made-up data the app would never show is not allowed. The data is for demonstration, but every number on screen has to come out of the app's real logic. To reach a state (history, a score, a mock exam result):
- Try the real path first: use the app in the simulator.
- When the real path is too long, edit the code temporarily: `cp` each file first, mark each line with `// TEMP-SCREENSHOT`, capture, restore from the `cp`, delete new files, and confirm that `grep -rn TEMP-SCREENSHOT` comes back empty and that `git status` shows only what was already there.
- A pattern that worked (Certly 1.3):
  - A `ScreenshotSeed.swift` file that writes to `UserDefaults` what the services read in `init` (progress, streak, chosen exam, onboarding done).
  - The seed runs before the app's state is created: replace `@State private var appState = AppState()` with `@State private var appState: AppState` and an `init() { ScreenshotSeed.run(); _appState = State(wrappedValue: AppState()) }`. A property's default value is evaluated before the body of `init`.
  - Dates relative to `Date()`, so "today" and "overdue" match the time of the capture.
  - An alternative state through a launch argument (`xcrun simctl launch $UDID BUNDLE -screenshotFirstRun`, read with `CommandLine.arguments`) instead of another build.
  - Shuffled queue: sort the chosen items first. Long flow (a 60-question mock exam): prefill the answers and let the app work out the score.
  - Temporarily turn off the tracking prompt (ATT) and the start of the ads SDK: system alerts and banners stay out of screenshots.
- Don't use `simctl spawn defaults write` to force a state: the simulator's `cfprefsd` serves the old value to the app.

**Navigate.** `axe describe-ui --udid $UDID` lists buttons with their `AXLabel` and `frame` in points (the Pro Max is 440×956 pt). To tap, your agent's simulator tool (for example the iOS Simulator MCP with `tap` at x, y) was the most reliable. `axe tap -x -y` sometimes doesn't register. Button off screen: scroll with `swipe` and read the `frame` again.

**Look at each capture** (Read the PNG) before composing:
- Wait 1 to 2 s after navigating: an entrance animation caught halfway looks like a bug.
- Open keyboard, alert, spinner or cut-off text: capture again.
- Treat the capture as QA. An empty chart with a full number, a count that doesn't match, text the version corrected: that is a bug in the app. Fix it in the code (a real fix, with no TEMP mark), capture again, and tell the user the build in the store needs the fix.
- `xcrun simctl io screenshot` doesn't draw the Dynamic Island. The template does.

## 3. Compose and render the screenshots

Keep everything in the app's repository, so the next version only swaps captures and captions:

```
aso/screenshots/<version>/shots.json
aso/screenshots/<version>/raw/*.png        simulator captures
aso/screenshots/<version>/1320x2868/*.png  output to upload
```

`shots.json` (paths relative to it):

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

Fields of each screen, top to bottom:
- `pill`: rounded label with a dot in the accent color (good for the first screen).
- `eyebrow`: short all-caps line in `eyebrowColor` ("MISSED QUESTIONS").
- `tick`: accent mark, only shown when there is no `pill` and no `eyebrow`. `tick: false` removes it.
- `headline`: use `\n` to break lines. The size shrinks on its own until the longest line fits. `headlineSize` changes the starting point (default 112).
- `sub`: one or two lines, balanced wrap.
- `chips`: a row of labels in mono.
- `dark`, `background`, `deviceTop` and `deviceWidth` (px on a 1320 canvas, default 700 and 1000), `island: false` if the capture already has the island.

Fields of `theme`: `bg`, `ink`, `muted`, `accent`, `frame`, `eyebrowColor`, `surface` (the pill's background), `line`, `headlineWeight` (default 700), `headlineTracking` (default −0.015em), `punctuationPull` (default −0.06em: pulls `.` and `,` closer to the letter) and the `dark*` versions.

**Match the app's site.** When the app has a site, copy from it: background color, text color, accent, font, headline weight and tracking, and the eyebrow color. Reuse the site's main headline on the first screen. Example in `examples/certly-1.3/shots.json`, which follows Certly's site: Plus Jakarta Sans 800, −0.035em, background `#F3F4F7`, eyebrows `#B23A1B`.

`deviceTop` values that worked: 600 to 640 with an eyebrow and a 2-line headline, 760 to 800 with a subtitle, 900 with a subtitle and chips. The frame runs past the bottom edge on purpose.

**Other sizes.** The same `shots.json` renders at 1284×2778 by changing only the `canvas`, and the layout scales with it. Do this when the version has a 6.5" set (or an old 1284 set to replace).

```bash
cd aso/screenshots/<version>; mkdir -p 1320x2868
n=$(python3 -c "import json;print(len(json.load(open('shots.json'))['shots']))")
for i in $(seq 0 $((n-1))); do
  out=$(python3 -c "import json;print(json.load(open('shots.json'))['shots'][$i]['out'])")
  node $SKILL/scripts/render.mjs $SKILL/templates/screenshot.html 1320 2868 1320x2868/$out --data shots.json --index $i
done
zsh $SKILL/scripts/check.sh 1320x2868 1320x2868/*.png
```

To review, shrink (`sips -Z 900 file --out /tmp/x.png`) and look at each one. Check that the caption doesn't touch the frame, that no number contradicts the version's description, and that the demo data looks like real use.

If an app needs another layout (landscape, no frame, caption below), copy the template to the version's folder and edit the copy. Keep the `shots.json` format.

## 4. Header and search results

1. Copy `templates/header.html` and `templates/search-result.html` to `aso/creative/<version>/`.
2. Replace the colors, the font and the `.focal` art with the app's motif (the icon's drawing works well: it ties the art to the icon shown right below). Use the icon's SVGs when they exist.
3. The search result takes a concrete headline of up to 6 words (a count, a format). The header usually has no text.
4. Render with guides and look:
   ```bash
   node $SKILL/scripts/render.mjs header.html 3840 1646 /tmp/header-guides.png --guides header
   node $SKILL/scripts/render.mjs search-result.html 3840 2560 /tmp/search-guides.png --guides search
   sips -Z 1600 /tmp/header-guides.png --out /tmp/h.png; sips -Z 1600 /tmp/search-guides.png --out /tmp/s.png
   ```
   Yellow is the safe area (art and text inside it). Green, on the header, is the top strip the status bar covers. Cyan is what the iPhone shows.
5. Render without guides and check:
   ```bash
   node $SKILL/scripts/render.mjs header.html 3840 1646 header-3840x1646.png
   node $SKILL/scripts/render.mjs search-result.html 3840 2560 search-result-3840x2560.png
   zsh $SKILL/scripts/check.sh 3840x1646 header-3840x1646.png
   zsh $SKILL/scripts/check.sh 3840x2560 search-result-3840x2560.png
   ```

## 5. Upload

Only on the version in `PREPARE_FOR_SUBMISSION`. Never submit for review without the user's explicit ok.

**Screenshots.** Run the dry run, read what will be deleted, then run it for real. The order in the store is the order of the file names. Use the `--device-type` of the set the version already has (`asc screenshots list` shows `APP_IPHONE_67` or `APP_IPHONE_69`): `--replace` only touches that set.
```bash
asc screenshots upload --version-localization LOC_ID --path 1320x2868 --device-type IPHONE_67 --replace --dry-run
asc screenshots upload --version-localization LOC_ID --path 1320x2868 --device-type IPHONE_67 --replace --confirm --concurrency 1
```
`--concurrency 1` uploads one file at a time. With the default (4 in parallel) the uploads finish out of order.

**Check what Apple serves**, not only what the upload returned. In today's App Store Connect each screenshot is also an Asset Library placement. List them in display order, download the thumbnails and look:
```bash
asc localizations placements list --localization-id LOC_ID --include image --placement-type APP_SCREENSHOT \
  --sort placementGroupPosition --output json > /tmp/placements.json
python3 - <<'EOF'
import json, urllib.request
raw = open('/tmp/placements.json').read(); d = json.loads(raw[raw.index('{'):])
inc = {i['id']: i for i in d.get('included', [])}
for n, p in enumerate(d['data']):
    img = inc[p['relationships']['image']['data']['id']]['attributes']
    print(n + 1, img['fileName'], img['createdDate'])
    urllib.request.urlretrieve(img['imageAsset']['templateUrl'].replace('{w}x{h}bb.{f}', '300x652bb.png'), f'/tmp/served-{n + 1}.png')
EOF
```
Without `--sort placementGroupPosition` the list comes out of display order, so don't conclude anything about order without it.

If the user says "it didn't change", check first which version they are looking at. The version on sale (`READY_FOR_SALE`) doesn't accept image changes, and it is the one the store shows until the new one is approved. The new version's screen in App Store Connect sometimes only updates after you reload the page.

**Header and search results.** The Asset Library id is the app id.
```bash
asc asset-library images upload --library-id APP_ID --file header-3840x1646.png --category CREATIVE_ASSETS
asc asset-library images upload --library-id APP_ID --file search-result-3840x2560.png --category CREATIVE_ASSETS
asc localizations placements list --localization-id LOC_ID --output json   # one already there? use swap
asc localizations placements create --localization-id LOC_ID --image-id IMG_ID --placement-type PRODUCT_PAGE_HEADER_ASSET --placement-group DEFAULT_PROFILE
asc localizations placements create --localization-id LOC_ID --image-id IMG_ID --placement-type APP_STORE_SEARCH_RESULTS_ASSET --placement-group DEFAULT_PROFILE
```
The placement comes back with `"state":"ACTIVE"` when it worked.

## 6. Validate

```bash
asc validate --app APP_ID --version-id VERSION_ID --output table
```

Goal: 0 blockers. What has shown up before:
- `age_rating.missing_field` `socialMedia` / `socialMediaAgeRestricted`: new questions from Apple. For an app with no social features: `asc age-rating edit --app-info-id APP_INFO_ID --social-media false --social-media-age-restricted false`. While there, check `advertising` against the app (an AdMob banner counts).
- `screenshots.required.ipad_unverified`: ignore it if `TARGETED_DEVICE_FAMILY = 1`.
- `privacy.publish_state.unverified`: the API can't read it. Ask the user to check App Privacy on the website, above all if the version started collecting something new.

Finish by telling the user what was uploaded (with ids), what could not be verified (how the art looks in the real store only shows after approval) and what is left for them.

## Pitfalls seen before

- **Font:** Google Fonts declares one face per Unicode subset and only loads the ones in use. `render.mjs` only warns when no face of the family loaded.
- **A period in a large headline** drifts away from the word in display fonts such as Plus Jakarta Sans. The screenshot template already pulls `.` and `,` closer (`punctuationPull`). The search result doesn't have that adjustment, so drop the periods there.
- **Headline tracking depends on the font:** Inter Tight at −0.025em glues short words together ("orjust"), so use −0.015em. Plus Jakarta Sans 800 can take −0.035em.
- **Automatic headline fit:** compare whole width with whole width (`scrollWidth > clientWidth`). With a floating-point limit, rounding at 1284×2778 made the headline shrink to the minimum.
- **A disabled button on iOS 26** (`.disabled`) fades its label, including the right answer's label after grading. That is the real app: don't touch it up, note it for the redesign.
- **Alpha:** a screenshot of an opaque page in Chromium already comes out RGB with no alpha. `check.sh` confirms it.
- **Frame:** `asc screenshots frame` requires exactly Koubou 0.18.1. The template draws the frame in CSS and the Dynamic Island on top (a simulator capture has no island).
- **`IMESSAGE_APP_*` sets** in an app with no iMessage extension don't show in the store. Don't confuse them with the `APP_IPHONE_67` set.
- **Corrected content:** if the version corrected a question, an answer or a number, look for that content in the old screenshots before reusing a capture.
