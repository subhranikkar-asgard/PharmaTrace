import { prisma } from '../../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';

export async function loginService(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password.');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password.');

  const token = jwt.sign(
    { userId: user.id, role: user.role, orgId: user.organizationId },
    config.jwtSecret,
    { expiresIn: '8h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.organizationId,
      orgName: user.organization.name,
    },
  };
}

export async function getMeService(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });
  if (!user) throw new AppError(404, 'UNIT_NOT_FOUND', 'User not found.');
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    orgId: user.organizationId,
    orgName: user.organization.name,
  };
}
