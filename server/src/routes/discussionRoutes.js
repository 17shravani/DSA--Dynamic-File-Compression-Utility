import express from 'express';
import {
  getDiscussions,
  getDiscussionById,
  createDiscussion,
  voteDiscussion,
  deleteDiscussion,
} from '../controllers/discussionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getDiscussions)
  .post(protect, createDiscussion);

router.route('/:id')
  .get(getDiscussionById)
  .delete(protect, deleteDiscussion);

router.route('/:id/vote')
  .post(protect, voteDiscussion);

export default router;
