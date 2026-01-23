import { Router } from 'express';
import { db } from '../db/index.js';
import { pastes } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { pasteLimiter } from '../middleware/rateLimiter.js';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const router = Router();

const createPasteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(500000),
  expiresIn: z.number().positive().optional(), // hours
});

// Create paste
router.post('/', authMiddleware, pasteLimiter, async (req: AuthRequest, res) => {
  try {
    const { title, content, expiresIn } = createPasteSchema.parse(req.body);

    const shareId = nanoid(10);
    let expiresAt: Date | null = null;

    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
    }

    const [paste] = await db
      .insert(pastes)
      .values({
        shareId,
        title: title || 'Untitled',
        content,
        userId: req.userId!,
        expiresAt,
      })
      .returning();

    res.status(201).json({
      message: 'Paste created successfully',
      paste: {
        id: paste.id,
        shareId: paste.shareId,
        title: paste.title,
        content: paste.content,
        createdAt: paste.createdAt,
        expiresAt: paste.expiresAt,
        shareUrl: `${req.protocol}://${req.get('host')}/share/${paste.shareId}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's pastes
router.get('/my-pastes', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userPastes = await db.query.pastes.findMany({
      where: eq(pastes.userId, req.userId!),
      orderBy: [desc(pastes.createdAt)],
      columns: {
        id: true,
        shareId: true,
        title: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    res.json({ pastes: userPastes });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get paste by share ID (public)
router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    const paste = await db.query.pastes.findFirst({
      where: eq(pastes.shareId, shareId),
    });

    if (!paste) {
      return res.status(404).json({ error: 'Paste not found' });
    }

    // Check if expired
    if (paste.expiresAt && new Date(paste.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Paste has expired' });
    }

    res.json({
      paste: {
        shareId: paste.shareId,
        title: paste.title,
        content: paste.content,
        createdAt: paste.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete paste
router.delete('/:shareId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { shareId } = req.params;

    const paste = await db.query.pastes.findFirst({
      where: eq(pastes.shareId, shareId),
    });

    if (!paste) {
      return res.status(404).json({ error: 'Paste not found' });
    }

    if (paste.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this paste' });
    }

    await db.delete(pastes).where(eq(pastes.shareId, shareId));

    res.json({ message: 'Paste deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
