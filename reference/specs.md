# App Store sizes and rules (checked on October 22, 2026)

Apple changes these without notice. Check them live before each job:

```bash
asc screenshots sizes --all --output table          # display types and accepted dimensions
asc asset-library specs --output json > /tmp/specs.json   # header, search result, video
```

To read the header and search result specs from the JSON:

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

| Display type (asc) | Screen | Accepted dimensions (portrait) |
|---|---|---|
| `APP_IPHONE_67` and `APP_IPHONE_69` | 6.9" | 1320×2868, 1290×2796, 1260×2736 |
| `APP_IPHONE_65` | 6.5" | 1284×2778, 1242×2688 |
| `APP_IPHONE_61` | 6.3"/6.1" | 1206×2622, 1179×2556 |
| `APP_IPAD_PRO_3GEN_129` | iPad 13" | 2064×2752, 2048×2732 |

- asc marks `APP_IPHONE_65` and iPad 13" as required. In practice a 6.9" set (1320×2868) covers the iPhone: the store scales it down for the smaller sizes.
- iPad only if the app runs on iPad: `TARGETED_DEVICE_FAMILY` in `project.pbxproj` contains `2`. If it is `1`, ignore the `screenshots.required.ipad_unverified` warning from `asc validate`.
- From 1 to 10 per set. The first 3 show without scrolling and decide most installs.
- PNG or JPEG, RGB, no alpha channel, no transparent corners.
- The `IMESSAGE_APP_*` sets only count for an app with an iMessage extension. A regular app's image placed there doesn't show in the store.
- Screenshots belong to a version: changing them on the version in `PREPARE_FOR_SUBMISSION` doesn't touch the version that is live.

## Product page header (`PRODUCT_PAGE_HEADER_ASSET`)

- Image: **3840×1646 PNG** (21:9), no alpha. The universal 5244×2950 PNG (16:9) is accepted too, and works for the header and the search result at once.
- Video is accepted too (MP4, looping, muted). This skill makes still images. For animated ones, use the `appdesigns` MCP (`get_design_guide` with asset `header`, then `create_design`).
- The iPhone only shows x 0.161 to 0.839 (the middle 2606 px, full height). The side strips only show on iPad and Mac.
- Apple's safe area: x 0.286 to 0.714, y 0.3 to 0.701 (in pixels: x 1098 to 2742, y 494 to 1154). The main art and any text stay there.
- The status bar and the back and share buttons sit over the top: no text or small detail in the top 38% (y < 625) beside the safe area.
- The store shows the app's name and icon right below the header. The art doesn't need to repeat them.

## Search result (`APP_STORE_SEARCH_RESULTS_ASSET`)

- Image: **3:2**, from 1920×1280 to **3840×2560**, PNG or JPEG, no alpha. Or the universal 5244×2950.
- Safe area: x 0.218 to 0.782, y 0.299 to 0.701 (at 3840×2560: x 837 to 3003, y 765 to 1795).
- It shows at about 370 pt wide. A 180 px headline on the 3840 canvas reads as ~17 pt.

## Where each asset is uploaded

| What | Command | Category / group |
|---|---|---|
| Screenshots | `asc screenshots upload --version-localization LOC --path DIR --device-type IPHONE_67` | display type |
| Header | `asc asset-library images upload` + `asc localizations placements create --placement-type PRODUCT_PAGE_HEADER_ASSET` | `CREATIVE_ASSETS`, group `DEFAULT_PROFILE` |
| Search result | same, `--placement-type APP_STORE_SEARCH_RESULTS_ASSET` | `CREATIVE_ASSETS`, group `DEFAULT_PROFILE` |

- The Asset Library id is the app id itself (`asc asset-library view --app APP_ID`).
- One header and one search result per localization (`maxCount 1`). To replace one, use `asc localizations placements swap` or `delete` + `create`.
- On the app's first version, the header and search result go to review with the version. After an approved version, they can go to review on their own (`asc review items add --item-type appAssetLibraryImages`).

## Content rules that get images rejected

- **2.3.3:** a screenshot shows the app in use. A title screen, splash or login alone won't do.
- **2.3.7:** no price, no term from another store, no competing app's name and no third-party brand to attract searches.
- **2.3.10:** no other platforms (Android, other stores).
- **2.3.14 and asset best practices:** on the header and search result, no price, discount, URL, ©, Apple award, other store's name or claim nobody can check ("best", "#1", "the only").
- Screenshot content has to match this version of the app: real numbers, labels and screens. If the version changes a number shown in the art (a question count, a price), redo the art.
- Clean status bar: 9:41, full battery, full signal (`xcrun simctl status_bar ... override`).
