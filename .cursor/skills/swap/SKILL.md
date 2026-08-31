---
name: swap
description: >
  Replace a word or repo name everywhere in a folder. Use when the user
  wants find-and-replace across a whole project, rename a token in every
  file, or delete a word from a tree. Do NOT edit files yourself. Run the
  script. Read the receipt. That is the proof.
---

# swap

You do not edit the tree. The script does. If you search-replace by hand
you leave a trail. Run the tool, then read the receipt. Stop.

```
node .cursor/skills/swap/swap.js --from OLD --to NEW --root .
```

`--to` may be empty to delete the token. Exact string, not a regex.
Skips `.git` and `node_modules`. Skips non-text. Renames files and
folders that contain the token. Does not rewrite files with no hit.
Does not commit. Does not add comments.

Writes `swap-receipt.json` in `--root` (or `--out PATH`). Read that
file. Tell the user the summary line. Do not commit the receipt.

If the receipt `ok` is true, the swap happened. Do not edit files to
"confirm."

The one check: `node .cursor/skills/swap/swap.js --check`
