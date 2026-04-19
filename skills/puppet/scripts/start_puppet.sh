#!/bin/zsh
set -e
PORT_VALUE="${1:-${PUPPET_PORT:-4017}}"
puppet server start --port "${PORT_VALUE}"
if [ "${PORT_VALUE}" = "4017" ]; then
  echo "Puppet default port uses the extension background worker."
else
  echo "For custom ports run: puppet configure chrome-extension://EXTENSION_ID/sidepanel.html"
  echo "Then run: puppet extension open --port ${PORT_VALUE}"
fi
