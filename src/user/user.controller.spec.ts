import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from './enums/user-role.enum.js';
import { User } from './entities/user.entity.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

describe('UserController', () => {
  let controller: UserController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    updateRoles: ReturnType<typeof vi.fn>;
    deactivate: ReturnType<typeof vi.fn>;
  };

  const user = { id: 'user-1', fullName: 'Ana Pérez', roles: [UserRole.STUDENT] } as User;
  const admin = { id: 'admin-1', roles: [UserRole.ADMIN] } as User;

  beforeEach(() => {
    service = {
      create: vi.fn().mockResolvedValue({ token: 't' }),
      login: vi.fn().mockResolvedValue({ token: 't' }),
      logout: vi.fn().mockResolvedValue({ message: 'Session closed' }),
      findAll: vi.fn().mockResolvedValue([user]),
      findOne: vi.fn().mockResolvedValue(user),
      updateRoles: vi.fn().mockResolvedValue(user),
      deactivate: vi.fn().mockResolvedValue({ message: 'ok' }),
    };
    controller = new UserController(service as unknown as UserService);
  });

  it('delegates signup and login', async () => {
    const register = { email: 'ana@example.com', password: 'Secreta123', fullName: 'Ana' };
    const login = { email: 'ana@example.com', password: 'Secreta123' };

    await controller.create(register);
    await controller.login(login);

    expect(service.create).toHaveBeenCalledWith(register);
    expect(service.login).toHaveBeenCalledWith(login);
  });

  it('returns the session user and closes it', async () => {
    expect(controller.me(user)).toBe(user);
    await controller.logout(user);
    expect(service.logout).toHaveBeenCalledWith('user-1');
  });

  it('delegates admin queries', async () => {
    const pagination = { limit: 10, skip: 0 };
    const roles = { roles: [UserRole.TUTOR] };

    await controller.findAll(pagination);
    await controller.findOne('user-1');
    await controller.updateRoles('user-1', roles, admin);
    await controller.remove('user-1', admin);

    expect(service.findAll).toHaveBeenCalledWith(pagination);
    expect(service.findOne).toHaveBeenCalledWith('user-1');
    expect(service.updateRoles).toHaveBeenCalledWith('user-1', roles, admin);
    expect(service.deactivate).toHaveBeenCalledWith('user-1', admin);
  });
});
