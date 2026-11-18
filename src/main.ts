import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist : true ,
      forbidNonWhitelisted : true 
      })
  )
  app.useStaticAssets(join(process.cwd(), 'uploads', 'public'), {
  prefix: '/uploads/public',
});
  await app.listen(3000,'0.0.0.0', () => {
    console.log('Server Started on port 3000');
  });
}
bootstrap();
