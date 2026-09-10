import { Controller, Delete, Get, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';

import { DataPrivacyService } from './data-privacy.service';
import type {
  DeleteMyDataResponse,
  UserDataExport,
} from '@shared/api.interface';

@Controller('api/data-privacy')
export class DataPrivacyController {
  constructor(private readonly dataPrivacyService: DataPrivacyService) {}

  @NeedLogin()
  @Get('export')
  async exportMyData(@Req() req: Request): Promise<UserDataExport> {
    const userId: string = req.userContext.userId;
    return this.dataPrivacyService.exportMyData(userId);
  }

  @NeedLogin()
  @Delete('all')
  async deleteMyData(@Req() req: Request): Promise<DeleteMyDataResponse> {
    const userId: string = req.userContext.userId;
    return this.dataPrivacyService.deleteMyData(userId);
  }
}
