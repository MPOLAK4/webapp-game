# 0002. Store the high score in localStorage, behind a small store object

Status: accepted (Round 1). The choice of localStorage was confirmed by the project owner.

In the context of **R3, keeping the high score between visits** ("save file/cookie storage"),
facing **three options: a cookie, `localStorage`, or a save file the player downloads and
re-opens**,
we decided for **`localStorage` under the key `dino-high-score`, accessed only through a
store object with `load()` and `save(score)`**,
and neglected **cookies (many browsers drop cookies for `file://` pages, they are sent to
servers for no reason, and the 4 KB limit is irrelevant but the API is awkward) and a
downloaded save file (the player would have to find and re-open it by hand)**,
to achieve **a high score that survives reloads with no setup, and a game that tests can
run against a fake store**,
accepting **that the score lives in one browser on one machine, can be cleared by the
player, and that `localStorage` can be blocked: then the score lasts only for that page
visit (R3.4)**.
