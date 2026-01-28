import { Router } from 'express';
import { db } from '../db/index.js';
import { pastes, pastePermissions, users } from '../db/schema.js';
import { eq, and, desc, or } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { pasteLimiter } from '../middleware/rateLimiter.js';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const createPasteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(500000),
  expiresIn: z.number().positive().optional(), // hours
  sharedWith: z.array(z.object({
    username: z.string(),
    canEdit: z.boolean().default(false),
  })).optional(),
});

// Create paste
router.post('/', authMiddleware, pasteLimiter, async (req: AuthRequest, res) => {
  try {
    const { title, content, expiresIn, sharedWith } = createPasteSchema.parse(req.body);

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

    // Add shared permissions
    if (sharedWith && sharedWith.length > 0) {
      for (const share of sharedWith) {
        const sharedUser = await db.query.users.findFirst({
          where: eq(users.username, share.username),
        });

        if (sharedUser && sharedUser.id !== req.userId) {
          await db.insert(pastePermissions).values({
            pasteId: paste.id,
            userId: sharedUser.id,
            canEdit: share.canEdit,
          });
        }
      }
    }

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

    // Get pastes shared with the user
    const sharedPastes = await db
      .select({
        id: pastes.id,
        shareId: pastes.shareId,
        title: pastes.title,
        createdAt: pastes.createdAt,
        expiresAt: pastes.expiresAt,
        canEdit: pastePermissions.canEdit,
      })
      .from(pastePermissions)
      .innerJoin(pastes, eq(pastePermissions.pasteId, pastes.id))
      .where(eq(pastePermissions.userId, req.userId!))
      .orderBy(desc(pastes.createdAt));

    res.json({
      pastes: userPastes,
      sharedPastes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get paste by share ID (public, but includes permission info if authenticated)
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

    // Check if user is authenticated and has permissions
    const token = req.headers.authorization?.split(' ')[1];
    let canEdit = false;
    let isOwner = false;

    console.log('GET paste - Token present:', !!token);

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; userRole: string };
        console.log('GET paste - Decoded userId:', decoded.userId, 'Paste ownerId:', paste.userId);

        // Check if owner
        isOwner = paste.userId === decoded.userId;

        if (isOwner) {
          canEdit = true;
          console.log('GET paste - User is owner, canEdit=true');
        } else {
          // Check if user has edit permission
          const permission = await db.query.pastePermissions.findFirst({
            where: and(
              eq(pastePermissions.pasteId, paste.id),
              eq(pastePermissions.userId, decoded.userId)
            ),
          });
          canEdit = permission?.canEdit || false;
          console.log('GET paste - Permission found:', !!permission, 'canEdit:', canEdit);
        }
      } catch (error) {
        // Invalid token, just return public view
        console.log('Token verification failed:', error);
      }
    }

    console.log('GET paste - Final result: isOwner=', isOwner, 'canEdit=', canEdit);

    res.json({
      paste: {
        shareId: paste.shareId,
        title: paste.title,
        content: paste.content,
        createdAt: paste.createdAt,
        canEdit,
        isOwner,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update paste content
router.patch('/:shareId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { shareId } = req.params;
    const { content, title } = z.object({
      content: z.string().min(1).max(500000).optional(),
      title: z.string().max(200).optional(),
    }).parse(req.body);

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

    // Check if user owns the paste or has edit permission
    const isOwner = paste.userId === req.userId;
    const permission = await db.query.pastePermissions.findFirst({
      where: and(
        eq(pastePermissions.pasteId, paste.id),
        eq(pastePermissions.userId, req.userId!)
      ),
    });

    if (!isOwner && (!permission || !permission.canEdit)) {
      return res.status(403).json({ error: 'Not authorized to edit this paste' });
    }

    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (title !== undefined) updateData.title = title;

    if (Object.keys(updateData).length > 0) {
      await db.update(pastes).set(updateData).where(eq(pastes.shareId, shareId));
    }

    res.json({ message: 'Paste updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get paste shared users
router.get('/:shareId/shared-users', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { shareId } = req.params;

    const paste = await db.query.pastes.findFirst({
      where: eq(pastes.shareId, shareId),
    });

    if (!paste) {
      return res.status(404).json({ error: 'Paste not found' });
    }

    // Only owner can see who paste is shared with
    if (paste.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const sharedUsers = await db
      .select({
        userId: users.id,
        username: users.username,
        canEdit: pastePermissions.canEdit,
      })
      .from(pastePermissions)
      .innerJoin(users, eq(pastePermissions.userId, users.id))
      .where(eq(pastePermissions.pasteId, paste.id));

    res.json({ sharedUsers });
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
