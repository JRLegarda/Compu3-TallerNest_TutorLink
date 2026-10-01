import {Body,Controller,Delete,Get,Param,ParseUUIDPipe,Patch,Post,Query,} from '@nestjs/common';
import { UserService } from './user.service.js';
import { Register } from './dto/register.dto.js';
import { Login } from './dto/login.dto.js';
import { UpdateRoles } from './dto/update-roles.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { GetUser } from './decorators/get-user.decorator.js';
import { UserRole } from './enums/user-role.enum.js';
import { User } from './entities/user.entity.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ---------- públicas ----------
  @Post('signup')
  create(@Body() registerDto: Register) {
    return this.userService.create(registerDto);
  }

  @Post('auth')
  login(@Body() loginDto: Login) {
    return this.userService.login(loginDto);
  }

  // ---------- autenticado (cualquier rol) ----------
  @Get('me')
  @Auth()
  me(@GetUser() user: User) {
    return user;
  }

  // ---------- solo admin ----------
  @Get()
  @Auth(UserRole.ADMIN)
  findAll(@Query() pagination: PaginationDto) {
    return this.userService.findAll(pagination);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id/roles')
  @Auth(UserRole.ADMIN)
  updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoles: UpdateRoles,
  ) {
    return this.userService.updateRoles(id, updateRoles);
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() admin: User) {
    return this.userService.deactivate(id, admin);
  }
}
