import {Body,Controller,Delete,Get,Param,ParseUUIDPipe,Patch,Post,Query,} from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { Register } from './dto/register.dto.js';
import { Login } from './dto/login.dto.js';
import { UpdateRoles } from './dto/update-roles.dto.js';
import { AuthResponse } from './dto/auth-response.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { GetUser } from './decorators/get-user.decorator.js';
import { UserRole } from './enums/user-role.enum.js';
import { User } from './entities/user.entity.js';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ---------- públicas ----------
  @Post('signup')
  @ApiOperation({ summary: 'Register a user', description: 'Creates a student user and returns a JWT' })
  @ApiCreatedResponse({ description: 'User was created', type: AuthResponse })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Email already registered' })
  create(@Body() registerDto: Register) {
    return this.userService.create(registerDto);
  }

  @Post('auth')
  @ApiOperation({ summary: 'Log in', description: 'Returns a new JWT for a registered user' })
  @ApiCreatedResponse({ description: 'Login successful', type: AuthResponse })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Email or password incorrect' })
  login(@Body() loginDto: Login) {
    return this.userService.login(loginDto);
  }

  // ---------- autenticado (cualquier rol) ----------
  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Get my profile', description: 'Returns the authenticated user' })
  @ApiOkResponse({ description: 'Current user', type: User })
  me(@GetUser() user: User) {
    return user;
  }

  @Post('logout')
  @Auth()
  @ApiOperation({ summary: 'Log out', description: 'Invalidates the current JWT by bumping tokenVersion' })
  @ApiOkResponse({ description: 'Session closed' })
  logout(@GetUser() user: User) {
    return this.userService.logout(user.id);
  }

  // ---------- solo admin ----------
  @Get()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'List users', description: 'Requires the admin role. Supports pagination with limit and skip' })
  @ApiOkResponse({ description: 'Users list', type: [User] })
  @ApiBadRequestResponse({ description: 'Invalid pagination params' })
  findAll(@Query() pagination: PaginationDto) {
    return this.userService.findAll(pagination);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Find a user', description: 'Requires the admin role' })
  @ApiParam({ name: 'id', description: 'User id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'User found', type: User })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id/roles')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user roles', description: 'Requires the admin role. Used to grant the tutor role before creating a tutor profile' })
  @ApiParam({ name: 'id', description: 'User id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Roles were updated', type: User })
  @ApiBadRequestResponse({ description: 'Invalid roles or cannot remove own admin role' })
  @ApiNotFoundResponse({ description: 'User not found' })
  updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoles: UpdateRoles,
    @GetUser() admin: User,
  ) {
    return this.userService.updateRoles(id, updateRoles, admin);
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate a user', description: 'Requires the admin role. Deactivates the account instead of deleting it' })
  @ApiParam({ name: 'id', description: 'User id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'User was deactivated' })
  @ApiBadRequestResponse({ description: 'Cannot deactivate yourself' })
  @ApiNotFoundResponse({ description: 'User not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() admin: User) {
    return this.userService.deactivate(id, admin);
  }
}
