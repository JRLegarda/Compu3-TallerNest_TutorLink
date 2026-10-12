import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from './enums/user-role.enum.js';
import { User } from './entities/user.entity.js';
import { UserService } from './user.service.js';

describe('UserService', () => {
  let service: UserService;
  let userRepo: any;
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  const password = 'Secreta123';
  const activeUser = {
    id: 'user-1',
    email: 'ana@example.com',
    password: bcrypt.hashSync(password, 10),
    fullName: 'Ana Pérez',
    isActive: true,
    roles: [UserRole.STUDENT],
    tokenVersion: 0,
  };

  beforeEach(async () => {
    userRepo = {
      create: vi.fn((data) => ({ ...data })),
      save: vi.fn(async (user) => {
        user.id = user.id ?? 'user-1';
        return user;
      }),
      findOne: vi.fn(),
      findOneBy: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
      increment: vi.fn(),
    };
    jwtService = { sign: vi.fn(() => 'signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(UserService);
  });

  it('registers a student and returns a token without the password', async () => {
    const result = await service.create({
      email: 'Ana@Example.com',
      password,
      fullName: 'Ana Pérez',
    });

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        roles: [UserRole.STUDENT],
        tokenVersion: 0,
      }),
    );
    expect(result).toMatchObject({
      id: 'user-1',
      fullName: 'Ana Pérez',
      roles: [UserRole.STUDENT],
      token: 'signed-token',
    });
    expect(result).not.toHaveProperty('password');
    expect(jwtService.sign).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'Ana@Example.com',
      tokenVersion: 0,
    });
  });

  it('maps a duplicated email to ConflictException', async () => {
    userRepo.save.mockRejectedValue({ code: '23505', detail: 'email duplicated' });

    await expect(
      service.create({ email: 'ana@example.com', password, fullName: 'Ana' }),
    ).rejects.toThrow(ConflictException);
  });

  it('maps unexpected errors to InternalServerErrorException', async () => {
    userRepo.save.mockRejectedValue(new Error('db down'));

    await expect(
      service.create({ email: 'ana@example.com', password, fullName: 'Ana' }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('logs in an active user and puts the session version in the token', async () => {
    userRepo.findOne.mockResolvedValue(activeUser);

    const result = await service.login({
      email: ' Ana@Example.com ',
      password,
    });

    expect(userRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'ana@example.com' } }),
    );
    expect(result.token).toBe('signed-token');
    expect(result.roles).toEqual([UserRole.STUDENT]);
    expect(result).not.toHaveProperty('password');
  });

  it('rejects a wrong password or a missing user', async () => {
    userRepo.findOne.mockResolvedValue(activeUser);
    await expect(
      service.login({ email: 'ana@example.com', password: 'OtraClave1' }),
    ).rejects.toThrow(UnauthorizedException);

    userRepo.findOne.mockResolvedValue(null);
    await expect(
      service.login({ email: 'ana@example.com', password }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive user', async () => {
    userRepo.findOne.mockResolvedValue({ ...activeUser, isActive: false });

    await expect(
      service.login({ email: 'ana@example.com', password }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('closes the session by increasing tokenVersion', async () => {
    userRepo.findOneBy.mockResolvedValue(activeUser);

    await expect(service.logout('user-1')).resolves.toEqual({
      message: 'Session closed',
    });
    expect(userRepo.increment).toHaveBeenCalledWith({ id: 'user-1' }, 'tokenVersion', 1);
  });

  it('lists users with pagination', async () => {
    userRepo.find.mockResolvedValue([activeUser]);

    const users = await service.findAll({ limit: 5, skip: 2 });

    expect(userRepo.find).toHaveBeenCalledWith({
      take: 5,
      skip: 2,
      order: { fullName: 'ASC' },
    });
    expect(users).toHaveLength(1);
  });

  it('finds one user or throws when missing', async () => {
    userRepo.findOneBy.mockResolvedValueOnce(activeUser);
    await expect(service.findOne('user-1')).resolves.toMatchObject({ id: 'user-1' });

    userRepo.findOneBy.mockResolvedValueOnce(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('lets an admin assign the tutor role', async () => {
    const admin = { ...activeUser, id: 'admin-1', roles: [UserRole.ADMIN] } as User;
    const tutor = { ...activeUser, roles: [UserRole.TUTOR] };
    userRepo.findOneBy.mockResolvedValueOnce(activeUser).mockResolvedValueOnce(tutor);

    const result = await service.updateRoles('user-1', { roles: [UserRole.TUTOR] }, admin);

    expect(userRepo.update).toHaveBeenCalledWith('user-1', { roles: [UserRole.TUTOR] });
    expect(result.roles).toEqual([UserRole.TUTOR]);
  });

  it('does not let an admin remove their own admin role', async () => {
    const admin = { ...activeUser, id: 'admin-1', roles: [UserRole.ADMIN] } as User;

    await expect(
      service.updateRoles('admin-1', { roles: [UserRole.STUDENT] }, admin),
    ).rejects.toThrow(BadRequestException);
    expect(userRepo.update).not.toHaveBeenCalled();
  });

  it('does not let a user deactivate themselves', async () => {
    await expect(service.deactivate('user-1', activeUser as User)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deactivates another user and invalidates their tokens', async () => {
    userRepo.findOneBy.mockResolvedValue(activeUser);
    const admin = { ...activeUser, id: 'admin-1', roles: [UserRole.ADMIN] } as User;

    await expect(service.deactivate('user-1', admin)).resolves.toEqual({
      message: 'User ana@example.com deactivated',
    });
    expect(userRepo.update).toHaveBeenCalledWith('user-1', { isActive: false });
    expect(userRepo.increment).toHaveBeenCalledWith({ id: 'user-1' }, 'tokenVersion', 1);
  });

  it('does not close a session for a user that does not exist', async () => {
    userRepo.findOneBy.mockResolvedValue(null);

    await expect(service.logout('missing')).rejects.toThrow(NotFoundException);
    expect(userRepo.increment).not.toHaveBeenCalled();
  });

  it('lets an admin keep the admin role while adding tutor', async () => {
    const admin = { ...activeUser, id: 'admin-1', roles: [UserRole.ADMIN] } as User;
    const updated = { ...admin, roles: [UserRole.ADMIN, UserRole.TUTOR] };
    userRepo.findOneBy.mockResolvedValueOnce(admin).mockResolvedValueOnce(updated);

    const result = await service.updateRoles(
      'admin-1',
      { roles: [UserRole.ADMIN, UserRole.TUTOR] },
      admin,
    );

    expect(userRepo.update).toHaveBeenCalledWith('admin-1', {
      roles: [UserRole.ADMIN, UserRole.TUTOR],
    });
    expect(result.roles).toContain(UserRole.ADMIN);
  });
});

describe('User email hook', () => {
  it('lowercases and trims the email', () => {
    const user = new User();
    user.email = '  Ana@Example.com  ';
    user.checkEmailBeforeChanges();
    expect(user.email).toBe('ana@example.com');
  });
});
