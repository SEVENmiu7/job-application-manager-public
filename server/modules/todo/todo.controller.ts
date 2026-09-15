import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';

import type { TodoSaveInput, TodoScope } from '@shared/types';
import { TodoService } from './todo.service';

@NeedLogin()
@Controller('api/todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get('summary')
  summary(@Req() req: Request) {
    return this.todoService.summary(req.userContext.userId);
  }

  @Get()
  list(
    @Req() req: Request,
    @Query('scope') scope?: TodoScope,
    @Query('search') search?: string,
  ) {
    return this.todoService.list(req.userContext.userId, scope, search);
  }

  @Post()
  create(@Req() req: Request, @Body() body: TodoSaveInput) {
    return this.todoService.create(req.userContext.userId, body);
  }

  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: TodoSaveInput,
  ) {
    return this.todoService.update(req.userContext.userId, id, body);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.todoService.remove(req.userContext.userId, id);
  }
}
