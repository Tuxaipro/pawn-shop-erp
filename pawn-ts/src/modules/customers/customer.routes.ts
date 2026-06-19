import { Router } from 'express';
import { sendSuccess } from '../../shared/response.js';
import {
  createCustomerSchema,
  kycDocumentTypeSchema,
  listCustomersQuerySchema,
  searchCustomersQuerySchema,
  updateCustomerSchema,
} from './customer.schema.js';
import { listCustomerActivities } from './customer.activity.js';
import * as customerService from './customer.service.js';
import { upload } from './customer.upload.js';

export const customerRouter = Router();

customerRouter.get('/next-id', async (_req, res, next) => {
  try {
    const customerId = await customerService.getNextCustomerId();
    sendSuccess(res, { customerId });
  } catch (e) {
    next(e);
  }
});

customerRouter.get('/search', async (req, res, next) => {
  try {
    const { q, limit } = searchCustomersQuerySchema.parse(req.query);
    const data = await customerService.searchCustomers(q, limit);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

customerRouter.get('/overdue-print', async (_req, res, next) => {
  try {
    const data = await customerService.getOverdueCustomerAddresses();
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

customerRouter.get('/', async (req, res, next) => {
  try {
    const query = listCustomersQuerySchema.parse(req.query);
    const data = await customerService.listCustomers(query);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

customerRouter.get('/:id/activities', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await customerService.getCustomerById(id);
    const data = await listCustomerActivities(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

customerRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await customerService.getCustomerById(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

customerRouter.post('/', async (req, res, next) => {
  try {
    const body = createCustomerSchema.parse(req.body);
    const data = await customerService.createCustomer(body, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

customerRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = updateCustomerSchema.parse(req.body);
    const data = await customerService.updateCustomer(id, body, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

customerRouter.post('/:id/photo', upload.single('photo'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!req.file) {
      res.status(422).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Photo file is required' },
      });
      return;
    }
    const data = await customerService.uploadCustomerPhoto(id, req.file, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

customerRouter.post('/:id/kyc', upload.single('document'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const documentType = kycDocumentTypeSchema.parse(req.body.documentType);
    if (!req.file) {
      res.status(422).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Document file is required' },
      });
      return;
    }
    const data = await customerService.uploadKycDocument(id, documentType, req.file, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

customerRouter.delete('/:id/kyc/:docId', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const docId = Number(req.params.docId);
    const data = await customerService.deleteKycDocument(id, docId, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

customerRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await customerService.deleteCustomer(id, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
