---
version: 1
slug: "src-components-wrestlermodal-wrestlermodal-tsx"
primary_target: "src/components/WrestlerModal/WrestlerModal.tsx"
related_targets: ["src/components/StableModal/StableModal.tsx"]
---

# Surface: the wrestler and stable dialogs

Scope: the wrestler dialog (`?rikishi=`) and its sibling the stable dialog (`?heya=`), opened from the List. Visitor mode: Operate.
Audience and job: a fan who tapped a name — on a phone in the evening, "how is he doing this basho, what does he need, who is he"; on desktop, a look-up. Hop wrestler → stable → member and back.
Constraints: content, behaviour, focus handling, URL push/replace and keyboard stepping unchanged; inherits the Sports Page world in DESIGN.md (square, two plates and ink, flat print, three keyframes); controls ≥44px on a phone; works without profiles or stables files; works without a photo.
Memorable moment: the champion's card — name under the highlighter, 優勝 stamped on the record bar.

## Direction contract

THESIS: The wrestler as a sports daily's player-file entry (選手名鑑): portrait beside a big condensed name, then ink section bars over a 星取表 plate, the bout lines and an agate fact table. Refuses the centred rounded profile card with a floating photo and a loose two-column facts grid.

OWN-WORLD: White sheet opened by a 5px ink rule, square 1.5px-ink controls, ink section bars (`--bar`) with condensed 900 caps, hairline rows, Sofia Sans Condensed 850 name, Noto Serif JP for name kanji, rank kanji and ○●; rank kanji in red for sanyaku, a solid `--band` block for Yokozuna; no blur, no tinted panels.

STORY: The visitor reads who and what rank at once, sees the basho as fifteen marks in three groups of five with the score, reads what is still needed and the next bout, scans bouts, then profile, career and the name's meaning; steps ‹ › along the banzuke, opens the stable, copies a link.

FIRST VIEWPORT: Sticky toolbar: joined ‹ › stepper left, square ✕ right. Head: 3:4 portrait (≈96px phone, 120px desktop) left; right: rank kanji + side seal + rank label, the name at ~2.6rem condensed 850, the other-script name, stable › · home, status stamp. Then the Record bar with the score and the 星取表 plate. At 390×844 the head and plate are on screen; on a phone the name steps down to ~2rem so a 13-letter name (Ikazuchiarata, Wakamotoharu) fits its column unbroken.

FORM: player file (option 1 of 3, picked by the user) · seed:7423cf35ca76800e (the inherited Sports Page world) · structure in the user's answer: "Player file" — portrait left, name big beside it with the rank kanji stamp and side; facts as a tight agate table; section bars for Record (the 星取表 strip, then bout lines), Career and Name.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
