import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { ProfileStatusService } from './services/profile-status.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { DPoPGuard } from '../../common/guards/dpop.guard';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProfileStatusDto } from './dto/profile-status.dto';

@ApiTags('Profiles')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly profileStatusService: ProfileStatusService,
  ) {}

  @Post()
  @UseGuards(DPoPGuard)
  @ApiOperation({ 
    summary: 'Crear nuevo perfil de usuario',
    description: 'Crea un nuevo perfil de usuario con validación estricta de datos'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Perfil creado exitosamente' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Datos de entrada inválidos' 
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'Email ya existe en el tenant' 
  })
  async create(@Body() createProfileDto: CreateProfileDto) {
    return this.profilesService.create(createProfileDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar perfiles con filtros y paginación',
    description: 'Obtiene lista paginada de perfiles con filtros opcionales'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Elementos por página (default: 20, max: 100)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por nombre o email' })
  @ApiQuery({ name: 'condominium_id', required: false, description: 'Filtrar por condominio' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de perfiles obtenida exitosamente' 
  })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('condominium_id') condominiumId?: string,
  ) {
    return this.profilesService.findAll(paginationDto, {
      status,
      search,
      condominiumId,
    });
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener perfil por ID',
    description: 'Obtiene un perfil específico con sus membresías activas'
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Perfil encontrado' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Perfil no encontrado' 
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(DPoPGuard)
  @ApiOperation({ 
    summary: 'Actualizar perfil',
    description: 'Actualiza datos de un perfil existente'
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Perfil actualizado exitosamente' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Perfil no encontrado' 
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.update(id, updateProfileDto);
  }

  @Delete(':id')
  @UseGuards(DPoPGuard)
  @ApiOperation({ 
    summary: 'Eliminar perfil (soft delete)',
    description: 'Marca un perfil como eliminado sin borrar los datos'
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Perfil eliminado exitosamente' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Perfil no encontrado' 
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.profilesService.remove(id);
  }

  @Post(':id/status')
  @UseGuards(DPoPGuard)
  @ApiOperation({ 
    summary: 'Cambiar estado del perfil',
    description: 'Cambia el estado de un perfil con auditoría completa'
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Estado cambiado exitosamente' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Transición de estado no válida' 
  })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: ProfileStatusDto,
  ) {
    return this.profileStatusService.changeStatus(id, statusDto);
  }

  @Get(':id/status-history')
  @ApiOperation({ 
    summary: 'Obtener historial de estados',
    description: 'Obtiene el historial completo de cambios de estado'
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Historial obtenido exitosamente' 
  })
  async getStatusHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.profileStatusService.getStatusHistory(id);
  }

  @Get(':id/memberships')
  @ApiOperation({ 
    summary: 'Obtener membresías del perfil',
    description: 'Obtiene todas las membresías activas del perfil'
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiQuery({ name: 'include_inactive', required: false, description: 'Incluir membresías inactivas' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Membresías obtenidas exitosamente' 
  })
  async getMemberships(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('include_inactive') includeInactive?: boolean,
  ) {
    return this.profilesService.getMemberships(id, includeInactive);
  }
}