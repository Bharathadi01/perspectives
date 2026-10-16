import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post as HttpPost } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreatePostInput,
  CreatePostInputSchema,
  Post,
  ReorderPostsInput,
  ReorderPostsInputSchema,
  UpdatePostInput,
  UpdatePostInputSchema,
} from '@perspective/contracts';
import { AuthUser, CurrentUser } from '../common/decorators';
import { UuidPipe, ZodPipe } from '../common/zod.pipe';
import { PostsService } from './posts.service';

@ApiTags('Posts')
@Controller('v1/me/posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @HttpPost()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(CreatePostInputSchema)) body: CreatePostInput): Promise<Post> {
    return this.posts.create(user.id, body);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  reorder(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(ReorderPostsInputSchema)) body: ReorderPostsInput,
  ): Promise<Post[]> {
    return this.posts.reorder(user.id, body.postIds);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', UuidPipe) id: string,
    @Body(new ZodPipe(UpdatePostInputSchema)) body: UpdatePostInput,
  ): Promise<Post> {
    return this.posts.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<void> {
    await this.posts.remove(user.id, id);
  }
}
