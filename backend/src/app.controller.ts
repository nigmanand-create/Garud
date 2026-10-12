import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    description: 'API is running',
    schema: {
      example: { status: 'ok', service: 'garudhub-api' },
    },
  })
  health() {
    return { status: 'ok', service: 'garudhub-api' };
  }
}
