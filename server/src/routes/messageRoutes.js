import express from 'express';
import { getMessagesByChannel, createMessage } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // Secure all message routes with JWT protection

router.post('/', createMessage);
router.get('/:channel', getMessagesByChannel);

export default router;
