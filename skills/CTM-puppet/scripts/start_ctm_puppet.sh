#!/bin/zsh
set -e
cd /Users/abeer/dev/chrome_extension_utils
PORT_VALUE="${2:-${CTM_PUPPET_PORT:-4017}}"
SERVER_URL="http://127.0.0.1:${PORT_VALUE}"
if ! lsof -iTCP:${PORT_VALUE} -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  nohup env PORT="${PORT_VALUE}" npm run server >/tmp/ctm-puppet-server-${PORT_VALUE}.log 2>&1 &
  sleep 2
  echo "CTM Puppet server started on ${SERVER_URL}"
else
  echo "CTM Puppet server already running on ${SERVER_URL}"
fi
CTM_PUPPET_SERVER_URL="${SERVER_URL}" npm run open:extension -- "$1"
echo "Extension opener launched for ${SERVER_URL}"
echo "If /api/instances is empty, the server is ready and waiting for a bound extension page."
