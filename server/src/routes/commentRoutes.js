import express from 'express';
import {
  getCommentsByDiscussion,
  createComment,
  voteComment,
  deleteComment,
} from '../controllers/commentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, createComment);

router.route('/:id')
  .delete(protect, deleteComment);

router.route('/:id/vote')
  .post(protect, voteComment);

router.route('/discussion/:discussionId')
  .get(getCommentsByDiscussion);

export default router;
