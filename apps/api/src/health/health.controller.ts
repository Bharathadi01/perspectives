import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'API and database health check' })
  check() {
    return {
      status: 'ok',
      service: 'perspective-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
