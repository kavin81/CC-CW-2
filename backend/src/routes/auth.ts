import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, ne } from 'drizzle-orm';
import { generateToken, authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { z } from 'zod';

const router = Router();

const signinSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const signupSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6).max(100),
});

// Sign up
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { username, password } = signupSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with default role 'user'
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        role: 'user',
      })
      .returning();

    const token = generateToken(newUser.id, newUser.role);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: newUser.id, username: newUser.username, role: newUser.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.log(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign in
router.post('/signin', authLimiter, async (req, res) => {
  try {
    const { username, password } = signinSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Signed in successfully',
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.log(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.userId!),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, req.userId!));

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.userId!),
      columns: { id: true, username: true, createdAt: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: List all users
router.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      columns: { id: true, username: true, role: true, createdAt: true },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    res.json({ users: allUsers });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Update user role
router.patch('/users/:userId/role', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { role } = z.object({ role: z.enum(['admin', 'user']) }).parse(req.body);

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId));

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
