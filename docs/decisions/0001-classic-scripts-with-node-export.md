# 0001. Classic script files that also export for Node

Status: accepted (Round 1)

In the context of **a browser game that must open by double-clicking `index.html`
and whose rules must also be testable in Node**,
facing the fact that **browsers refuse to load ES modules (`<script type="module">`)
from `file://` pages, while Node cannot load a plain browser script with no export**,
we decided for **ordinary `<script>` files that end with a tiny block: export through
`module.exports` when it exists (Node), otherwise attach to `window` (browser)**,
and neglected **ES modules (needs a local web server just to play), and a bundler such as
esbuild (adds `node_modules` and a build step to a project that should stay small)**,
to achieve **zero-setup play and zero-setup tests with no libraries**,
accepting **a few lines of boilerplate at the end of each file and global names
(`DinoGame`, `DinoStorage`) in the browser**.
