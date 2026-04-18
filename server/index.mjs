import express from 'express';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import apiRoutes from './api-routes.mjs';
import { sendReadme } from './readme-route.mjs';
import { attachSocketServer } from './socket-server.mjs';

const app = express();
const examplePath = fileURLToPath(new URL('../examples/site', import.meta.url));
const port = Number(process.env.PORT) || 4017;
const server = http.createServer(app);

app.use(express.json({ limit: '10mb' }));
app.use((request, response, next) => {
    response.header('access-control-allow-origin', '*');
    response.header('access-control-allow-headers', 'content-type');
    response.header('access-control-allow-methods', 'GET,POST,OPTIONS');
    if (request.method === 'OPTIONS') return response.sendStatus(204);
    next();
});
app.use('/examples', express.static(examplePath));
app.use('/api', apiRoutes);
app.use(sendReadme);
attachSocketServer(server);
server.listen(port, () => console.log(`Puppet server listening on ${port}`));
