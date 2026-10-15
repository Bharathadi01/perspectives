import { Module } from '@nestjs/common';
import { ConnectModule } from '../connect/connect.module';
import { PostsController } from '../posts/posts.controller';
import { PostsService } from '../posts/posts.service';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

/** Profiles and their posts. Posts live here because they decide whether a profile is live. */
@Module({
  imports: [ConnectModule],
  controllers: [ProfilesController, PostsController],
  providers: [ProfilesService, PostsService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
