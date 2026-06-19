import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { refreshCommodityIdCache } from './lib/interest.js';
import { resetMasterSequences } from './lib/reset-sequences.js';
import { getLocalStorageRoot, getStorageDriver } from './lib/storage.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = Number(process.env.PORT ?? 3002);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5174',
    credentials: true,
  })
);
app.use(express.json());

if (getStorageDriver() === 'local') {
  app.use('/api/v1/files', express.static(getLocalStorageRoot()));
}

app.use('/api/v1', apiRouter);

app.use(errorHandler);

async function start() {
  try {
    await resetMasterSequences();
    await refreshCommodityIdCache();
  } catch (err) {
    console.warn('Could not initialize master data helpers:', err);
  }

  app.listen(port, () => {
    console.log(`Pawn ERP API listening on http://localhost:${port}`);
  });
}

void start();
