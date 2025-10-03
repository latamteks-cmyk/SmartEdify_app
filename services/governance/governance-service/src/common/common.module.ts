import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'governance-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [],
  exports: [],
})
export class CommonModule {}