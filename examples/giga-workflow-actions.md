# Giga Workflow Puppet Actions

Use this example when a Codex run needs to inspect workflow UI behavior without reading the full Puppet reference.

Start Puppet first:

```bash
puppet server start --port 4017
puppet instances --port 4017
```

The controlled Chrome profile must already be logged in. Default target is `http://localhost:5173/workflows`.

Commands:

```bash
node examples/giga-workflow-actions.mjs open-workflow
node examples/giga-workflow-actions.mjs open-designer
NODE_ID=output_format_11 node examples/giga-workflow-actions.mjs open-node-inspector
NODE_ID=output_format_11 node examples/giga-workflow-actions.mjs run-node
NODE_ID=output_format_11 node examples/giga-workflow-actions.mjs save-node
NODE_ID=output_format_11 node examples/giga-workflow-actions.mjs close-inspector
node examples/giga-workflow-actions.mjs play-local
node examples/giga-workflow-actions.mjs play-server
node examples/giga-workflow-actions.mjs export-workflow
```

Environment:

```bash
APP_URL=http://localhost:5173/workflows
PUPPET_URL=http://127.0.0.1:4017
WORKFLOW_NAME="Exact workflow title"
NODE_ID=output_format_11
```

Stable selectors:

```text
[data-cy="workflow-catalog-page"]
[data-cy^="workflow-record-"]
[data-cy="open-workflow-designer"]
[data-cy="workflow-canvas"]
[data-cy="workflow-node"][data-node-id="..."]
[data-cy="workflow-node-inspector"]
[data-cy="workflow-inspector-action-run-node"]
[data-cy="workflow-inspector-action-save-changes"]
[data-cy="workflow-inspector-action-close-node"]
[data-cy="workflow-run-menu"]
[data-cy="workflow-play-local"]
[data-cy="workflow-play-server"]
```

Token rule: this script returns only `{ record, snapshot }`. Use `page.evaluate()` for targeted facts. Do not return `page.data(..., { snapshot: true })` or full compare payloads unless you also request compact output and read the artifact path.
