import { Module } from '@nestjs/common';
import { PlaylistRepository } from './repositories/playlist.repository';

@Module({
  providers: [PlaylistRepository],
  exports: [PlaylistRepository],
})
export class PlaylistPersistenceModule {}
