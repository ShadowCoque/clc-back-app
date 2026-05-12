import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AreasModule } from './areas/areas.module';
import { ColaboradoresModule } from './colaboradores/colaboradores.module';
import { PreguntasModule } from './preguntas/preguntas.module';
import { EncuestasModule } from './encuestas/encuestas.module';
import { ReportesModule } from './reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    AreasModule,
    ColaboradoresModule,
    PreguntasModule,
    EncuestasModule,
    ReportesModule,
  ],
})
export class AppModule {}
