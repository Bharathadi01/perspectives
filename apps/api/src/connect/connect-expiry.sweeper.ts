import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { ConnectService } from './connect.service';

/**
 * Closes quiet connections nobody is opening (opening the app already closes overdue ones lazily).
 * A simple in-process timer until background jobs exist (pg-boss, see docs/ARCHITECTURE.md); with
 * several API servers each would sweep, which is harmless. EXPIRY_SWEEP_MINUTES=0 turns it off.
 */
@Injectable()
export class ConnectExpirySweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectExpirySweeper.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly connect: ConnectService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    const minutes = this.config.EXPIRY_SWEEP_MINUTES;
    if (minutes <= 0) return;
    this.timer = setInterval(() => void this.sweep(), minutes * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async sweep(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const closed = await this.connect.sweepQuietConnections();
      if (closed > 0) this.logger.log(`Closed ${closed} quiet connection(s)`);
    } catch (err) {
      this.logger.error('Quiet-connection sweep failed', err instanceof Error ? err.stack : String(err));
    } finally {
      this.running = false;
    }
  }
}
