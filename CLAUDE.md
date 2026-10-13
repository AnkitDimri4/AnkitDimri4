# GitHub profile README — working notes for Claude

The README on github.com/AnkitDimri4 and the images it shows. A personal repository on the personal
account. Setting up a new machine: the runbook in the Portfolio repository,
`docs/runbooks/new-machine-setup.md`.

## How it works

- `README.md` shows images from `assets/`, each in a light and a dark version (`<picture>` picks the
  one matching the viewer's theme).
- The images are drawn by two scripts with Chrome or Edge (found on macOS, Windows and Linux;
  `CHROME_PATH` overrides):
  - `node scripts/brain-map.mjs`: the brain map and the "Explore the live brain map" button.
  - `node scripts/readme-cards.mjs`: the FileSure work card, the project cards, the stack and the
    link buttons. Icons and brand colours come from `assets/cards/icons.json`.
- To change what an image says, edit the lists at the top of its script, run it, look at the PNGs,
  then commit the script and the images together.
- `assets/work-contributions.json` holds my FileSure contribution counts (25 Apr – 31 Oct 2026).
  Leave it as it is.

## How to work here

- Commit straight to `main` as Ankit Dimri <dimri.ankitdimri@gmail.com>; this repository doesn't use PRs.
- Personal accounts only. Never mention or link the work GitHub account, FileSure repositories or Linear.
- FileSure detail stays public-safe: only what is already public on the brain map, the app stores,
  filesure.in and api.filesure.in.
- No Claude credit: no `Co-Authored-By` lines in commits.
- Before pushing, look at both the light and the dark images.
