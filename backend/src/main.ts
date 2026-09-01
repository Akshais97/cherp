import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import 'reflect-metadata'
import { AppModule } from './app.module'
import { ApiExceptionFilter } from './common/filters/api-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configuredOrigins = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : []
  const allowedOrigins = Array.from(
    new Set([
      ...configuredOrigins,
      'https://cherp-production.up.railway.app',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]),
  )

  app.setGlobalPrefix('api')
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      callback(new Error(`CORS blocked for unauthorized origin: ${origin}`), false)
    },
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new ApiExceptionFilter())

  const config = new DocumentBuilder()
    .setTitle('Agency Command Center ERP')
    .setDescription('Phase 1 MVP API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
