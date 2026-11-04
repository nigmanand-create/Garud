import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UPLOAD_STORAGE, uploadStorageFactory } from './upload-storage';

@Global()
@Module({
  providers: [
    {
      provide: UPLOAD_STORAGE,
      useFactory: uploadStorageFactory,
      inject: [ConfigService],
    },
  ],
  exports: [UPLOAD_STORAGE],
})
export class UploadStorageModule {}
